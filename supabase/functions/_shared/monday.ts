import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

/**
 * Decrypt an AES-GCM encrypted token.
 * Format: base64(iv[12 bytes] + ciphertext)
 */
export async function decryptToken(encryptedData: string, encryptionKey: string): Promise<string> {
  try {
    const combined = decodeBase64(encryptedData);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const keyData = new TextEncoder().encode(encryptionKey.padEnd(32, "0").slice(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Token decryption error:", error);
    // If decryption fails, assume the token is stored in plaintext
    return encryptedData;
  }
}

/**
 * Retrieve and decrypt the Monday.com access token for a given user.
 */
export async function getDecryptedMondayToken(
  userId: string,
  adminClient: SupabaseClient
): Promise<string> {
  const { data: integration, error } = await adminClient
    .from("user_integrations")
    .select("access_token")
    .eq("user_id", userId)
    .eq("integration_type", "monday")
    .eq("status", "connected")
    .single();

  if (error || !integration) {
    throw new MondayIntegrationError("Monday.com integration not configured");
  }

  const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
  if (encryptionKey) {
    return decryptToken(integration.access_token, encryptionKey);
  }
  return integration.access_token;
}

/**
 * Make a GraphQL request to the Monday.com API.
 */
export async function callMondayAPI<T = unknown>(
  token: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables: variables || {} }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Monday API HTTP error:", response.status, errorText);
    throw new MondayAPIError(`Monday API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    console.error("Monday GraphQL errors:", data.errors);
    throw new MondayAPIError(data.errors[0]?.message || "Monday.com API error");
  }

  return data.data as T;
}

export class MondayIntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MondayIntegrationError";
  }
}

export class MondayAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MondayAPIError";
  }
}
