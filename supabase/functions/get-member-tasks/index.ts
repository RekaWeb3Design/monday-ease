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
    const combined = decodeBase64(encryptedData);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const keyData = new TextEncoder().encode(encryptionKey.padEnd(32, '0').slice(0, 32));
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
    console.error("[get-member-tasks] Decryption error:", error);
    return encryptedData;
  }
}

interface MondayColumnValue {
  id: string;
  title: string;
  type: string;
  text: string | null;
  value: any;
}

interface MondayTask {
  id: string;
  name: string;
  board_id: string;
  board_name: string;
  column_values: MondayColumnValue[];
  created_at: string;
  updated_at: string;
}

interface BoardAccessConfig {
  board_config_id: string;
  filter_value: string;
  monday_board_id: string;
  board_name: string;
  filter_column_id: string | null;
  visible_columns: string[];
  organization_id: string;
}

/**
 * Extract comparable text values from a Monday.com column value.
 * Returns an array of possible text representations for matching.
 *
 * Person columns can come in multiple formats:
 * 1. text field: "Réka Víg" or "Réka Víg, John Doe"
 * 2. value JSON: {"personsAndTeams": [{"id": 12345, "kind": "person"}]}
 * 3. Sometimes value is a plain string
 */
function extractColumnTexts(columnValue: any): string[] {
  const texts: string[] = [];

  // 1. Always include the text field if present
  if (columnValue?.text && typeof columnValue.text === "string" && columnValue.text.trim()) {
    texts.push(columnValue.text.trim());
  }

  // 2. Include label (for status columns etc.)
  if (columnValue?.label && typeof columnValue.label === "string" && columnValue.label.trim()) {
    texts.push(columnValue.label.trim());
  }

  // 3. Parse the value field for structured data
  if (columnValue?.value) {
    try {
      const parsed = typeof columnValue.value === "string"
        ? JSON.parse(columnValue.value)
        : columnValue.value;

      // Person/People column: {"personsAndTeams": [...]}
      if (parsed?.personsAndTeams && Array.isArray(parsed.personsAndTeams)) {
        // Extract person IDs as strings for ID-based matching
        for (const entry of parsed.personsAndTeams) {
          if (entry.id !== undefined) {
            texts.push(String(entry.id));
          }
        }
      }

      // Some columns store value as {"value": "..."} or plain string
      if (typeof parsed === "string" && parsed.trim()) {
        texts.push(parsed.trim());
      }
      if (parsed?.value && typeof parsed.value === "string" && parsed.value.trim()) {
        texts.push(parsed.value.trim());
      }
    } catch (_e) {
      // value is not valid JSON, treat as plain string
      if (typeof columnValue.value === "string" && columnValue.value.trim()) {
        texts.push(columnValue.value.trim());
      }
    }
  }

  return texts;
}

/**
 * Check if filterValue matches any of the extracted column texts.
 * Uses case-insensitive, trimmed, partial matching.
 * Also splits comma-separated text values to match individual entries.
 */
function matchesFilter(filterValue: string, columnTexts: string[]): boolean {
  const normalizedFilter = filterValue.trim().toLowerCase();

  for (const text of columnTexts) {
    const normalizedText = text.trim().toLowerCase();

    // Direct match
    if (normalizedText === normalizedFilter) return true;

    // Partial match (filter_value found within the column text)
    if (normalizedText.includes(normalizedFilter)) return true;

    // Column text found within filter value (reverse partial)
    if (normalizedFilter.includes(normalizedText) && normalizedText.length > 0) return true;

    // Comma-separated values: "Réka Víg, John Doe" -> check each part
    if (text.includes(",")) {
      const parts = text.split(",").map((p) => p.trim().toLowerCase());
      if (parts.some((part) => part === normalizedFilter || part.includes(normalizedFilter))) {
        return true;
      }
    }
  }

  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Step 1: Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[get-member-tasks] Step 1: Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[get-member-tasks] Step 1: JWT verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerUserId = user.id;
    console.log("[get-member-tasks] Step 1: User verified:", callerUserId, "email:", user.email);

    // ── Step 2: Resolve target member ─────────────────────────────
    const url = new URL(req.url);
    const targetMemberId = url.searchParams.get("member_id");

    let targetMembershipId: string;
    let organizationId: string;
    let ownerId: string;

    if (targetMemberId) {
      // Owner viewing a specific member's tasks
      console.log("[get-member-tasks] Step 2: Owner viewing member tasks for member_id:", targetMemberId);

      const { data: callerMembership, error: callerMembershipError } = await supabase
        .from("organization_members")
        .select("role, organization_id")
        .eq("user_id", callerUserId)
        .eq("status", "active")
        .single();

      if (callerMembershipError || !callerMembership) {
        console.error("[get-member-tasks] Step 2: Caller has no active membership:", callerMembershipError);
        return new Response(
          JSON.stringify({ error: "Not authorized to view member tasks" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (callerMembership.role !== "owner") {
        console.error("[get-member-tasks] Step 2: Caller is not owner, role:", callerMembership.role);
        return new Response(
          JSON.stringify({ error: "Only owners can view other member's tasks" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: targetMember, error: targetMemberError } = await supabase
        .from("organization_members")
        .select("id, organization_id")
        .eq("id", targetMemberId)
        .eq("status", "active")
        .single();

      if (targetMemberError || !targetMember) {
        console.error("[get-member-tasks] Step 2: Target member not found:", targetMemberError);
        return new Response(
          JSON.stringify({ error: "Member not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetMember.organization_id !== callerMembership.organization_id) {
        console.error("[get-member-tasks] Step 2: Target member org mismatch");
        return new Response(
          JSON.stringify({ error: "Member not in your organization" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetMembershipId = targetMember.id;
      organizationId = targetMember.organization_id;

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) {
        console.error("[get-member-tasks] Step 2: Organization not found:", orgError);
        return new Response(
          JSON.stringify({ error: "Organization not found" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      ownerId = org.owner_id;
      console.log("[get-member-tasks] Step 2: Resolved owner:", ownerId, "org:", organizationId, "target member:", targetMembershipId);
    } else {
      // Regular member fetching own tasks
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("id, organization_id, role")
        .eq("user_id", callerUserId)
        .eq("status", "active")
        .single();

      if (membershipError || !membership) {
        console.error("[get-member-tasks] Step 2: No active membership found:", membershipError);
        return new Response(
          JSON.stringify({ tasks: [], message: "No active organization membership found" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[get-member-tasks] Step 2: Member found:", JSON.stringify(membership));

      targetMembershipId = membership.id;
      organizationId = membership.organization_id;

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) {
        console.error("[get-member-tasks] Step 2: Organization not found:", orgError);
        return new Response(
          JSON.stringify({ error: "Organization not found" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      ownerId = org.owner_id;
      console.log("[get-member-tasks] Step 2: Resolved owner:", ownerId, "org:", organizationId);
    }

    // ── Step 3: Get board access records ──────────────────────────
    const { data: boardAccess, error: accessError } = await supabase
      .from("member_board_access")
      .select(`
        board_config_id,
        filter_value,
        board_configs (
          monday_board_id,
          board_name,
          filter_column_id,
          visible_columns,
          organization_id,
          is_active
        )
      `)
      .eq("member_id", targetMembershipId);

    if (accessError) {
      console.error("[get-member-tasks] Step 3: Error fetching board access:", accessError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch board access" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-member-tasks] Step 3: Board access records:", JSON.stringify(boardAccess));

    if (!boardAccess || boardAccess.length === 0) {
      console.log("[get-member-tasks] Step 3: No board access configured for member");
      return new Response(
        JSON.stringify({ tasks: [], message: "No boards assigned to this member yet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 4: Filter active board configs ───────────────────────
    const activeAccess = boardAccess.filter(
      (access) => access.board_configs && (access.board_configs as any).is_active
    );

    console.log("[get-member-tasks] Step 4: Active board configs count:", activeAccess.length, "of", boardAccess.length, "total");

    if (activeAccess.length === 0) {
      console.log("[get-member-tasks] Step 4: No active board configurations");
      return new Response(
        JSON.stringify({ tasks: [], message: "No active boards assigned to this member" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 5: Get Monday.com token ──────────────────────────────
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: integration, error: integrationError } = await adminClient
      .from("user_integrations")
      .select("access_token")
      .eq("user_id", ownerId)
      .eq("integration_type", "monday")
      .eq("status", "connected")
      .single();

    if (integrationError || !integration) {
      console.error("[get-member-tasks] Step 5: Owner's Monday integration not found:", integrationError);
      return new Response(
        JSON.stringify({ tasks: [], message: "Monday.com integration not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    let mondayToken = integration.access_token;

    if (encryptionKey) {
      console.log("[get-member-tasks] Step 5: Decrypting token...");
      mondayToken = await decryptToken(integration.access_token, encryptionKey);
      console.log("[get-member-tasks] Step 5: Decrypted token length:", mondayToken?.length || 0);
    } else {
      console.log("[get-member-tasks] Step 5: No ENCRYPTION_KEY, using token as-is, length:", mondayToken?.length || 0);
    }

    // ── Step 6: Build access configs ──────────────────────────────
    const accessConfigs: BoardAccessConfig[] = activeAccess.map((access) => {
      const config = access.board_configs as any;
      return {
        board_config_id: access.board_config_id,
        filter_value: access.filter_value,
        monday_board_id: config.monday_board_id,
        board_name: config.board_name,
        filter_column_id: config.filter_column_id,
        visible_columns: config.visible_columns || [],
        organization_id: config.organization_id,
      };
    });

    console.log("[get-member-tasks] Step 6: Access configs:", JSON.stringify(accessConfigs, null, 2));

    // ── Step 7: Fetch & filter Monday items ───────────────────────
    const allTasks: MondayTask[] = [];

    for (const config of accessConfigs) {
      try {
        console.log(`[get-member-tasks] Step 7: Fetching board ${config.monday_board_id} (${config.board_name}), filter_column: "${config.filter_column_id}", filter_value: "${config.filter_value}"`);

        const query = `
          query {
            boards(ids: [${config.monday_board_id}]) {
              id
              name
              items_page(limit: 500) {
                items {
                  id
                  name
                  created_at
                  updated_at
                  column_values {
                    id
                    text
                    type
                    value
                    ... on StatusValue {
                      label
                    }
                  }
                }
              }
              columns {
                id
                title
                type
              }
            }
          }
        `;

        const mondayResponse = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: mondayToken.startsWith("Bearer ") ? mondayToken : `Bearer ${mondayToken}`,
          },
          body: JSON.stringify({ query }),
        });

        if (!mondayResponse.ok) {
          const errorText = await mondayResponse.text();
          console.error(`[get-member-tasks] Step 7: Monday API HTTP error for board ${config.monday_board_id}: ${mondayResponse.status}`, errorText);
          continue;
        }

        const mondayData = await mondayResponse.json();

        if (mondayData.errors) {
          console.error(`[get-member-tasks] Step 7: Monday API errors for board ${config.monday_board_id}:`, JSON.stringify(mondayData.errors));
          continue;
        }

        const board = mondayData.data?.boards?.[0];
        if (!board || !board.items_page?.items) {
          console.log(`[get-member-tasks] Step 7: No items found in board ${config.monday_board_id}`);
          continue;
        }

        const items = board.items_page.items;
        console.log(`[get-member-tasks] Step 7: Board ${config.monday_board_id} has ${items.length} total items`);

        // Build column id → title/type map
        const columnMap: Record<string, { title: string; type: string }> = {};
        for (const col of board.columns || []) {
          columnMap[col.id] = { title: col.title, type: col.type };
        }

        console.log(`[get-member-tasks] Step 7: Column map for board:`, JSON.stringify(columnMap));

        let matchedCount = 0;
        let skippedCount = 0;

        for (const item of items) {
          // ── Filtering ──
          if (config.filter_column_id && config.filter_value) {
            const filterColumn = item.column_values.find(
              (cv: any) => cv.id === config.filter_column_id
            );

            if (!filterColumn) {
              console.log(`[get-member-tasks] Step 7: Item "${item.name}" (${item.id}): filter column "${config.filter_column_id}" NOT FOUND in column_values`);
              skippedCount++;
              continue;
            }

            // Extract all possible text representations from the column
            const columnTexts = extractColumnTexts(filterColumn);

            console.log(`[get-member-tasks] Step 7: Item "${item.name}" (${item.id}): filter column "${config.filter_column_id}" -> text: "${filterColumn.text}", value: ${JSON.stringify(filterColumn.value)}, extractedTexts: ${JSON.stringify(columnTexts)}`);

            const isMatch = matchesFilter(config.filter_value, columnTexts);

            if (!isMatch) {
              console.log(`[get-member-tasks] Step 7:   -> SKIPPED (filter_value "${config.filter_value}" not matched in ${JSON.stringify(columnTexts)})`);
              skippedCount++;
              continue;
            }

            console.log(`[get-member-tasks] Step 7:   -> MATCHED!`);
            matchedCount++;
          }

          // ── Build column values for response ──
          const columnValues: MondayColumnValue[] = item.column_values
            .filter((cv: any) => {
              if (!config.visible_columns || config.visible_columns.length === 0) {
                return true;
              }
              return config.visible_columns.includes(cv.id);
            })
            .map((cv: any) => {
              let parsedValue = null;
              if (cv.value) {
                try {
                  parsedValue = typeof cv.value === "string" ? JSON.parse(cv.value) : cv.value;
                } catch (_e) {
                  parsedValue = cv.value;
                }
              }
              return {
                id: cv.id,
                title: columnMap[cv.id]?.title || cv.id,
                type: cv.type || columnMap[cv.id]?.type || "text",
                text: cv.text || cv.label || null,
                value: parsedValue,
              };
            });

          allTasks.push({
            id: item.id,
            name: item.name,
            board_id: board.id,
            board_name: config.board_name || board.name,
            column_values: columnValues,
            created_at: item.created_at,
            updated_at: item.updated_at,
          });
        }

        console.log(`[get-member-tasks] Step 7: Board ${config.monday_board_id} result: ${matchedCount} matched, ${skippedCount} skipped, ${allTasks.length} total tasks so far`);
      } catch (boardError) {
        console.error(`[get-member-tasks] Step 7: Error processing board ${config.monday_board_id}:`, boardError);
        continue;
      }
    }

    // ── Step 8: Return results ────────────────────────────────────
    console.log(`[get-member-tasks] Step 8: Returning ${allTasks.length} total tasks`);

    return new Response(
      JSON.stringify({ tasks: allTasks }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[get-member-tasks] UNEXPECTED ERROR:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
