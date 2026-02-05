import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@2";

export interface AuthenticatedContext {
  user: User;
  supabase: SupabaseClient;
  adminClient: SupabaseClient;
}

/**
 * Validates the Authorization header, verifies the JWT, and returns
 * both a user-scoped and a service-role Supabase client.
 */
export async function getAuthenticatedContext(req: Request): Promise<AuthenticatedContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError("JWT verification failed");
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  return { user, supabase, adminClient };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
