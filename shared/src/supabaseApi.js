export function createSupabaseApi(supabase) {
  const api = {
    isSupabaseConfigured: () => !!supabase,

    async getSession() {
      if (!supabase) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },

    async signUp(username, password, email) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (existing) throw new Error("Username is already taken.");

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: { data: { username: username.toLowerCase() } },
      });
      if (error) {
        if (error.message?.toLowerCase().includes("rate limit")) {
          throw new Error("Too many sign-up attempts. Please wait a few minutes and try again.");
        }
        throw new Error(error.message);
      }

      if (data.session && data.user) {
        await api.upsertProfile(data.user.id, username.toLowerCase(), email.toLowerCase());
      }

      return data.user;
    },

    async upsertProfile(userId, username, email) {
      if (!supabase) return;
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, username, email }, { onConflict: "user_id" });
      if (error) console.error("[Supabase] upsertProfile:", error.message);
    },

    async signIn(usernameOrEmail, password) {
      let email;

      if (usernameOrEmail.includes("@")) {
        email = usernameOrEmail.toLowerCase();
      } else {
        const { data: profileRow, error: lookupError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", usernameOrEmail.toLowerCase())
          .maybeSingle();

        if (lookupError) throw new Error("Could not look up username. Please try again.");
        if (!profileRow?.email) {
          throw new Error("Username not found. Please sign in with your email address instead.");
        }
        email = profileRow.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.code === "email_not_confirmed") {
          throw new Error("Your email is not confirmed. Please check your inbox and confirm your account.");
        }
        if (
          error.message?.toLowerCase().includes("invalid login credentials") ||
          error.code === "invalid_credentials"
        ) {
          throw new Error("Invalid email or password.");
        }
        throw new Error(error.message);
      }

      if (data.user) {
        const meta = data.user.user_metadata;
        if (meta?.username) {
          await api.upsertProfile(data.user.id, meta.username, data.user.email);
        }
      }

      return data.user;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },

    onAuthStateChange(callback) {
      if (!supabase) return () => {};
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
      });
      return () => data.subscription.unsubscribe();
    },

    async fetchProfile(userId) {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("username, email")
        .eq("user_id", userId)
        .single();
      if (error) return null;
      return data;
    },

    async fetchRemoteHistory(userKey) {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("watch_history")
        .select("entry")
        .eq("user_key", userKey)
        .order("watched_at", { ascending: false })
        .limit(50);
      if (error) { console.error("[Supabase] fetchRemoteHistory:", error.message); return []; }
      return data.map((row) => row.entry);
    },

    async upsertHistoryEntry(userKey, entry) {
      if (!supabase) return;
      const { error } = await supabase.from("watch_history").upsert(
        { user_key: userKey, entry_id: entry.id, entry, watched_at: entry.watchedAt },
        { onConflict: "user_key,entry_id" },
      );
      if (error) console.error("[Supabase] upsertHistoryEntry:", error.message);
    },

    async deleteHistoryEntry(userKey, entryId) {
      if (!supabase) return;
      const { error } = await supabase
        .from("watch_history")
        .delete()
        .eq("user_key", userKey)
        .eq("entry_id", entryId);
      if (error) console.error("[Supabase] deleteHistoryEntry:", error.message);
    },

    mergeHistories(local, remote) {
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
    },
  };

  return api;
}
