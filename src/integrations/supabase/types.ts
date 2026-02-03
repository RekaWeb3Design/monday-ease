export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      board_configs: {
        Row: {
          board_name: string
          created_at: string | null
          filter_column_id: string | null
          filter_column_name: string | null
          filter_column_type: string | null
          id: string
          is_active: boolean | null
          monday_account_id: string | null
          monday_board_id: string
          organization_id: string
          updated_at: string | null
          visible_columns: Json | null
          workspace_name: string | null
        }
        Insert: {
          board_name: string
          created_at?: string | null
          filter_column_id?: string | null
          filter_column_name?: string | null
          filter_column_type?: string | null
          id?: string
          is_active?: boolean | null
          monday_account_id?: string | null
          monday_board_id: string
          organization_id: string
          updated_at?: string | null
          visible_columns?: Json | null
          workspace_name?: string | null
        }
        Update: {
          board_name?: string
          created_at?: string | null
          filter_column_id?: string | null
          filter_column_name?: string | null
          filter_column_type?: string | null
          id?: string
          is_active?: boolean | null
          monday_account_id?: string | null
          monday_board_id?: string
          organization_id?: string
          updated_at?: string | null
          visible_columns?: Json | null
          workspace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_board_views: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          monday_board_id: string
          monday_board_name: string | null
          name: string
          organization_id: string
          selected_columns: Json
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          monday_board_id: string
          monday_board_name?: string | null
          name: string
          organization_id: string
          selected_columns?: Json
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          monday_board_id?: string
          monday_board_name?: string | null
          name?: string
          organization_id?: string
          selected_columns?: Json
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_board_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_board_access: {
        Row: {
          board_config_id: string
          created_at: string | null
          filter_value: string
          id: string
          member_id: string
          updated_at: string | null
        }
        Insert: {
          board_config_id: string
          created_at?: string | null
          filter_value: string
          id?: string
          member_id: string
          updated_at?: string | null
        }
        Update: {
          board_config_id?: string
          created_at?: string | null
          filter_value?: string
          id?: string
          member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_board_access_board_config_id_fkey"
            columns: ["board_config_id"]
            isOneToOne: false
            referencedRelation: "board_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_board_access_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          display_name: string | null
          email: string
          id: string
          invited_at: string | null
          joined_at: string | null
          organization_id: string
          role: string
          status: string
          user_id: string | null
        }
        Insert: {
          display_name?: string | null
          email: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          display_name?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          max_members: number | null
          monday_workspace_id: string | null
          name: string
          owner_id: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_members?: number | null
          monday_workspace_id?: string | null
          name: string
          owner_id: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_members?: number | null
          monday_workspace_id?: string | null
          name?: string
          owner_id?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string
          connected_at: string | null
          created_at: string | null
          id: string
          integration_type: string
          last_used_at: string | null
          monday_account_id: string | null
          monday_user_id: string | null
          refresh_token: string | null
          scopes: string[] | null
          status: string
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          workspace_name: string | null
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          integration_type?: string
          last_used_at?: string | null
          monday_account_id?: string | null
          monday_user_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          workspace_name?: string | null
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          integration_type?: string
          last_used_at?: string | null
          monday_account_id?: string | null
          monday_user_id?: string | null
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          workspace_name?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          primary_organization_id: string | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          primary_organization_id?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          primary_organization_id?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_params: Json | null
          organization_id: string | null
          output_result: Json | null
          started_at: string | null
          status: string
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_params?: Json | null
          organization_id?: string | null
          output_result?: Json | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_params?: Json | null
          organization_id?: string | null
          output_result?: Json | null
          started_at?: string | null
          status?: string
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          execution_count: number | null
          icon: string | null
          id: string
          input_schema: Json
          is_active: boolean | null
          is_premium: boolean | null
          n8n_webhook_url: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          icon?: string | null
          id?: string
          input_schema?: Json
          is_active?: boolean | null
          is_premium?: boolean | null
          n8n_webhook_url: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          icon?: string | null
          id?: string
          input_schema?: Json
          is_active?: boolean | null
          is_premium?: boolean | null
          n8n_webhook_url?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_ids: { Args: { user_uuid: string }; Returns: string[] }
      is_org_owner: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
