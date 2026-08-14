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
