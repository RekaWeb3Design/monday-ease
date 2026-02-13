import { getAuthenticatedContext, AuthError } from "../_shared/auth.ts";
import { getDecryptedMondayToken, callMondayAPI, MondayIntegrationError, MondayAPIError } from "../_shared/monday.ts";
import { jsonResponse, corsPreflightResponse } from "../_shared/cors.ts";

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
  monday_account_id?: string;
  account_name?: string;
}

interface BoardAccessConfig {
  board_config_id: string;
  filter_value: string;
  monday_board_id: string;
  board_name: string;
  filter_column_id: string | null;
  visible_columns: string[];
  organization_id: string;
  monday_account_id: string | null;
  workspace_name: string | null;
}

/**
 * Extract comparable text values from a Monday.com column value.
 * Person columns can come in multiple formats:
 * 1. text field: "Name" or "Name1, Name2"
 * 2. value JSON: {"personsAndTeams": [{"id": 12345, "kind": "person"}]}
 */
function extractColumnTexts(columnValue: any): string[] {
  const texts: string[] = [];

  if (columnValue?.text && typeof columnValue.text === "string" && columnValue.text.trim()) {
    texts.push(columnValue.text.trim());
  }

  if (columnValue?.label && typeof columnValue.label === "string" && columnValue.label.trim()) {
    texts.push(columnValue.label.trim());
  }

  if (columnValue?.value) {
    try {
      const parsed = typeof columnValue.value === "string"
        ? JSON.parse(columnValue.value)
        : columnValue.value;

      if (parsed?.personsAndTeams && Array.isArray(parsed.personsAndTeams)) {
        for (const entry of parsed.personsAndTeams) {
          if (entry.id !== undefined) {
            texts.push(String(entry.id));
          }
        }
      }

      if (typeof parsed === "string" && parsed.trim()) {
        texts.push(parsed.trim());
      }
      if (parsed?.value && typeof parsed.value === "string" && parsed.value.trim()) {
        texts.push(parsed.value.trim());
      }
    } catch (_e) {
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
 */
function matchesFilter(filterValue: string, columnTexts: string[]): boolean {
  const normalizedFilter = filterValue.trim().toLowerCase();

  for (const text of columnTexts) {
    const normalizedText = text.trim().toLowerCase();

    if (normalizedText === normalizedFilter) return true;
    if (normalizedText.includes(normalizedFilter)) return true;
    if (normalizedFilter.includes(normalizedText) && normalizedText.length > 0) return true;

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
    return corsPreflightResponse();
  }

  try {
    const { user, supabase, adminClient } = await getAuthenticatedContext(req);
    const callerUserId = user.id;

    // ── Resolve target member ─────────────────────────────
    const url = new URL(req.url);
    const targetMemberId = url.searchParams.get("member_id");

    let targetMembershipId: string;
    let organizationId: string;
    let ownerId: string;

    if (targetMemberId) {
      // Owner viewing a specific member's tasks
      const { data: callerMembership, error: callerMembershipError } = await supabase
        .from("organization_members")
        .select("role, organization_id")
        .eq("user_id", callerUserId)
        .eq("status", "active")
        .single();

      if (callerMembershipError || !callerMembership) {
        return jsonResponse({ error: "Not authorized to view member tasks" }, 403);
      }

      if (callerMembership.role !== "owner") {
        return jsonResponse({ error: "Only owners can view other member's tasks" }, 403);
      }

      const { data: targetMember, error: targetMemberError } = await supabase
        .from("organization_members")
        .select("id, organization_id")
        .eq("id", targetMemberId)
        .eq("status", "active")
        .single();

      if (targetMemberError || !targetMember) {
        return jsonResponse({ error: "Member not found" }, 404);
      }

      if (targetMember.organization_id !== callerMembership.organization_id) {
        return jsonResponse({ error: "Member not in your organization" }, 403);
      }

      targetMembershipId = targetMember.id;
      organizationId = targetMember.organization_id;

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) {
        return jsonResponse({ error: "Organization not found" }, 500);
      }

      ownerId = org.owner_id;
    } else {
      // Regular member fetching own tasks
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("id, organization_id, role")
        .eq("user_id", callerUserId)
        .eq("status", "active")
        .single();

      if (membershipError || !membership) {
        return jsonResponse({ tasks: [], message: "No active organization membership found" });
      }

      targetMembershipId = membership.id;
      organizationId = membership.organization_id;

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) {
        return jsonResponse({ error: "Organization not found" }, 500);
      }

      ownerId = org.owner_id;
    }

    // ── Get board access records ──────────────────────────
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
          is_active,
          monday_account_id,
          workspace_name
        )
      `)
      .eq("member_id", targetMembershipId);

    if (accessError) {
      return jsonResponse({ error: "Failed to fetch board access" }, 500);
    }

    if (!boardAccess || boardAccess.length === 0) {
      return jsonResponse({ tasks: [], message: "No boards assigned to this member yet" });
    }

    // ── Filter active board configs ───────────────────────
    const activeAccess = boardAccess.filter(
      (access) => access.board_configs && (access.board_configs as any).is_active
    );

    if (activeAccess.length === 0) {
      return jsonResponse({ tasks: [], message: "No active boards assigned to this member" });
    }

    // ── Build access configs ──────────────────────────────
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
        monday_account_id: config.monday_account_id || null,
        workspace_name: config.workspace_name || null,
      };
    });

    // ── Group boards by Monday account ──────────────────
    const boardsByAccount = new Map<string, BoardAccessConfig[]>();
    for (const config of accessConfigs) {
      const key = config.monday_account_id || "__default__";
      const existing = boardsByAccount.get(key) || [];
      existing.push(config);
      boardsByAccount.set(key, existing);
    }

    // ── Fetch & filter Monday items (per account) ───────
    const allTasks: MondayTask[] = [];

    for (const [accountKey, configs] of boardsByAccount) {
      // Get Monday.com token for this account
      const mondayAccountId = accountKey === "__default__" ? undefined : accountKey;
      let mondayToken: string;
      try {
        mondayToken = await getDecryptedMondayToken(ownerId, adminClient, mondayAccountId);
      } catch (tokenError) {
        console.error(`No token for account ${accountKey}, skipping ${configs.length} boards`);
        continue;
      }

      for (const config of configs) {
        try {
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

          const data = await callMondayAPI<{
            boards: Array<{
              id: string;
              name: string;
              items_page: { items: any[] };
              columns: Array<{ id: string; title: string; type: string }>;
            }>;
          }>(mondayToken, query);

          const board = data.boards?.[0];
          if (!board || !board.items_page?.items) continue;

          const items = board.items_page.items;

          // Build column id -> title/type map
          const columnMap: Record<string, { title: string; type: string }> = {};
          for (const col of board.columns || []) {
            columnMap[col.id] = { title: col.title, type: col.type };
          }

          for (const item of items) {
            // ── Filtering ──
            if (config.filter_column_id && config.filter_value) {
              const filterColumn = item.column_values.find(
                (cv: any) => cv.id === config.filter_column_id
              );

              if (!filterColumn) continue;

              const columnTexts = extractColumnTexts(filterColumn);
              if (!matchesFilter(config.filter_value, columnTexts)) continue;
            }

            // ── Build column values for response ──
            const columnValues: MondayColumnValue[] = item.column_values
              .filter((cv: any) => {
                if (!config.visible_columns || config.visible_columns.length === 0) return true;
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
              monday_account_id: config.monday_account_id || undefined,
              account_name: config.workspace_name || undefined,
            });
          }
        } catch (boardError) {
          console.error(`Error processing board ${config.monday_board_id}:`, boardError);
          continue;
        }
      }
    }

    return jsonResponse({ tasks: allTasks });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    if (error instanceof MondayIntegrationError) {
      return jsonResponse({ tasks: [], message: "Monday.com integration not configured" });
    }
    if (error instanceof MondayAPIError) {
      return jsonResponse({ error: "Monday.com API error" }, 502);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
