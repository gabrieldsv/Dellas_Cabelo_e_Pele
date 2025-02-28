export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          phone: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      services: {
        Row: {
          id: string
          name: string
          price: number
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          price: number
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          created_at?: string
          created_by?: string | null
        }
      }
      appointments: {
        Row: {
          id: string
          client_id: string
          start_time: string
          end_time: string
          status: string
          notes: string | null
          created_at: string
          created_by: string | null
          final_price: number
        }
        Insert: {
          id?: string
          client_id: string
          start_time: string
          end_time: string
          status?: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
          final_price?: number
        }
        Update: {
          id?: string
          client_id?: string
          start_time?: string
          end_time?: string
          status?: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
          final_price?: number
        }
      }
      appointment_services: {
        Row: {
          id: string
          appointment_id: string
          service_id: string
          price: number
          final_price: number
        }
        Insert: {
          id?: string
          appointment_id: string
          service_id: string
          price: number
          final_price?: number
        }
        Update: {
          id?: string
          appointment_id?: string
          service_id?: string
          price?: number
          final_price?: number
        }
      }
      inventory: {
        Row: {
          id: string
          name: string
          quantity: number
          cost_price: number
          selling_price: number
          created_at: string
          created_by: string | null
          category: string
        }
        Insert: {
          id?: string
          name: string
          quantity: number
          cost_price: number
          selling_price: number
          created_at?: string
          created_by?: string | null
          category?: string
        }
        Update: {
          id?: string
          name?: string
          quantity?: number
          cost_price?: number
          selling_price?: number
          created_at?: string
          created_by?: string | null
          category?: string
        }
      }
      sales: {
        Row: {
          id: string
          sale_date: string
          total_amount: number
          payment_method: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          sale_date?: string
          total_amount?: number
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          sale_date?: string
          total_amount?: number
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          inventory_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
        Insert: {
          id?: string
          sale_id: string
          inventory_id: string
          quantity?: number
          unit_price?: number
          total_price?: number
        }
        Update: {
          id?: string
          sale_id?: string
          inventory_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
        }
      }
      financial_transactions: {
        Row: {
          id: string
          transaction_date: string
          description: string
          amount: number
          type: string
          category: string | null
          related_sale_id: string | null
          related_appointment_id: string | null
          payment_method: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          transaction_date?: string
          description: string
          amount: number
          type: string
          category?: string | null
          related_sale_id?: string | null
          related_appointment_id?: string | null
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          transaction_date?: string
          description?: string
          amount?: number
          type?: string
          category?: string | null
          related_sale_id?: string | null
          related_appointment_id?: string | null
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
    }
  }
}