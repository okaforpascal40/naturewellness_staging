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
      food_condition_links: {
        Row: {
          approved_for_public: boolean
          condition_id: string
          created_at: string
          evidence_level: string
          food_id: string
          id: string
          key_compounds: string[] | null
          layer: string
          mechanism: string | null
          pubmed_refs: string[] | null
          updated_at: string
        }
        Insert: {
          approved_for_public?: boolean
          condition_id: string
          created_at?: string
          evidence_level?: string
          food_id: string
          id?: string
          key_compounds?: string[] | null
          layer?: string
          mechanism?: string | null
          pubmed_refs?: string[] | null
          updated_at?: string
        }
        Update: {
          approved_for_public?: boolean
          condition_id?: string
          created_at?: string
          evidence_level?: string
          food_id?: string
          id?: string
          key_compounds?: string[] | null
          layer?: string
          mechanism?: string | null
          pubmed_refs?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_condition_links_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "health_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_condition_links_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          category: string | null
          compounds: Json | null
          created_at: string
          emoji: string | null
          id: string
          name: string
          nutrients: Json | null
          scientific_name: string | null
          updated_at: string
          warnings: string | null
        }
        Insert: {
          category?: string | null
          compounds?: Json | null
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          nutrients?: Json | null
          scientific_name?: string | null
          updated_at?: string
          warnings?: string | null
        }
        Update: {
          category?: string | null
          compounds?: Json | null
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          nutrients?: Json | null
          scientific_name?: string | null
          updated_at?: string
          warnings?: string | null
        }
        Relationships: []
      }
      gene_disease_associations: {
        Row: {
          condition_id: string
          created_at: string
          gene_id: string
          id: string
        }
        Insert: {
          condition_id: string
          created_at?: string
          gene_id: string
          id?: string
        }
        Update: {
          condition_id?: string
          created_at?: string
          gene_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gene_disease_associations_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "health_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gene_disease_associations_gene_id_fkey"
            columns: ["gene_id"]
            isOneToOne: false
            referencedRelation: "genes"
            referencedColumns: ["id"]
          },
        ]
      }
      gene_pathway_associations: {
        Row: {
          created_at: string
          gene_id: string
          id: string
          pathway_id: string
        }
        Insert: {
          created_at?: string
          gene_id: string
          id?: string
          pathway_id: string
        }
        Update: {
          created_at?: string
          gene_id?: string
          id?: string
          pathway_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gene_pathway_associations_gene_id_fkey"
            columns: ["gene_id"]
            isOneToOne: false
            referencedRelation: "genes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gene_pathway_associations_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "pathways"
            referencedColumns: ["id"]
          },
        ]
      }
      genes: {
        Row: {
          created_at: string
          description: string | null
          gene_name: string
          gene_symbol: string
          id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gene_name: string
          gene_symbol: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gene_name?: string
          gene_symbol?: string
          id?: string
        }
        Relationships: []
      }
      health_conditions: {
        Row: {
          automated_evidence_score: number | null
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          public_display_status: boolean
          source_database: string | null
          updated_at: string
        }
        Insert: {
          automated_evidence_score?: number | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          public_display_status?: boolean
          source_database?: string | null
          updated_at?: string
        }
        Update: {
          automated_evidence_score?: number | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          public_display_status?: boolean
          source_database?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pathways: {
        Row: {
          created_at: string
          description: string | null
          id: string
          pathway_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          pathway_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          pathway_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
