-- Create removebg_keys table for managing remove.bg API keys
CREATE TABLE IF NOT EXISTS removebg_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by usage_count
CREATE INDEX IF NOT EXISTS idx_removebg_keys_usage_count ON removebg_keys(usage_count);

-- Add RLS (Row Level Security) policies
ALTER TABLE removebg_keys ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to manage API keys
CREATE POLICY "Service role can manage removebg keys" ON removebg_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Add product_type column to products table for AR orientation
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'vertical' CHECK (product_type IN ('vertical', 'horizontal'));

-- Create index for product_type queries
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
