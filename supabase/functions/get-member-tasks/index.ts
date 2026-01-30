import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT verification failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("Authenticated user:", userId);

    // Get the member's organization membership
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("id, organization_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      console.error("No active membership found:", membershipError);
      return new Response(
        JSON.stringify({ tasks: [], message: "No active organization membership found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Member found:", membership.id, "Org:", membership.organization_id);

    // Get the member's board access configurations
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
      .eq("member_id", membership.id);

    if (accessError) {
      console.error("Error fetching board access:", accessError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch board access" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!boardAccess || boardAccess.length === 0) {
      console.log("No board access configured for member");
      return new Response(
        JSON.stringify({ tasks: [], message: "No boards assigned to you yet" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to only active board configs
    const activeAccess = boardAccess.filter(
      (access) => access.board_configs && (access.board_configs as any).is_active
    );

    if (activeAccess.length === 0) {
      console.log("No active board configurations");
      return new Response(
        JSON.stringify({ tasks: [], message: "No active boards assigned to you" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the organization to find the owner
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", membership.organization_id)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the owner's Monday.com integration token
    // We need to use a service role client to access the owner's integration
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: integration, error: integrationError } = await adminClient
      .from("user_integrations")
      .select("access_token")
      .eq("user_id", org.owner_id)
      .eq("integration_type", "monday")
      .eq("status", "connected")
      .single();

    if (integrationError || !integration) {
      console.error("Owner's Monday integration not found:", integrationError);
      return new Response(
        JSON.stringify({ tasks: [], message: "Monday.com integration not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mondayToken = integration.access_token;
    console.log("Got owner's Monday token");

    // Prepare board access configs for fetching
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

    // Fetch items from Monday.com for each board
    const allTasks: MondayTask[] = [];

    for (const config of accessConfigs) {
      try {
        console.log(`Fetching items from board ${config.monday_board_id}`);
        
        // Build the GraphQL query for this board
        const query = `
          query {
            boards(ids: [${config.monday_board_id}]) {
              id
              name
              items_page(limit: 100) {
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
            Authorization: mondayToken,
          },
          body: JSON.stringify({ query }),
        });

        if (!mondayResponse.ok) {
          console.error(`Monday API error for board ${config.monday_board_id}:`, await mondayResponse.text());
          continue;
        }

        const mondayData = await mondayResponse.json();
        
        if (mondayData.errors) {
          console.error("Monday GraphQL errors:", mondayData.errors);
          continue;
        }

        const board = mondayData.data?.boards?.[0];
        if (!board || !board.items_page?.items) {
          console.log(`No items found in board ${config.monday_board_id}`);
          continue;
        }

        // Create a map of column id to title
        const columnMap: Record<string, { title: string; type: string }> = {};
        for (const col of board.columns || []) {
          columnMap[col.id] = { title: col.title, type: col.type };
        }

        // Process items and filter by filter_value if a filter column is set
        for (const item of board.items_page.items) {
          // Check if this item matches the filter
          if (config.filter_column_id) {
            const filterColumn = item.column_values.find(
              (cv: any) => cv.id === config.filter_column_id
            );
            
            // Get the text value to compare
            const columnText = filterColumn?.text || filterColumn?.label || "";
            
            // Skip items that don't match the filter value
            if (!columnText.toLowerCase().includes(config.filter_value.toLowerCase())) {
              continue;
            }
          }

          // Build column values with titles, filtering to visible columns only
          const columnValues: MondayColumnValue[] = item.column_values
            .filter((cv: any) => {
              // If no visible columns specified, show all
              if (!config.visible_columns || config.visible_columns.length === 0) {
                return true;
              }
              return config.visible_columns.includes(cv.id);
            })
            .map((cv: any) => ({
              id: cv.id,
              title: columnMap[cv.id]?.title || cv.id,
              type: cv.type || columnMap[cv.id]?.type || "text",
              text: cv.text || cv.label || null,
              value: cv.value ? JSON.parse(cv.value) : null,
            }));

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

        console.log(`Found ${allTasks.length} matching tasks for board ${config.monday_board_id}`);
      } catch (boardError) {
        console.error(`Error processing board ${config.monday_board_id}:`, boardError);
        continue;
      }
    }

    console.log(`Total tasks found: ${allTasks.length}`);

    return new Response(
      JSON.stringify({ tasks: allTasks }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
