import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export const isSupabaseConfigured = () => !!supabase;

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export function onAuthStateChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

// ─── IPTV Accounts ───────────────────────────────────────────────────────────

export async function fetchIptvAccounts(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("iptv_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Supabase] fetchIptvAccounts:", error.message);
    return [];
  }
  // Map Supabase rows to the local user object shape
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

  if (error) {
    console.error("[Supabase] insertIptvAccount:", error.message);
    return null;
  }
  return data.id; // return the generated UUID
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

// ─── Watch History ────────────────────────────────────────────────────────────

export async function fetchRemoteHistory(userKey) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("watch_history")
    .select("entry")
    .eq("user_key", userKey)
    .order("watched_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[Supabase] fetchRemoteHistory:", error.message);
    return [];
  }
  return data.map((row) => row.entry);
}

export async function upsertHistoryEntry(userKey, entry) {
  if (!supabase) return;
  const { error } = await supabase.from("watch_history").upsert(
    {
      user_key: userKey,
      entry_id: entry.id,
      entry,
      watched_at: entry.watchedAt,
    },
    { onConflict: "user_key,entry_id" }
  );
  if (error) console.error("[Supabase] upsertHistoryEntry:", error.message);
}

export async function deleteHistoryEntry(userKey, entryId) {
  if (!supabase) return;
  const { error } = await supabase
    .from("watch_history")
    .delete()
    .eq("user_key", userKey)
    .eq("entry_id", entryId);
  if (error) console.error("[Supabase] deleteHistoryEntry:", error.message);
}

export function mergeHistories(local, remote) {
  const map = new Map();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing || new Date(item.watchedAt) > new Date(existing.watchedAt)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
    .slice(0, 20);
}
