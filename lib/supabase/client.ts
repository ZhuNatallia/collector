import { createClient } from '@supabase/supabase-js';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/** Browser client is only initialized when public project settings are supplied. */
export const supabase=url&&key?createClient(url,key):null;
