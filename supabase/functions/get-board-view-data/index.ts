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
    console.error("[get-board-view-data] Decryption error:", error);
    return encryptedData;
  }
}

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Step 1: Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[get-board-view-data] Missing authorization");
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
      console.error("[get-board-view-data] JWT verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-board-view-data] User verified:", user.id);

    // ── Step 2: Parse query params ────────────────────────────────
    const url = new URL(req.url);
    const viewId = url.searchParams.get("view_id");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const search = url.searchParams.get("search") || "";
    const sortColumn = url.searchParams.get("sort");
    const sortOrder = url.searchParams.get("order") || "asc";

    if (!viewId) {
      return new Response(
        JSON.stringify({ error: "view_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-board-view-data] Params:", { viewId, page, limit, search, sortColumn, sortOrder });

    // ── Step 3: Fetch view config ─────────────────────────────────
    const { data: view, error: viewError } = await supabase
      .from("custom_board_views")
      .select("*")
      .eq("id", viewId)
      .single();

    if (viewError || !view) {
      console.error("[get-board-view-data] View not found:", viewError);
      return new Response(
        JSON.stringify({ error: "View not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[get-board-view-data] View found:", view.name);

    // ── Step 4: Verify user access ────────────────────────────────
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", view.organization_id)
      .eq("status", "active")
      .maybeSingle();

    // Also check if user is the org owner
    const { data: org } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", view.organization_id)
      .single();

    const isOwner = org?.owner_id === user.id;
    const isMember = !!membership;

    if (!isOwner && !isMember) {
      console.error("[get-board-view-data] Access denied for user:", user.id);
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 5: Get owner's Monday token ──────────────────────────
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const ownerId = org!.owner_id;

    const { data: integration, error: integrationError } = await adminClient
      .from("user_integrations")
      .select("access_token")
      .eq("user_id", ownerId)
      .eq("integration_type", "monday")
      .eq("status", "connected")
      .single();

    if (integrationError || !integration) {
      console.error("[get-board-view-data] Monday integration not found");
      return new Response(
        JSON.stringify({ 
          error: "Monday.com integration not configured",
          items: [],
          total_count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    let mondayToken = integration.access_token;

    if (encryptionKey) {
      mondayToken = await decryptToken(integration.access_token, encryptionKey);
    }

    // ── Step 6: Fetch data from Monday.com ────────────────────────
    const selectedColumns: ViewColumn[] = view.selected_columns || [];
    const settings: ViewSettings = view.settings || {};
    const columnIds = selectedColumns.map(c => c.id);

    console.log("[get-board-view-data] Fetching board:", view.monday_board_id, "columns:", columnIds.length);

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
      console.error("[get-board-view-data] Monday API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch data from Monday.com" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mondayData = await mondayResponse.json();

    if (mondayData.errors) {
      console.error("[get-board-view-data] Monday API errors:", mondayData.errors);
      return new Response(
        JSON.stringify({ error: "Monday.com API error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const board = mondayData.data?.boards?.[0];
    if (!board || !board.items_page?.items) {
      return new Response(
        JSON.stringify({
          view: {
            name: view.name,
            icon: view.icon,
            settings,
            columns: selectedColumns,
          },
          items: [],
          total_count: 0,
          page,
          limit,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build column map for titles
    const columnMap: Record<string, { title: string; type: string }> = {};
    for (const col of board.columns || []) {
      columnMap[col.id] = { title: col.title, type: col.type };
    }

    // ── Step 7: Transform and filter items ────────────────────────
    let items = board.items_page.items.map((item: any) => {
      const columnValues: Record<string, any> = {};

      for (const cv of item.column_values || []) {
        // Only include selected columns
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

      return {
        id: item.id,
        name: item.name,
        column_values: columnValues,
      };
    });

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter((item: any) => {
        // Search in item name
        if (item.name.toLowerCase().includes(searchLower)) return true;
        
        // Search in column values
        for (const cv of Object.values(item.column_values) as any[]) {
          if (cv.text && cv.text.toLowerCase().includes(searchLower)) return true;
          if (cv.label && cv.label.toLowerCase().includes(searchLower)) return true;
        }
        return false;
      });
    }

    // Apply sorting
    const effectiveSortColumn = sortColumn || settings.default_sort_column;
    const effectiveSortOrder = sortColumn ? sortOrder : (settings.default_sort_order || 'asc');

    if (effectiveSortColumn) {
      items.sort((a: any, b: any) => {
        let aVal: string, bVal: string;

        if (effectiveSortColumn === 'name') {
          aVal = a.name || '';
          bVal = b.name || '';
        } else {
          aVal = a.column_values[effectiveSortColumn]?.text || a.column_values[effectiveSortColumn]?.label || '';
          bVal = b.column_values[effectiveSortColumn]?.text || b.column_values[effectiveSortColumn]?.label || '';
        }

        const comparison = aVal.localeCompare(bVal);
        return effectiveSortOrder === 'desc' ? -comparison : comparison;
      });
    }

    const totalCount = items.length;

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    console.log("[get-board-view-data] Returning", paginatedItems.length, "of", totalCount, "items");

    return new Response(
      JSON.stringify({
        view: {
          name: view.name,
          icon: view.icon,
          settings,
          columns: selectedColumns,
        },
        items: paginatedItems,
        total_count: totalCount,
        page,
        limit,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[get-board-view-data] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
