import { getAuthenticatedContext, AuthError } from "../_shared/auth.ts";
import { getDecryptedMondayToken, callMondayAPI, MondayIntegrationError, MondayAPIError } from "../_shared/monday.ts";
import { jsonResponse, corsPreflightResponse } from "../_shared/cors.ts";

interface ViewColumn {
  id: string;
  title: string;
  type: string;
  width?: number;
}

interface ViewSettings {
  show_item_name: boolean;
  row_height: string;
  enable_search: boolean;
  enable_filters: boolean;
  default_sort_column: string | null;
  default_sort_order: string;
}

const defaultSettings: ViewSettings = {
  show_item_name: true,
  row_height: "default",
  enable_search: true,
  enable_filters: true,
  default_sort_column: null,
  default_sort_order: "asc",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    const { user, supabase, adminClient } = await getAuthenticatedContext(req);

    // ── Parse query params ────────────────────────────────
    const url = new URL(req.url);
    const viewId = url.searchParams.get("view_id");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const search = url.searchParams.get("search") || "";
    const sortColumn = url.searchParams.get("sort");
    const sortOrder = url.searchParams.get("order") || "asc";

    if (!viewId) {
      return jsonResponse({ error: "view_id is required" }, 400);
    }

    // ── Fetch view config ─────────────────────────────────
    const { data: view, error: viewError } = await supabase
      .from("custom_board_views")
      .select("*")
      .eq("id", viewId)
      .single();

    if (viewError || !view) {
      return jsonResponse({ error: "View not found" }, 404);
    }

    // ── Verify user access ────────────────────────────────
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", view.organization_id)
      .eq("status", "active")
      .maybeSingle();

    const { data: org } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", view.organization_id)
      .single();

    const isOwner = org?.owner_id === user.id;
    const isMember = !!membership;

    if (!isOwner && !isMember) {
      return jsonResponse({ error: "Access denied" }, 403);
    }

    // ── Resolve Monday account for this board ─────────────
    const ownerId = org!.owner_id;

    // Look up the board_config to find which Monday account this board belongs to
    const { data: boardConfig } = await adminClient
      .from("board_configs")
      .select("monday_account_id")
      .eq("monday_board_id", view.monday_board_id)
      .eq("organization_id", view.organization_id)
      .limit(1);

    const mondayAccountId = boardConfig?.[0]?.monday_account_id || undefined;

    // ── Get owner's Monday token ──────────────────────────
    const mondayToken = await getDecryptedMondayToken(ownerId, adminClient, mondayAccountId);

    // ── Parse view configuration ──────────────────────────
    let selectedColumns: ViewColumn[] = [];
    if (typeof view.selected_columns === "string") {
      try {
        selectedColumns = JSON.parse(view.selected_columns);
      } catch {
        selectedColumns = [];
      }
    } else {
      selectedColumns = view.selected_columns || [];
    }

    let settings: ViewSettings = { ...defaultSettings };
    if (typeof view.settings === "string") {
      try {
        settings = { ...defaultSettings, ...JSON.parse(view.settings) };
      } catch {
        // keep defaults
      }
    } else if (view.settings) {
      settings = { ...defaultSettings, ...view.settings };
    }

    const columnIds = selectedColumns.map((c) => c.id);

    // ── Fetch data from Monday.com ────────────────────────
    const query = `
      query {
        boards(ids: [${view.monday_board_id}]) {
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
                  label_style {
                    color
                  }
                }
                ... on PeopleValue {
                  persons_and_teams {
                    id
                    kind
                  }
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

    const emptyResponse = {
      view: { name: view.name, icon: view.icon, settings, columns: selectedColumns },
      items: [],
      total_count: 0,
      page,
      limit,
    };

    let data;
    try {
      data = await callMondayAPI<{
        boards: Array<{
          id: string;
          name: string;
          items_page: { items: any[] };
          columns: Array<{ id: string; title: string; type: string }>;
        }>;
      }>(mondayToken, query);
    } catch (err) {
      if (err instanceof MondayIntegrationError) {
        return jsonResponse({ ...emptyResponse, error: "Monday.com integration not configured" });
      }
      throw err;
    }

    const board = data.boards?.[0];
    if (!board || !board.items_page?.items) {
      return jsonResponse(emptyResponse);
    }

    // ── Transform and filter items ────────────────────────
    let items = board.items_page.items.map((item: any) => {
      const columnValues: Record<string, any> = {};
      for (const cv of item.column_values || []) {
        if (columnIds.length === 0 || columnIds.includes(cv.id)) {
          columnValues[cv.id] = {
            text: cv.text,
            value: cv.value,
            type: cv.type,
            label: cv.label,
            label_style: cv.label_style,
          };
        }
      }
      return { id: item.id, name: item.name, column_values: columnValues };
    });

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter((item: any) => {
        if (item.name.toLowerCase().includes(searchLower)) return true;
        for (const cv of Object.values(item.column_values) as any[]) {
          if (cv.text && cv.text.toLowerCase().includes(searchLower)) return true;
          if (cv.label && cv.label.toLowerCase().includes(searchLower)) return true;
        }
        return false;
      });
    }

    // Apply sorting
    const effectiveSortColumn = sortColumn || settings.default_sort_column;
    const effectiveSortOrder = sortColumn ? sortOrder : settings.default_sort_order || "asc";

    if (effectiveSortColumn) {
      items.sort((a: any, b: any) => {
        let aVal: string, bVal: string;
        if (effectiveSortColumn === "name") {
          aVal = a.name || "";
          bVal = b.name || "";
        } else {
          aVal = a.column_values[effectiveSortColumn]?.text || a.column_values[effectiveSortColumn]?.label || "";
          bVal = b.column_values[effectiveSortColumn]?.text || b.column_values[effectiveSortColumn]?.label || "";
        }
        const comparison = aVal.localeCompare(bVal);
        return effectiveSortOrder === "desc" ? -comparison : comparison;
      });
    }

    const totalCount = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return jsonResponse({
      view: { name: view.name, icon: view.icon, settings, columns: selectedColumns },
      items: paginatedItems,
      total_count: totalCount,
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    if (error instanceof MondayIntegrationError) {
      return jsonResponse({ error: error.message, items: [], total_count: 0 });
    }
    if (error instanceof MondayAPIError) {
      return jsonResponse({ error: "Failed to fetch data from Monday.com" }, 500);
    }
    console.error("Unexpected error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
