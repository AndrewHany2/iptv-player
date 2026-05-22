import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseApi } from "@iptv/shared";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const {
  isSupabaseConfigured,
  getSession,
  signUp,
  upsertProfile,
  signIn,
  signOut,
  onAuthStateChange,
  fetchProfile,
  fetchRemoteHistory,
  upsertHistoryEntry,
  deleteHistoryEntry,
  mergeHistories,
} = createSupabaseApi(supabase);

// ─── IPTV Accounts (scoped to user_id) ───────────────────────────────────────

export async function fetchIptvAccounts(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("iptv_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) { console.error("[Supabase] fetchIptvAccounts:", error.message); return []; }
  return data.map((row) => ({
    id: row.id,
    nickname: row.nickname || "",
    host: row.host,
    username: row.username,
    password: row.password,
  }));
}

export async function insertIptvAccount(userId, account) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("iptv_accounts")
    .insert({
      user_id: userId,
      nickname: account.nickname || null,
      host: account.host,
      username: account.username,
      password: account.password,
    })
    .select()
    .single();
  if (error) { console.error("[Supabase] insertIptvAccount:", error.message); return null; }
  return data.id;
}

export async function updateIptvAccount(accountId, account) {
  if (!supabase) return;
  const { error } = await supabase
    .from("iptv_accounts")
    .update({
      nickname: account.nickname || null,
      host: account.host,
      username: account.username,
      password: account.password,
    })
    .eq("id", accountId);
  if (error) console.error("[Supabase] updateIptvAccount:", error.message);
}

export async function deleteIptvAccount(accountId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("iptv_accounts")
    .delete()
    .eq("id", accountId);
  if (error) console.error("[Supabase] deleteIptvAccount:", error.message);
}
