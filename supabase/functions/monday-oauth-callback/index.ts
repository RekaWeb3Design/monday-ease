import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const MONDAY_CLIENT_ID = Deno.env.get("MONDAY_CLIENT_ID")!;
const MONDAY_CLIENT_SECRET = Deno.env.get("MONDAY_CLIENT_SECRET")!;
const APP_URL = Deno.env.get("APP_URL") || "https://ai-sprint.mondayease.com";

interface MondayTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface MondayMeResponse {
  me: {
    id: string;
    name: string;
    email: string;
    account: {
      id: string;
      name: string;
    };
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // user_id passed during OAuth initiation
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error from Monday.com:", error);
      return redirectToApp("oauth_denied");
    }

    if (!code || !state) {
      console.error("Missing code or state parameter");
      return redirectToApp("missing_parameters");
    }

    const userId = state;

    // Step 1: Exchange authorization code for access token
    const tokenResponse = await fetch("https://auth.monday.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: MONDAY_CLIENT_ID,
        client_secret: MONDAY_CLIENT_SECRET,
        code,
        redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/monday-oauth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      return redirectToApp("token_exchange_failed");
    }

    const tokenData: MondayTokenResponse = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Query Monday.com API for user and account info
    const meResponse = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "API-Version": "2024-10",
      },
      body: JSON.stringify({
        query: `{ me { id name email account { id name } } }`,
      }),
    });

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error("Monday.com /me query failed:", meResponse.status, errorText);
      return redirectToApp("monday_api_error");
    }

    const meData = await meResponse.json();

    if (meData.errors) {
      console.error("Monday.com GraphQL errors:", meData.errors);
      return redirectToApp("monday_api_error");
    }

    const { me } = meData.data as MondayMeResponse;
    const mondayAccountId = me.account.id;
    const accountName = me.account.name;
    const mondayUserId = me.id;

    // Step 3: Optionally encrypt the token
    let storedToken = accessToken;
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    if (encryptionKey) {
      storedToken = await encryptToken(accessToken, encryptionKey);
    }

    // Step 4: Upsert into user_integrations (multi-account aware)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await adminClient
      .from("user_integrations")
      .upsert(
        {
          user_id: userId,
          integration_type: "monday",
          monday_account_id: mondayAccountId,
          account_name: accountName,
          monday_user_id: mondayUserId,
          access_token: storedToken,
          status: "connected",
          scopes: tokenData.scope ? tokenData.scope.split(",") : null,
          connected_at: new Date().toISOString(),
          workspace_name: accountName,
        },
        {
          onConflict: "user_id,integration_type,monday_account_id",
        }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return redirectToApp("database_error");
    }

    console.log(
      `Successfully connected Monday.com account "${accountName}" (${mondayAccountId}) for user ${userId}`
    );

    return redirectToApp(null); // success
  } catch (err) {
    console.error("Unexpected error in OAuth callback:", err);
    return redirectToApp("unexpected_error");
  }
});

/**
 * Redirect back to the app's integrations page with success/error status.
 */
function redirectToApp(error: string | null): Response {
  const params = new URLSearchParams();
  if (error) {
    params.set("success", "false");
    params.set("error", error);
  } else {
    params.set("success", "true");
  }
  const redirectUrl = `${APP_URL}/integrations?${params.toString()}`;

  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: redirectUrl,
    },
  });
}

/**
 * Encrypt a token using AES-GCM.
 * Format: base64(iv[12 bytes] + ciphertext)
 */
async function encryptToken(token: string, encryptionKey: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyData = new TextEncoder().encode(encryptionKey.padEnd(32, "0").slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(token)
  );

  // Combine iv + ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Base64 encode - use Deno standard library
  const { encodeBase64 } = await import("https://deno.land/std@0.224.0/encoding/base64.ts");
  return encodeBase64(combined);
}
