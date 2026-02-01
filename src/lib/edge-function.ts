import { supabase } from "@/integrations/supabase/client";

const SUPABASE_FUNCTIONS_URL = "https://yqjugovqhvxoxvrceqqp.supabase.co/functions/v1";

/**
 * Call a Supabase Edge Function with automatic auth token injection.
 * Reduces boilerplate across all hooks that call edge functions.
 */
export async function callEdgeFunction<T = any>(
  functionName: string,
  params?: Record<string, string>
): Promise<T> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Not authenticated");
  }

  let url = `${SUPABASE_FUNCTIONS_URL}/${functionName}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data as T;
}
