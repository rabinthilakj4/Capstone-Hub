import { createClient } from '@supabase/supabase-js';

const meta = import.meta as any;
const supabaseUrl = meta.env?.VITE_SUPABASE_URL || 'https://wazphgdwvbzbjtipiixf.supabase.co';
// Provide fallback anon key structure to prevent top-level module load crash if env var is missing
const supabaseAnonKey =
  meta.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhenBoZ2R3dmJ6Ymp0aXBpaXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey.trim() || 'placeholder_key');
