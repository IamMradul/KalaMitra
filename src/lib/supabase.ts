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
          upi_id: string | null
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
          upi_id?: string | null
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
          upi_id?: string | null
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
          product_story?: string | null
          product_type?: 'vertical' | 'horizontal' | null
            is_virtual?: boolean
            virtual_type?: string | null
            virtual_file_url?: string | null
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
          product_story?: string | null
          product_type?: 'vertical' | 'horizontal' | null
            is_virtual?: boolean
            virtual_type?: string | null
            virtual_file_url?: string | null
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
          product_story?: string | null
          product_type?: 'vertical' | 'horizontal' | null
            is_virtual?: boolean
            virtual_type?: string | null
            virtual_file_url?: string | null
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
      conversation_history: {
        Row: {
          id: string
          user_id: string | null
          session_id: string
          role: 'user' | 'assistant'
          message: string
          query_context: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id: string
          role: 'user' | 'assistant'
          message: string
          query_context?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string
          role?: 'user' | 'assistant'
          message?: string
          query_context?: Record<string, unknown> | null
          created_at?: string
        }
      }
      collaborations: {
        Row: {
          id: string
          initiator_id: string
          partner_id: string
          status: 'pending' | 'accepted' | 'rejected' | 'ended' | 'cancelled'
          message: string | null
          collaboration_name: string | null
          collaboration_description: string | null
          terms: string | null
          created_at: string
          updated_at: string
          accepted_at: string | null
          ended_at: string | null
        }
        Insert: {
          id?: string
          initiator_id: string
          partner_id: string
          status?: 'pending' | 'accepted' | 'rejected' | 'ended' | 'cancelled'
          message?: string | null
          collaboration_name?: string | null
          collaboration_description?: string | null
          terms?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          ended_at?: string | null
        }
        Update: {
          id?: string
          initiator_id?: string
          partner_id?: string
          status?: 'pending' | 'accepted' | 'rejected' | 'ended' | 'cancelled'
          message?: string | null
          collaboration_name?: string | null
          collaboration_description?: string | null
          terms?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          ended_at?: string | null
        }
      }
      collaboration_revenue_split: {
        Row: {
          collaboration_id: string
          initiator_percentage: number
          partner_percentage: number
          split_method: 'equal' | 'custom' | 'product_based'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          collaboration_id: string
          initiator_percentage?: number
          partner_percentage?: number
          split_method?: 'equal' | 'custom' | 'product_based'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          collaboration_id?: string
          initiator_percentage?: number
          partner_percentage?: number
          split_method?: 'equal' | 'custom' | 'product_based'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      collaborative_products: {
        Row: {
          id: string
          collaboration_id: string
          product_id: string
          primary_seller_id: string
          revenue_split_override: Record<string, unknown> | null
          contribution_details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          collaboration_id: string
          product_id: string
          primary_seller_id: string
          revenue_split_override?: Record<string, unknown> | null
          contribution_details?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          collaboration_id?: string
          product_id?: string
          primary_seller_id?: string
          revenue_split_override?: Record<string, unknown> | null
          contribution_details?: string | null
          created_at?: string
        }
      }
      collaboration_invitations: {
        Row: {
          id: string
          collaboration_id: string
          viewed_at: string | null
          responded_at: string | null
          response_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          collaboration_id: string
          viewed_at?: string | null
          responded_at?: string | null
          response_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          collaboration_id?: string
          viewed_at?: string | null
          responded_at?: string | null
          response_message?: string | null
          created_at?: string
        }
      }
      collaboration_activity: {
        Row: {
          id: string
          collaboration_id: string
          actor_id: string
          activity_type: 'created' | 'accepted' | 'rejected' | 'ended' | 'cancelled' | 
                        'product_added' | 'product_removed' | 'split_updated' | 'message_sent'
          activity_data: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          collaboration_id: string
          actor_id: string
          activity_type: 'created' | 'accepted' | 'rejected' | 'ended' | 'cancelled' | 
                        'product_added' | 'product_removed' | 'split_updated' | 'message_sent'
          activity_data?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          collaboration_id?: string
          actor_id?: string
          activity_type?: 'created' | 'accepted' | 'rejected' | 'ended' | 'cancelled' | 
                         'product_added' | 'product_removed' | 'split_updated' | 'message_sent'
          activity_data?: Record<string, unknown> | null
          created_at?: string
        }
      }
      revenue_split_proposals: {
        Row: {
          id: string
          collaborative_product_id: string
          collaboration_id: string
          proposed_by: string
          proposed_split: {
            initiator: number
            partner: number
          }
          reason: string | null
          status: 'pending' | 'approved' | 'rejected' | 'expired'
          responded_by: string | null
          responded_at: string | null
          created_at: string
          updated_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          collaborative_product_id: string
          collaboration_id: string
          proposed_by: string
          proposed_split: {
            initiator: number
            partner: number
          }
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'expired'
          responded_by?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          collaborative_product_id?: string
          collaboration_id?: string
          proposed_by?: string
          proposed_split?: {
            initiator: number
            partner: number
          }
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'expired'
          responded_by?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
          expires_at?: string
        }
      }
    }
  }
}
