import { createClient } from "@supabase/supabase-js";
import { createSupabaseApi } from "@iptv/shared";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
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

// ─── App Profiles (per-user named profiles, each with own IPTV accounts + history) ───

export async function fetchAppProfiles(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("app_profiles")
    .select("id, name, avatar, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) { console.error("[Supabase] fetchAppProfiles:", error.message); return []; }
  return data;
}

export async function insertAppProfile(userId, { name, avatar = "👤" }) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("app_profiles")
    .insert({ user_id: userId, name: name.trim(), avatar })
    .select()
    .single();
  if (error) { console.error("[Supabase] insertAppProfile:", error.message); return null; }
  return data;
}

export async function updateAppProfile(profileId, { name, avatar }) {
  if (!supabase) return;
  const { error } = await supabase
    .from("app_profiles")
    .update({ name: name.trim(), avatar })
    .eq("id", profileId);
  if (error) console.error("[Supabase] updateAppProfile:", error.message);
}

export async function deleteAppProfile(profileId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("app_profiles")
    .delete()
    .eq("id", profileId);
  if (error) console.error("[Supabase] deleteAppProfile:", error.message);
}

// ─── IPTV Accounts (scoped to a profile) ────────────────────────────────────

export async function fetchIptvAccounts(profileId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("iptv_accounts")
    .select("*")
    .eq("profile_id", profileId)
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

export async function insertIptvAccount(userId, profileId, account) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("iptv_accounts")
    .insert({
      user_id: userId,
      profile_id: profileId,
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
