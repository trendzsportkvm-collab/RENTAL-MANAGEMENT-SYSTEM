import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching simple products...");
  
  // Get simple products
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('*')
    .eq('type', 'simple');
    
  if (prodErr) {
    console.error("Error fetching products:", prodErr);
    process.exit(1);
  }
  
  if (!products || products.length === 0) {
    console.log("No simple products found to migrate.");
    process.exit(0);
  }
  
  console.log(`Found ${products.length} simple products. Migrating to variable...`);
  
  for (const product of products) {
    // 1. Create a default variation for the product
    const { data: variation, error: varErr } = await supabase
      .from('product_variations')
      .insert({
        product_id: product.id,
        name: 'Standard',
        sku: product.sku + '-STD',
        daily_rate: product.daily_rate || 0,
        is_enabled: true
      })
      .select()
      .single();
      
    if (varErr) {
      console.error(`Error creating variation for product ${product.id}:`, varErr);
      continue;
    }
    
    // 2. Move stock from product to variation
    const { data: stocks, error: stockErr } = await supabase
      .from('product_stock')
      .select('*')
      .eq('product_id', product.id);
      
    if (!stockErr && stocks) {
      for (const stock of stocks) {
        await supabase
          .from('product_stock')
          .update({
            product_id: null,
            variation_id: variation.id
          })
          .eq('id', stock.id);
      }
    }
    
    // 3. Move rental items from product to variation
    const { data: items, error: itemErr } = await supabase
      .from('rental_items')
      .select('*')
      .eq('product_id', product.id);
      
    if (!itemErr && items) {
      for (const item of items) {
        await supabase
          .from('rental_items')
          .update({
            product_id: null,
            variation_id: variation.id
          })
          .eq('id', item.id);
      }
    }
    
    // 4. Update the product to be a variable product
    await supabase
      .from('products')
      .update({ type: 'variable' })
      .eq('id', product.id);
      
    console.log(`Migrated product ${product.id}`);
  }
  
  console.log("Migration complete!");
}

run();
