import { getAuthenticatedContext, AuthError } from "../_shared/auth.ts";
import { getDecryptedMondayToken, callMondayAPI, MondayIntegrationError, MondayAPIError } from "../_shared/monday.ts";
import { jsonResponse, corsPreflightResponse } from "../_shared/cors.ts";

interface MondayUser {
  id: string;
  name: string;
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    const { user, supabase, adminClient } = await getAuthenticatedContext(req);

    // Check if user is an organization owner
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role, organization_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      return jsonResponse({ error: "No active organization membership" }, 403);
    }

    if (membership.role !== "owner") {
      return jsonResponse({ error: "Only owners can access this endpoint" }, 403);
    }

    // Get and decrypt the Monday.com token
    const mondayToken = await getDecryptedMondayToken(user.id, adminClient);

    // Fetch users from Monday.com
    const data = await callMondayAPI<{ users: MondayUser[] }>(
      mondayToken,
      `query { users { id name email } }`
    );

    return jsonResponse({ users: data.users || [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    if (error instanceof MondayIntegrationError) {
      return jsonResponse({ error: error.message }, 400);
    }
    if (error instanceof MondayAPIError) {
      return jsonResponse({ error: "Failed to fetch Monday.com users" }, 502);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
