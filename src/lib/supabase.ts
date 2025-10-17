import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'buyer' | 'seller'
          bio: string | null
          profile_image: string | null
          store_description: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role: 'buyer' | 'seller'
          bio?: string | null
          profile_image?: string | null
          store_description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'buyer' | 'seller'
          bio?: string | null
          profile_image?: string | null
          store_description?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          seller_id: string
          title: string
          category: string
          description: string
          price: number
          image_url: string
          created_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          category: string
          description: string
          price: number
          image_url: string
          created_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          title?: string
          category?: string
          description?: string
          price?: number
          image_url?: string
          created_at?: string
        }
      }
      auctions: {
        Row: {
          id: string
          product_id: string
          seller_id: string
          starting_price: number
          starts_at: string | null
          ends_at: string | null
          status: 'scheduled' | 'running' | 'completed' | 'cancelled'
          winner_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          seller_id: string
          starting_price: number
          starts_at?: string | null
          ends_at?: string | null
          status?: 'scheduled' | 'running' | 'completed' | 'cancelled'
          winner_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          seller_id?: string
          starting_price?: number
          starts_at?: string | null
          ends_at?: string | null
          status?: 'scheduled' | 'running' | 'completed' | 'cancelled'
          winner_id?: string | null
          created_at?: string
        }
      }
      bids: {
        Row: {
          id: string
          auction_id: string
          bidder_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          auction_id: string
          bidder_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          auction_id?: string
          bidder_id?: string
          amount?: number
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          read: boolean
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          read?: boolean
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string
          read?: boolean
          metadata?: Record<string, unknown>
          created_at?: string
        }
      }
      cart: {
        Row: {
          id: string
          buyer_id: string
          product_id: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          buyer_id: string
          product_id: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          buyer_id?: string
          product_id?: string
          quantity?: number
          created_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          favorite_categories: Array<{ category: string; count: number }>
          top_viewed_products: Array<{ product_id: string; count: number }>
          common_search_terms: Array<{ term: string; count: number }>
          total_views: number
          total_searches: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          favorite_categories?: Array<{ category: string; count: number }>
          top_viewed_products?: Array<{ product_id: string; count: number }>
          common_search_terms?: Array<{ term: string; count: number }>
          total_views?: number
          total_searches?: number
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          favorite_categories?: Array<{ category: string; count: number }>
          top_viewed_products?: Array<{ product_id: string; count: number }>
          common_search_terms?: Array<{ term: string; count: number }>
          total_views?: number
          total_searches?: number
          last_updated?: string
          created_at?: string
        }
      }
    }
  }
}
