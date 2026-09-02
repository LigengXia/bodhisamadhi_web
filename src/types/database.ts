export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          allow_download: boolean
          audio_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: Json
          duration_seconds: number | null
          id: string
          part_number: number | null
          pdf_pages: number | null
          pdf_url: string | null
          published_at: string | null
          recorded_at: string | null
          required_empowerment: string | null
          search_cjk: string | null
          search_en: unknown
          series_id: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          teacher_id: string | null
          thumbnail_url: string | null
          title: Json
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
          youtube_id: string | null
        }
        Insert: {
          allow_download?: boolean
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: Json
          duration_seconds?: number | null
          id?: string
          part_number?: number | null
          pdf_pages?: number | null
          pdf_url?: string | null
          published_at?: string | null
          recorded_at?: string | null
          required_empowerment?: string | null
          search_cjk?: string | null
          search_en?: unknown
          series_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          teacher_id?: string | null
          thumbnail_url?: string | null
          title: Json
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
          youtube_id?: string | null
        }
        Update: {
          allow_download?: boolean
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: Json
          duration_seconds?: number | null
          id?: string
          part_number?: number | null
          pdf_pages?: number | null
          pdf_url?: string | null
          published_at?: string | null
          recorded_at?: string | null
          required_empowerment?: string | null
          search_cjk?: string | null
          search_en?: unknown
          series_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          teacher_id?: string | null
          thumbnail_url?: string | null
          title?: Json
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_required_empowerment_fkey"
            columns: ["required_empowerment"]
            isOneToOne: false
            referencedRelation: "empowerments"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "content_items_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tags: {
        Row: {
          content_item_id: string
          tag_id: string
        }
        Insert: {
          content_item_id: string
          tag_id: string
        }
        Update: {
          content_item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tags_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      empowerments: {
        Row: {
          created_at: string
          description: Json
          display_order: number
          is_active: boolean
          name: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: Json
          display_order?: number
          is_active?: boolean
          name: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: Json
          display_order?: number
          is_active?: boolean
          name?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_confirmed_at: string | null
          announcements_opt_in: boolean
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          onboarded_at: string | null
          preferred_locale: Database["public"]["Enums"]["locale"]
          reminder_opt_in: boolean
          updated_at: string
        }
        Insert: {
          age_confirmed_at?: string | null
          announcements_opt_in?: boolean
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id: string
          onboarded_at?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale"]
          reminder_opt_in?: boolean
          updated_at?: string
        }
        Update: {
          age_confirmed_at?: string | null
          announcements_opt_in?: boolean
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          onboarded_at?: string | null
          preferred_locale?: Database["public"]["Enums"]["locale"]
          reminder_opt_in?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      series: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: Json
          id: string
          slug: string
          teacher_id: string | null
          title: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: Json
          id?: string
          slug: string
          teacher_id?: string | null
          title: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: Json
          id?: string
          slug?: string
          teacher_id?: string | null
          title?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["tag_kind"]
          label: Json
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["tag_kind"]
          label: Json
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tag_kind"]
          label?: Json
          slug?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          bio: Json
          created_at: string
          deleted_at: string | null
          display_order: number
          honorific: string | null
          id: string
          is_active: boolean
          name: Json
          photo_url: string | null
          profile_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          bio?: Json
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          honorific?: string | null
          id?: string
          is_active?: boolean
          name: Json
          photo_url?: string | null
          profile_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          bio?: Json
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          honorific?: string | null
          id?: string
          is_active?: boolean
          name?: Json
          photo_url?: string | null
          profile_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_qualifications: {
        Row: {
          empowerment_slug: string
          granted_at: string
          granted_by: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          empowerment_slug: string
          granted_at?: string
          granted_by?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          empowerment_slug?: string
          granted_at?: string
          granted_by?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_qualifications_empowerment_slug_fkey"
            columns: ["empowerment_slug"]
            isOneToOne: false
            referencedRelation: "empowerments"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_qualifications_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_qualifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_queue_counts: { Args: never; Returns: Json }
      get_members_card: {
        Args: { _slug: string }
        Returns: {
          description: Json
          duration_seconds: number
          id: string
          part_number: number
          published_at: string
          recorded_at: string
          series_slug: string
          series_title: Json
          slug: string
          teacher_honorific: string
          teacher_name: Json
          teacher_slug: string
          thumbnail_url: string
          title: Json
          type: Database["public"]["Enums"]["content_type"]
        }[]
      }
      has_empowerment: { Args: { _slug: string }; Returns: boolean }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      list_admin_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          qualifications: string[]
          roles: string[]
        }[]
      }
      list_library_cards: {
        Args: {
          _limit?: number
          _offset?: number
          _type?: Database["public"]["Enums"]["content_type"]
        }
        Returns: {
          duration_seconds: number
          id: string
          is_locked: boolean
          published_at: string
          slug: string
          teacher_name: Json
          thumbnail_url: string
          title: Json
          type: Database["public"]["Enums"]["content_type"]
        }[]
      }
      search_content: {
        Args: { _locale?: Database["public"]["Enums"]["locale"]; _q: string }
        Returns: {
          allow_download: boolean
          audio_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: Json
          duration_seconds: number | null
          id: string
          part_number: number | null
          pdf_pages: number | null
          pdf_url: string | null
          published_at: string | null
          recorded_at: string | null
          required_empowerment: string | null
          search_cjk: string | null
          search_en: unknown
          series_id: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          teacher_id: string | null
          thumbnail_url: string | null
          title: Json
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
          youtube_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "content_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "master" | "admin"
      content_status: "draft" | "published" | "archived"
      content_type: "video" | "audio" | "script"
      locale: "en" | "zh" | "bo"
      tag_kind: "topic" | "lineage"
      visibility: "public" | "members" | "restricted"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["master", "admin"],
      content_status: ["draft", "published", "archived"],
      content_type: ["video", "audio", "script"],
      locale: ["en", "zh", "bo"],
      tag_kind: ["topic", "lineage"],
      visibility: ["public", "members", "restricted"],
    },
  },
} as const

