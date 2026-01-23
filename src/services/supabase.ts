
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Fail gracefully instead of crashing the entire app
if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Supabase credentials missing. Intelligence features will be disabled.');
}

// Create client or a minimal mock that won't crash import
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');
