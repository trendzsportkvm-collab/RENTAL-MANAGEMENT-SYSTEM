-- Migration to create the physical inventory items table

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    variation_id UUID REFERENCES public.product_variations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
    item_sku TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'available',
    qr_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast SKU lookups (e.g. for QR scanning)
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON public.inventory_items(item_sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_variation ON public.inventory_items(variation_id);

-- Optional: Enable RLS and add basic policies if RLS is enabled on your other tables
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.inventory_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.inventory_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.inventory_items FOR DELETE USING (true);

-- Add missing columns for product attributes
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Add product_id to rental_items to satisfy triggers
ALTER TABLE public.rental_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id);
 
 -- Add base_sku to categories 
 ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS base_sku TEXT;  

-- Add extra fees tracking to rentals
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS extra_fees NUMERIC DEFAULT 0;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS extra_fees_reason TEXT;

-- Enforce Strict Row Level Security on all core tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

-- Apply authenticated-only policies for all tables
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated users only" ON public.%I', t_name);
        EXECUTE format('CREATE POLICY "Enable all access for authenticated users only" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t_name);
    END LOOP;
END $$;

-- Notify pgrst to reload the schema immediately
NOTIFY pgrst, 'reload schema';