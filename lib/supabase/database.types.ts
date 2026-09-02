/**
 * ⚠️ ملف مولَّد — لا يُحرَّر يدوياً.
 *
 * مصدره مخطّط قاعدة البيانات نفسه، فأي عمود يُضاف أو يُحذف هناك يظهر هنا،
 * ويكشفه المترجم في كل موضع لا يطابقه. قبل هذا كانت الصفوف مكتوبة يدوياً في
 * ثمانية أماكن، فكان المخطّط وأنواع TypeScript ينزلقان بصمت.
 *
 * التحديث بعد أي هجرة:
 *   npx supabase gen types typescript --project-id nybsslamxxkrpbkxdujy  *     > lib/supabase/database.types.ts
 */

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          quantity: number
          size_label: string
          unit_price: number
          variant_id: string
        }
        Insert: {
          id?: string
          order_id: string
          quantity: number
          size_label: string
          unit_price: number
          variant_id: string
        }
        Update: {
          id?: string
          order_id?: string
          quantity?: number
          size_label?: string
          unit_price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          city: string
          created_at: string
          currency: string
          customer_name: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone: string
          receipt_path: string | null
          reference: string
          shipping: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          wallet_id: string | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          currency?: string
          customer_name: string
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone: string
          receipt_path?: string | null
          reference?: string
          shipping?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          wallet_id?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          currency?: string
          customer_name?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          phone?: string
          receipt_path?: string | null
          reference?: string
          shipping?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          wallet_id?: string | null
        }
        Relationships: []
      }
      product_sizes: {
        Row: {
          id: string
          label: string
          position: number
          product_id: string
          stock: number
        }
        Insert: {
          id?: string
          label: string
          position?: number
          product_id: string
          stock?: number
        }
        Update: {
          id?: string
          label?: string
          position?: number
          product_id?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color_hex: string
          color_name_ar: string
          created_at: string
          id: string
          image_url: string | null
          position: number
          product_id: string
          slug: string
          stock: number
        }
        Insert: {
          color_hex: string
          color_name_ar: string
          created_at?: string
          id?: string
          image_url?: string | null
          position?: number
          product_id: string
          slug: string
          stock?: number
        }
        Update: {
          color_hex?: string
          color_name_ar?: string
          created_at?: string
          id?: string
          image_url?: string | null
          position?: number
          product_id?: string
          slug?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          currency: string
          description_ar: string
          id: string
          is_active: boolean
          model_path: string
          name_ar: string
          price: number
          slug: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description_ar?: string
          id?: string
          is_active?: boolean
          model_path?: string
          name_ar: string
          price: number
          slug: string
        }
        Update: {
          created_at?: string
          currency?: string
          description_ar?: string
          id?: string
          is_active?: boolean
          model_path?: string
          name_ar?: string
          price?: number
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: {
        Args: { p_quantity: number; p_variant_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      place_order: {
        Args: {
          p_currency: string
          p_customer: Json
          p_items: Json
          p_payment: Database["public"]["Enums"]["payment_method"]
          p_shipping: number
          p_subtotal: number
          p_total: number
          p_wallet: string
        }
        Returns: {
          order_id: string
          order_reference: string
        }[]
      }
      set_order_status: {
        Args: {
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Database["public"]["Enums"]["order_status"]
      }
    }
    Enums: {
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method: "cod" | "card" | "transfer"
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
      order_status: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cod", "card", "transfer"],
    },
  },
} as const
