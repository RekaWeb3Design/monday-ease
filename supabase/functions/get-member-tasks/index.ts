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
    // The encrypted data format: base64(iv + ciphertext)
    const combined = decodeBase64(encryptedData);
    
    // IV is first 12 bytes, rest is ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    // Import the key
    const keyData = new TextEncoder().encode(encryptionKey.padEnd(32, '0').slice(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    // If decryption fails, assume the token is not encrypted and return as-is
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

    // Verify JWT and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("JWT verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerUserId = user.id;
    console.log("Authenticated user:", callerUserId);

    // Check for member_id query parameter (owner impersonation)
    const url = new URL(req.url);
    const targetMemberId = url.searchParams.get("member_id");
    
    let targetMembershipId: string;
    let organizationId: string;
    let ownerId: string;

    if (targetMemberId) {
      // Owner is trying to view a specific member's tasks
      console.log("Owner viewing member tasks for member_id:", targetMemberId);
      
      // First, get the caller's membership to check if they're an owner
      const { data: callerMembership, error: callerMembershipError } = await supabase
        .from("organization_members")
        .select("role, organization_id")
        .eq("user_id", callerUserId)
        .eq("status", "active")
        .single();

      if (callerMembershipError || !callerMembership) {
        console.error("Caller has no active membership:", callerMembershipError);
        return new Response(
          JSON.stringify({ error: "Not authorized to view member tasks" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if caller is the organization owner
      if (callerMembership.role !== "owner") {
        console.error("Only owners can view other member's tasks");
        return new Response(
          JSON.stringify({ error: "Only owners can view other member's tasks" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the target member's membership to verify they're in the same org
      const { data: targetMember, error: targetMemberError } = await supabase
        .from("organization_members")
        .select("id, organization_id")
        .eq("id", targetMemberId)
        .eq("status", "active")
        .single();

      if (targetMemberError || !targetMember) {
        console.error("Target member not found:", targetMemberError);
        return new Response(
          JSON.stringify({ error: "Member not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify target member is in the same organization
      if (targetMember.organization_id !== callerMembership.organization_id) {
        console.error("Target member is not in the caller's organization");
        return new Response(
          JSON.stringify({ error: "Member not in your organization" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetMembershipId = targetMember.id;
      organizationId = targetMember.organization_id;
      
      // Get the organization owner_id
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) {
        console.error("Organization not found:", orgError);
        return new Response(
          JSON.stringify({ error: "Organization not found" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      ownerId = org.owner_id;
    } else {
      // Regular flow: user is fetching their own tasks
      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("id, organization_id, role")
        .eq("user_id", callerUserId)
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

      targetMembershipId = membership.id;
      organizationId = membership.organization_id;

      // Get the organization to find the owner
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) {
        console.error("Organization not found:", orgError);
        return new Response(
          JSON.stringify({ error: "Organization not found" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      ownerId = org.owner_id;
    }

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
      .eq("member_id", targetMembershipId);

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
        JSON.stringify({ tasks: [], message: "No boards assigned to this member yet" }),
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
        JSON.stringify({ tasks: [], message: "No active boards assigned to this member" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the owner's Monday.com integration token
    // We need to use a service role client to access the owner's integration
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
      console.error("Owner's Monday integration not found:", integrationError);
      return new Response(
        JSON.stringify({ tasks: [], message: "Monday.com integration not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt the token if encryption key is available
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
    let mondayToken = integration.access_token;
    
    if (encryptionKey) {
      console.log("Attempting to decrypt token...");
      mondayToken = await decryptToken(integration.access_token, encryptionKey);
      console.log("Decrypted token length:", mondayToken?.length || 0);
    } else {
      console.log("No ENCRYPTION_KEY, using token as-is, length:", mondayToken?.length || 0);
    }

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

    console.log("Board access configs:", JSON.stringify(accessConfigs, null, 2));

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
            // CRITICAL: Monday.com API requires "Bearer " prefix on the token
            Authorization: mondayToken.startsWith("Bearer ") ? mondayToken : `Bearer ${mondayToken}`,
          },
          body: JSON.stringify({ query }),
        });

        if (!mondayResponse.ok) {
          const errorText = await mondayResponse.text();
          console.error(`Monday API HTTP error for board ${config.monday_board_id}: ${mondayResponse.status}`, errorText);
          continue;
        }

        const mondayData = await mondayResponse.json();
        
        if (mondayData.errors) {
          console.error(`Monday API error for board ${config.monday_board_id}:`, JSON.stringify(mondayData.errors));
          continue;
        }

        const board = mondayData.data?.boards?.[0];
        if (!board || !board.items_page?.items) {
          console.log(`No items found in board ${config.monday_board_id}`);
          continue;
        }

        console.log(`Board ${config.monday_board_id} has ${board.items_page.items.length} total items`);

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
            
            // Get the text value to compare (Monday.com provides 'text' for display)
            let columnText = filterColumn?.text || filterColumn?.label || "";
            
            // For people columns, Monday.com may return a JSON value with person IDs
            // The 'text' field should already contain the person names
            // But let's also try to extract from 'value' if text is empty
            if (!columnText && filterColumn?.value) {
              try {
                const parsedValue = typeof filterColumn.value === 'string' 
                  ? JSON.parse(filterColumn.value) 
                  : filterColumn.value;
                
                // Handle people column format: {personsAndTeams: [{id, kind}]}
                if (parsedValue?.personsAndTeams && Array.isArray(parsedValue.personsAndTeams)) {
                  // The text should have been provided by Monday API, but if not we'd need to fetch user names
                  console.log(`People column value for ${item.name}:`, JSON.stringify(parsedValue));
                }
              } catch (e) {
                // Not JSON or parse error, continue with empty text
              }
            }
            
            console.log(`Item "${item.name}": filter column "${config.filter_column_id}" = "${columnText}", matching against "${config.filter_value}"`);
            
            // Skip items that don't match the filter value (case-insensitive partial match)
            if (!columnText.toLowerCase().includes(config.filter_value.toLowerCase())) {
              console.log(`  -> Skipped (no match)`);
              continue;
            }
            console.log(`  -> Matched!`);
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
