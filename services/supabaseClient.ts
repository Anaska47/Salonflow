
import { createClient } from '@supabase/supabase-js';

const meta = (typeof import.meta !== 'undefined') ? import.meta : { env: {} };
const metaEnv = (meta as any).env || {};

const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Éviter le crash à l'initialisation si les variables sont absentes
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

