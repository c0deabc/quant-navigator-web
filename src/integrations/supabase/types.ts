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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exchange_accounts: {
        Row: {
          api_key_hint: string | null
          created_at: string
          exchange_name: string
          id: string
          is_connected: boolean | null
          permissions: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_hint?: string | null
          created_at?: string
          exchange_name: string
          id?: string
          is_connected?: boolean | null
          permissions?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_hint?: string | null
          created_at?: string
          exchange_name?: string
          id?: string
          is_connected?: boolean | null
          permissions?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      executions: {
        Row: {
          created_at: string
          error_message: string | null
          estimated_margin: number | null
          id: string
          leverage_long: number | null
          leverage_short: number | null
          margin_mode: string | null
          order_details: Json | null
          position_size: number | null
          signal_id: string | null
          slippage_tolerance: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          estimated_margin?: number | null
          id?: string
          leverage_long?: number | null
          leverage_short?: number | null
          margin_mode?: string | null
          order_details?: Json | null
          position_size?: number | null
          signal_id?: string | null
          slippage_tolerance?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          estimated_margin?: number | null
          id?: string
          leverage_long?: number | null
          leverage_short?: number | null
          margin_mode?: string | null
          order_details?: Json | null
          position_size?: number | null
          signal_id?: string | null
          slippage_tolerance?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "executions_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_series: {
        Row: {
          exchange: string
          funding_rate: number
          id: string
          symbol: string
          ts: string
        }
        Insert: {
          exchange: string
          funding_rate: number
          id?: string
          symbol: string
          ts: string
        }
        Update: {
          exchange?: string
          funding_rate?: number
          id?: string
          symbol?: string
          ts?: string
        }
        Relationships: []
      }
      funding_snapshot: {
        Row: {
          exchange: string
          funding_rate: number
          id: string
          next_funding_time: string | null
          quote: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          exchange: string
          funding_rate: number
          id?: string
          next_funding_time?: string | null
          quote?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          exchange?: string
          funding_rate?: number
          id?: string
          next_funding_time?: string | null
          quote?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_scan_config: {
        Row: {
          cointegration_pvalue_limit: number | null
          correlation_threshold: number | null
          hurst_max: number | null
          id: string
          is_scanning: boolean | null
          last_scan_at: string | null
          min_volume_filter: number | null
          next_scan_at: string | null
          ou_theta_min: number | null
          scan_interval_minutes: number | null
          updated_at: string
        }
        Insert: {
          cointegration_pvalue_limit?: number | null
          correlation_threshold?: number | null
          hurst_max?: number | null
          id?: string
          is_scanning?: boolean | null
          last_scan_at?: string | null
          min_volume_filter?: number | null
          next_scan_at?: string | null
          ou_theta_min?: number | null
          scan_interval_minutes?: number | null
          updated_at?: string
        }
        Update: {
          cointegration_pvalue_limit?: number | null
          correlation_threshold?: number | null
          hurst_max?: number | null
          id?: string
          is_scanning?: boolean | null
          last_scan_at?: string | null
          min_volume_filter?: number | null
          next_scan_at?: string | null
          ou_theta_min?: number | null
          scan_interval_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      options_iv_surface_snapshots: {
        Row: {
          atm_iv: number | null
          created_at: string
          curvature_10d: number | null
          exchange: string
          expiry: string
          id: string
          iv_10d_call: number | null
          iv_10d_put: number | null
          iv_25d_call: number | null
          iv_25d_put: number | null
          iv_50d: number | null
          raw: Json | null
          skew_25d: number | null
          symbol: string
        }
        Insert: {
          atm_iv?: number | null
          created_at?: string
          curvature_10d?: number | null
          exchange: string
          expiry: string
          id?: string
          iv_10d_call?: number | null
          iv_10d_put?: number | null
          iv_25d_call?: number | null
          iv_25d_put?: number | null
          iv_50d?: number | null
          raw?: Json | null
          skew_25d?: number | null
          symbol: string
        }
        Update: {
          atm_iv?: number | null
          created_at?: string
          curvature_10d?: number | null
          exchange?: string
          expiry?: string
          id?: string
          iv_10d_call?: number | null
          iv_10d_put?: number | null
          iv_25d_call?: number | null
          iv_25d_put?: number | null
          iv_50d?: number | null
          raw?: Json | null
          skew_25d?: number | null
          symbol?: string
        }
        Relationships: []
      }
      options_realized_vol_snapshots: {
        Row: {
          created_at: string
          id: string
          raw: Json | null
          rv_14d: number | null
          rv_30d: number | null
          rv_60d: number | null
          rv_7d: number | null
          source: string | null
          symbol: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw?: Json | null
          rv_14d?: number | null
          rv_30d?: number | null
          rv_60d?: number | null
          rv_7d?: number | null
          source?: string | null
          symbol: string
        }
        Update: {
          created_at?: string
          id?: string
          raw?: Json | null
          rv_14d?: number | null
          rv_30d?: number | null
          rv_60d?: number | null
          rv_7d?: number | null
          source?: string | null
          symbol?: string
        }
        Relationships: []
      }
      options_signals: {
        Row: {
          created_at: string
          details: Json | null
          direction: string
          exchange: string
          expiry: string
          id: string
          link: string | null
          score: number
          severity: number
          signal_type: string
          status: string
          summary: string
          symbol: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          direction: string
          exchange: string
          expiry: string
          id?: string
          link?: string | null
          score: number
          severity: number
          signal_type: string
          status?: string
          summary: string
          symbol: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          direction?: string
          exchange?: string
          expiry?: string
          id?: string
          link?: string | null
          score?: number
          severity?: number
          signal_type?: string
          status?: string
          summary?: string
          symbol?: string
        }
        Relationships: []
      }
      pair_metrics: {
        Row: {
          beta: number | null
          cointegration_pvalue: number | null
          correlation: number | null
          half_life_hours: number | null
          hurst_exponent: number | null
          id: string
          last_updated: string
          ou_theta: number | null
          symbol_a: string
          symbol_b: string
        }
        Insert: {
          beta?: number | null
          cointegration_pvalue?: number | null
          correlation?: number | null
          half_life_hours?: number | null
          hurst_exponent?: number | null
          id?: string
          last_updated?: string
          ou_theta?: number | null
          symbol_a: string
          symbol_b: string
        }
        Update: {
          beta?: number | null
          cointegration_pvalue?: number | null
          correlation?: number | null
          half_life_hours?: number | null
          hurst_exponent?: number | null
          id?: string
          last_updated?: string
          ou_theta?: number | null
          symbol_a?: string
          symbol_b?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          confidence_score: number | null
          created_at: string
          entry_price_a: number | null
          entry_price_b: number | null
          expires_at: string
          id: string
          pair_metrics_id: string
          signal_direction: string | null
          usd_spread: number | null
          z_ou_score: number
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          entry_price_a?: number | null
          entry_price_b?: number | null
          expires_at: string
          id?: string
          pair_metrics_id: string
          signal_direction?: string | null
          usd_spread?: number | null
          z_ou_score: number
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          entry_price_a?: number | null
          entry_price_b?: number | null
          expires_at?: string
          id?: string
          pair_metrics_id?: string
          signal_direction?: string | null
          usd_spread?: number | null
          z_ou_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "signals_pair_metrics_id_fkey"
            columns: ["pair_metrics_id"]
            isOneToOne: false
            referencedRelation: "pair_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          bar_interval: string | null
          created_at: string
          half_life_max_hours: number | null
          hurst_max: number | null
          id: string
          leverage_long: number | null
          leverage_short: number | null
          lookback_days: number | null
          margin_mode: string | null
          max_cointegration_pvalue: number | null
          max_slippage_percent: number | null
          min_correlation: number | null
          min_volume_usd: number | null
          order_type: string | null
          ou_theta_min: number | null
          position_size_mode: string | null
          position_size_value: number | null
          updated_at: string
          user_id: string
          zscore_entry_threshold: number | null
          zscore_exit_threshold: number | null
        }
        Insert: {
          bar_interval?: string | null
          created_at?: string
          half_life_max_hours?: number | null
          hurst_max?: number | null
          id?: string
          leverage_long?: number | null
          leverage_short?: number | null
          lookback_days?: number | null
          margin_mode?: string | null
          max_cointegration_pvalue?: number | null
          max_slippage_percent?: number | null
          min_correlation?: number | null
          min_volume_usd?: number | null
          order_type?: string | null
          ou_theta_min?: number | null
          position_size_mode?: string | null
          position_size_value?: number | null
          updated_at?: string
          user_id: string
          zscore_entry_threshold?: number | null
          zscore_exit_threshold?: number | null
        }
        Update: {
          bar_interval?: string | null
          created_at?: string
          half_life_max_hours?: number | null
          hurst_max?: number | null
          id?: string
          leverage_long?: number | null
          leverage_short?: number | null
          lookback_days?: number | null
          margin_mode?: string | null
          max_cointegration_pvalue?: number | null
          max_slippage_percent?: number | null
          min_correlation?: number | null
          min_volume_usd?: number | null
          order_type?: string | null
          ou_theta_min?: number | null
          position_size_mode?: string | null
          position_size_value?: number | null
          updated_at?: string
          user_id?: string
          zscore_entry_threshold?: number | null
          zscore_exit_threshold?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      user_status: "pending" | "active" | "disabled"
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
    Enums: {
      app_role: ["admin", "user"],
      user_status: ["pending", "active", "disabled"],
    },
  },
} as const
