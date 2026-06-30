import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[DB] FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  console.warn("[DB] WARNING: Supabase not configured. Using in-memory mock.");
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client && supabaseUrl && supabaseKey) {
    _client = createClient(supabaseUrl, supabaseKey);
  }
  if (!_client) {
    throw new Error("[DB] Supabase client not initialized");
  }
  return _client;
}

function getDb() {
  return {
    from(table: string) {
      return getClient().from(table);
    },
  };
}

export default getDb;
