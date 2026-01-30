import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("JWT verification failed:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    console.log("Activating invited member:", { userId, userEmail });

    if (!userEmail) {
      console.error("No email in JWT claims");
      return new Response(
        JSON.stringify({ success: false, error: "No email found in user claims" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for privileged operations (bypass RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user metadata to find the organization they were invited to
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);

    if (userError || !userData?.user) {
      console.error("Error fetching user:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch user data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invitedOrgId = userData.user.user_metadata?.invited_to_organization;

    if (!invitedOrgId) {
      console.log("No invited_to_organization in user metadata");
      return new Response(
        JSON.stringify({ success: false, error: "User was not invited to any organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User was invited to org:", invitedOrgId);

    // Find the pending membership by email and organization
    const { data: pendingMember, error: findError } = await adminClient
      .from("organization_members")
      .select("id, organization_id, organizations(id, name)")
      .eq("organization_id", invitedOrgId)
      .eq("email", userEmail.toLowerCase())
      .eq("status", "pending")
      .maybeSingle();

    if (findError) {
      console.error("Error finding pending membership:", findError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to find pending membership" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingMember) {
      console.log("No pending membership found for:", { email: userEmail, orgId: invitedOrgId });
      return new Response(
        JSON.stringify({ success: false, error: "No pending membership found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found pending membership:", pendingMember.id);

    // Activate the membership
    const { error: updateMemberError } = await adminClient
      .from("organization_members")
      .update({
        user_id: userId,
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .eq("id", pendingMember.id);

    if (updateMemberError) {
      console.error("Error activating membership:", updateMemberError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to activate membership" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Membership activated successfully");

    // Update user profile to mark as member
    const { error: updateProfileError } = await adminClient
      .from("user_profiles")
      .update({
        user_type: "member",
        primary_organization_id: invitedOrgId,
      })
      .eq("id", userId);

    if (updateProfileError) {
      console.error("Error updating user profile:", updateProfileError);
      // Don't fail - membership was activated successfully
    } else {
      console.log("User profile updated");
    }

    // Get organization name for the response
    const orgName = (pendingMember.organizations as any)?.name || "Organization";

    console.log("Invited member activation complete:", { userId, orgId: invitedOrgId, orgName });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Membership activated successfully",
        organization_id: invitedOrgId,
        organization_name: orgName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
