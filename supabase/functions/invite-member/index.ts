import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  displayName: string;
  organizationId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

    // Create Supabase client with user's token for auth verification
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("JWT verification failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub as string;
    console.log("Authenticated caller:", callerId);

    // Parse request body
    const body: InviteRequest = await req.json();
    const { email, displayName, organizationId } = body;

    // Validate required fields
    if (!email || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and organizationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedDisplayName = displayName?.trim() || normalizedEmail.split("@")[0];

    console.log(`Invite request: ${normalizedEmail} to org ${organizationId}`);

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is owner of the organization
    const { data: org, error: orgError } = await adminClient
      .from("organizations")
      .select("id, name, owner_id")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (org.owner_id !== callerId) {
      console.error("Caller is not the organization owner");
      return new Response(
        JSON.stringify({ error: "Only organization owners can invite members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verified: ${callerId} owns org "${org.name}"`);

    // Check if email is already a member of this organization
    const { data: existingMember, error: memberCheckError } = await adminClient
      .from("organization_members")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (memberCheckError) {
      console.error("Error checking existing member:", memberCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing membership" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingMember) {
      const statusMessage = existingMember.status === "active" 
        ? "This email is already an active member of your organization"
        : "This email has already been invited and is pending activation";
      
      console.log(`Member already exists with status: ${existingMember.status}`);
      return new Response(
        JSON.stringify({ error: statusMessage }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create pending organization_members record
    const { data: newMember, error: insertError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        email: normalizedEmail,
        display_name: trimmedDisplayName,
        role: "member",
        status: "pending",
        user_id: null,
        invited_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating member record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create member invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Created pending member record: ${newMember.id}`);

    // Send invitation email using Supabase Admin Auth
    const redirectTo = `${siteUrl}/auth`;
    console.log(`Sending invite to ${normalizedEmail}, redirect: ${redirectTo}`);

    const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo,
        data: {
          full_name: trimmedDisplayName,
          invited_to_organization: organizationId,
          organization_name: org.name,
        },
      }
    );

    if (authError) {
      console.error("Error sending invite email:", authError);

      // Rollback: delete the pending member record
      const { error: deleteError } = await adminClient
        .from("organization_members")
        .delete()
        .eq("id", newMember.id);

      if (deleteError) {
        console.error("Failed to rollback member record:", deleteError);
      } else {
        console.log("Rolled back member record after invite failure");
      }

      return new Response(
        JSON.stringify({ error: `Failed to send invitation email: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Invitation sent successfully to ${normalizedEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${normalizedEmail}`,
        memberId: newMember.id,
      }),
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
