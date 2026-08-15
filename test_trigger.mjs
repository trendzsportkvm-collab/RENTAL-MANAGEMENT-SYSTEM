import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const content = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = content.match(/SUPABASE_SECRET_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data, error } = await supabase.rpc('get_triggers_dummy_call_fails'); 
  // Wait, RPC won't work unless I define it. 
  // Let me just test if double deduction is the cause by removing the manual deduction from `addRental` and `returnRental`.
}
