import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodeBase64 } from "https://deno.land/std@0.220.1/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Decrypt access token using AES-GCM
async function decryptToken(encryptedData: string, encryptionKey: string): Promise<string> {
  try {
    // The encrypted data format: base64(iv + ciphertext)
    const combined = decodeBase64(encryptedData);
    
    // IV is first 12 bytes, rest is ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    // Import the key
    const keyData = new TextEncoder().encode(encryptionKey.padEnd(32, '0').slice(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    // If decryption fails, assume the token is not encrypted and return as-is
    return encryptedData;
  }
}

interface MondayUser {
  id: string;
  name: string;
  email: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("JWT verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("Authenticated user:", userId);

    // Check if user is an organization owner
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role, organization_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      console.error("No active membership found:", membershipError);
      return new Response(
        JSON.stringify({ error: "No active organization membership" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (membership.role !== "owner") {
      console.error("Only owners can fetch Monday users");
      return new Response(
        JSON.stringify({ error: "Only owners can access this endpoint" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the owner's Monday.com integration token
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: integration, error: integrationError } = await adminClient
      .from("user_integrations")
      .select("access_token")
      .eq("user_id", userId)
      .eq("integration_type", "monday")
      .eq("status", "connected")
      .single();

    if (integrationError || !integration) {
      console.error("Monday integration not found:", integrationError);
      return new Response(
        JSON.stringify({ error: "Monday.com integration not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the token if encryption key is available
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    let mondayToken = integration.access_token;
    
    if (encryptionKey) {
      console.log("Attempting to decrypt token...");
      mondayToken = await decryptToken(integration.access_token, encryptionKey);
      console.log("Decrypted token length:", mondayToken?.length || 0);
    } else {
      console.log("No ENCRYPTION_KEY, using token as-is, length:", mondayToken?.length || 0);
    }

    // Fetch users from Monday.com
    const query = `
      query {
        users {
          id
          name
          email
        }
      }
    `;

    // CRITICAL: Monday.com API requires "Bearer " prefix
    const mondayAuthHeader = mondayToken.startsWith("Bearer ") ? mondayToken : `Bearer ${mondayToken}`;

    const mondayResponse = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: mondayAuthHeader,
      },
      body: JSON.stringify({ query }),
    });

    if (!mondayResponse.ok) {
      const errorText = await mondayResponse.text();
      console.error("Monday API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch Monday.com users" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mondayData = await mondayResponse.json();

    if (mondayData.errors) {
      console.error("Monday GraphQL errors:", mondayData.errors);
      return new Response(
        JSON.stringify({ error: "Monday.com API error", details: mondayData.errors }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const users: MondayUser[] = mondayData.data?.users || [];
    console.log(`Found ${users.length} Monday.com users`);

    return new Response(
      JSON.stringify({ users }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
