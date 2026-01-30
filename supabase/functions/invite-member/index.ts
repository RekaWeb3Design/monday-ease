import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  displayName: string;
  organizationId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, displayName, organizationId } =
      (await req.json()) as InviteRequest;

    // Validate input
    if (!email || !displayName || !organizationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: email, displayName, organizationId",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = displayName.trim();

    console.log(`Inviting ${normalizedEmail} to organization ${organizationId}`);

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if member already exists in this organization
    const { data: existingMember } = await supabaseAdmin
      .from("organization_members")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("email", normalizedEmail)
      .single();

    if (existingMember) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This email is already a member of the organization",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invite user via Supabase Auth Admin API
    // This creates the user in auth.users and triggers the invite email
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: "https://ai-sprint.mondayease.com/auth",
        data: {
          full_name: trimmedName,
          invited_to_organization: organizationId,
        },
      });

    if (inviteError) {
      console.error("Auth invite error:", inviteError);
      
      // Check if user already exists in auth
      if (inviteError.message?.includes("already been registered")) {
        // User exists in auth but not in this org - just add them to org
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const user = existingUser?.users?.find((u) => u.email === normalizedEmail);
        
        if (user) {
          // Insert member record
          const { data: memberData, error: memberError } = await supabaseAdmin
            .from("organization_members")
            .insert({
              organization_id: organizationId,
              user_id: user.id,
              email: normalizedEmail,
              display_name: trimmedName,
              role: "member",
              status: "active", // Already has account, so active
              invited_at: new Date().toISOString(),
              joined_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (memberError) {
            console.error("Member insert error:", memberError);
            return new Response(
              JSON.stringify({ success: false, error: memberError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          console.log(`Added existing user ${normalizedEmail} to organization`);
          return new Response(
            JSON.stringify({
              success: true,
              memberId: memberData.id,
              message: "User already has an account and was added to the organization",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auth invite sent to ${normalizedEmail}, user id: ${inviteData.user?.id}`);

    // Insert member record with pending status
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: inviteData.user?.id || null,
        email: normalizedEmail,
        display_name: trimmedName,
        role: "member",
        status: "pending",
        invited_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (memberError) {
      console.error("Member insert error:", memberError);
      return new Response(
        JSON.stringify({ success: false, error: memberError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Member record created: ${memberData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        memberId: memberData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
