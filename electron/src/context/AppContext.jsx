import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import iptvApi from "../services/iptvApi";
import {
  fetchRemoteHistory,
  upsertHistoryEntry,
  deleteHistoryEntry,
  mergeHistories,
  isSupabaseConfigured,
  getSession,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  onAuthStateChange,
  fetchProfile,
  upsertProfile,
  fetchIptvAccounts,
  insertIptvAccount,
  updateIptvAccount as supabaseUpdateIptvAccount,
  deleteIptvAccount as supabaseDeleteIptvAccount,
} from "../services/supabase";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

export const AppProvider = ({ children }) => {
  // ─── Auth state ───────────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured());
  const [profile, setProfile] = useState(null); // { username, email }

  // ─── Content type ─────────────────────────────────────────────────────────
  const [contentType, setContentType] = useState("live");

  // ─── Live TV ──────────────────────────────────────────────────────────────
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [currentChannelIndex, setCurrentChannelIndex] = useState(-1);

  // ─── Users (IPTV accounts) ────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);

  // ─── VOD ──────────────────────────────────────────────────────────────────
  const [movieCategories, setMovieCategories] = useState([]);
  const [movies, setMovies] = useState([]);
  const [currentMovieCategory, setCurrentMovieCategory] = useState(null);

  const [seriesCategories, setSeriesCategories] = useState([]);
  const [series, setSeries] = useState([]);
  const [currentSeriesCategory, setCurrentSeriesCategory] = useState(null);
  const [currentSeries, setCurrentSeries] = useState(null);
  const [seriesSeasons, setSeriesSeasons] = useState({});

  // ─── Watch history ────────────────────────────────────────────────────────
  const [watchHistory, setWatchHistory] = useState([]);
  const watchHistoryRef = useRef([]);
  watchHistoryRef.current = watchHistory; // always latest, no stale closures
  const [isSyncing, setIsSyncing] = useState(false);
  const progressSyncTimer = useRef(null);

  // ─── UI ───────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─── Video playback ───────────────────────────────────────────────────────
  const [currentVideo, setCurrentVideo] = useState(null);

  // ─── Derived ──────────────────────────────────────────────────────────────
  // userKey for watch history: auth UUID when logged in, fallback to host_user
  const userKey = useMemo(() => {
    if (authUser) return authUser.id;
    const user = users.find((u) => u.id === activeUserId);
    return user ? `${user.host}_${user.username}` : null;
  }, [authUser, users, activeUserId]);

  // ─── Auth functions ───────────────────────────────────────────────────────
  const signIn = useCallback(async (username, password) => {
    return await supabaseSignIn(username, password);
  }, []);

  const signUp = useCallback(async (username, password, email) => {
    return await supabaseSignUp(username, password, email);
  }, []);

  const signOut = useCallback(async () => {
    await supabaseSignOut();
    setAuthUser(null);
    setProfile(null);
    setUsers([]);
    setActiveUserId(null);
    setChannels([]);
    setWatchHistory([]);
    localStorage.removeItem("iptv_users");
    localStorage.removeItem("iptv_channels");
    localStorage.removeItem("iptv_watch_history");
  }, []);

  // ─── IPTV account operations ──────────────────────────────────────────────
  const addUser = useCallback(
    async (formData) => {
      const tempId = Date.now().toString();
      const newUser = { id: tempId, ...formData };

      if (authUser && isSupabaseConfigured()) {
        const remoteId = await insertIptvAccount(authUser.id, formData);
        if (remoteId) newUser.id = remoteId;
      }

      setUsers((prev) => {
        const updated = [...prev, newUser];
        localStorage.setItem(
          "iptv_users",
          JSON.stringify({ users: updated, activeUserId })
        );
        return updated;
      });

      return newUser;
    },
    [authUser, activeUserId]
  );

  const updateUser = useCallback(
    async (id, formData) => {
      if (authUser && isSupabaseConfigured()) {
        await supabaseUpdateIptvAccount(id, formData);
      }
      setUsers((prev) => {
        const updated = prev.map((u) =>
          u.id === id ? { ...u, ...formData } : u
        );
        localStorage.setItem(
          "iptv_users",
          JSON.stringify({ users: updated, activeUserId })
        );
        return updated;
      });
    },
    [authUser, activeUserId]
  );

  const removeUser = useCallback(
    async (id) => {
      if (authUser && isSupabaseConfigured()) {
        await supabaseDeleteIptvAccount(id);
      }
      setUsers((prev) => {
        const updated = prev.filter((u) => u.id !== id);
        localStorage.setItem(
          "iptv_users",
          JSON.stringify({ users: updated, activeUserId })
        );
        return updated;
      });
      if (activeUserId === id) setActiveUserId(null);
    },
    [authUser, activeUserId]
  );

  const saveUsers = useCallback(
    (overrideUsers) => {
      const list = overrideUsers ?? users;
      localStorage.setItem(
        "iptv_users",
        JSON.stringify({ users: list, activeUserId })
      );
    },
    [users, activeUserId]
  );

  // ─── Watch history functions ───────────────────────────────────────────────
  const loadWatchHistory = () => {
    try {
      const saved = localStorage.getItem("iptv_watch_history");
      if (saved) setWatchHistory(JSON.parse(saved));
    } catch (err) {
      console.error("Error loading watch history:", err);
    }
  };

  const saveWatchHistory = (history) => {
    try {
      localStorage.setItem("iptv_watch_history", JSON.stringify(history));
    } catch (err) {
      console.error("Error saving watch history:", err);
    }
  };

  const shouldKeepHistoryItem = (historyItem, newItem) => {
    if (newItem.type === "series" && historyItem.type === "series") {
      if (newItem.seriesId && historyItem.seriesId)
        return historyItem.seriesId !== newItem.seriesId;
      if (newItem.seriesName && historyItem.seriesName)
        return historyItem.seriesName !== newItem.seriesName;
      return historyItem.streamId !== newItem.streamId;
    }
    return !(
      historyItem.type === newItem.type &&
      historyItem.streamId === newItem.streamId
    );
  };

  const addToWatchHistory = (item) => {
    const now = new Date().toISOString();
    const prev = watchHistoryRef.current;
    // Find existing entry for same series / movie
    const existingIdx = prev.findIndex((h) => !shouldKeepHistoryItem(h, item));

    let entry;
    let newHistory;
    if (existingIdx !== -1) {
      // Update in-place: preserve id, update episode info, reset progress to startTime
      entry = {
        ...prev[existingIdx],
        ...item,
        id: prev[existingIdx].id,
        watchedAt: now,
        currentTime: item.currentTime || 0,
        duration: item.duration || 0,
      };
      const rest = prev.filter((_, i) => i !== existingIdx);
      newHistory = [entry, ...rest].slice(0, 20);
    } else {
      entry = {
        ...item,
        watchedAt: now,
        id: `${item.type}_${item.streamId || item.id}_${Date.now()}`,
        currentTime: item.currentTime || 0,
        duration: item.duration || 0,
      };
      newHistory = [entry, ...prev].slice(0, 20);
    }

    setWatchHistory(newHistory);
    saveWatchHistory(newHistory);
    if (userKey) upsertHistoryEntry(userKey, entry);
  };

  const removeFromWatchHistory = (id) => {
    const newHistory = watchHistoryRef.current.filter((item) => item.id !== id);
    setWatchHistory(newHistory);
    saveWatchHistory(newHistory);
    if (userKey) deleteHistoryEntry(userKey, id);
  };

  const updateWatchProgress = useCallback(
    (streamId, type, currentTime, duration) => {
      // Read from ref so we always have the latest history regardless of when
      // this callback was captured (avoids stale-closure silent no-ops)
      const updated = watchHistoryRef.current.map((item) => {
        if (item.streamId === streamId && item.type === type) {
          return { ...item, currentTime, duration, watchedAt: new Date().toISOString() };
        }
        return item;
      });
      setWatchHistory(updated);
      saveWatchHistory(updated);

      if (userKey) {
        clearTimeout(progressSyncTimer.current);
        const entry = updated.find(
          (item) => item.streamId === streamId && item.type === type
        );
        progressSyncTimer.current = setTimeout(() => {
          if (entry) upsertHistoryEntry(userKey, entry);
        }, 5000);
      }
    },
    [userKey]
  );

  // ─── Video playback ───────────────────────────────────────────────────────
  const playVideo = (video) => setCurrentVideo(video);
  const closeVideo = () => setCurrentVideo(null);

  // ─── Local storage loaders (non-auth mode) ────────────────────────────────
  const loadSavedUsers = () => {
    try {
      const saved = localStorage.getItem("iptv_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUsers(parsed.users || []);
        setActiveUserId(parsed.activeUserId || null);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const loadSavedChannels = () => {
    try {
      const saved = localStorage.getItem("iptv_channels");
      if (saved) setChannels(JSON.parse(saved));
    } catch (err) {
      console.error("Error loading channels:", err);
    }
  };

  const saveChannels = () => {
    try {
      localStorage.setItem("iptv_channels", JSON.stringify(channels));
    } catch (err) {
      console.error("Error saving channels:", err);
    }
  };

  const syncActiveUser = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    iptvApi.setCredentials(user.host, user.username, user.password);
  };

  // ─── Effects ──────────────────────────────────────────────────────────────

  // On mount: check Supabase session, subscribe to auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      loadSavedUsers();
      loadSavedChannels();
      loadWatchHistory();
      return;
    }

    getSession().then((session) => {
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const unsubscribe = onAuthStateChange((user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When auth user changes: load profile + IPTV accounts + watch history
  useEffect(() => {
    if (!authUser) return;

    // Ensure profile row exists (created here after session is established,
    // so auth.uid() is valid and RLS passes)
    const meta = authUser.user_metadata;
    if (meta?.username) {
      upsertProfile(authUser.id, meta.username, authUser.email).then(() =>
        fetchProfile(authUser.id).then((p) => setProfile(p))
      );
    } else {
      fetchProfile(authUser.id).then((p) => setProfile(p));
    }

    // Load IPTV accounts then auto-connect to preferred or first account
    fetchIptvAccounts(authUser.id).then(async (remoteAccounts) => {
      // Resolve preferred active user from localStorage
      let savedActiveId = null;
      try {
        const raw = localStorage.getItem("iptv_users");
        if (raw) savedActiveId = JSON.parse(raw)?.activeUserId || null;
      } catch { /* ignore */ }

      // Determine account list — Supabase first, localStorage fallback
      let accountList = remoteAccounts;
      if (remoteAccounts.length > 0) {
        setUsers(remoteAccounts);
      } else {
        try {
          const raw = localStorage.getItem("iptv_users");
          if (raw) {
            const parsed = JSON.parse(raw);
            accountList = parsed.users || [];
            if (accountList.length > 0) setUsers(accountList);
          }
        } catch (err) {
          console.error("Error loading users from localStorage:", err);
        }
      }

      // Auto-load channels from preferred or first account
      if (accountList.length === 0) return;
      const user = accountList.find((u) => u.id === savedActiveId) || accountList[0];
      setActiveUserId(user.id);
      iptvApi.setCredentials(user.host, user.username, user.password);
      setIsLoading(true);
      try {
        const channelsData = await iptvApi.getLiveStreams();
        setChannels(
          channelsData.map((ch) => ({
            name: ch.name,
            url: iptvApi.buildStreamUrl("live", ch.stream_id, ch.stream_type || "ts"),
            id: ch.stream_id,
          }))
        );
      } catch (err) {
        console.error("[AutoLoad] Failed to load channels:", err);
      } finally {
        setIsLoading(false);
      }
    });

    // Load local channels cache while fresh fetch is in progress
    loadSavedChannels();

    // Load and merge watch history
    loadWatchHistory();
    setIsSyncing(true);
    fetchRemoteHistory(authUser.id)
      .then((remote) => {
        setWatchHistory((local) => {
          const merged = mergeHistories(local, remote);
          saveWatchHistory(merged);
          return merged;
        });
      })
      .finally(() => setIsSyncing(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Auto-sync active user credentials when selection changes
  useEffect(() => {
    if (activeUserId) {
      syncActiveUser();
      // Persist active selection locally
      const saved = localStorage.getItem("iptv_users");
      const parsed = saved ? JSON.parse(saved) : {};
      localStorage.setItem(
        "iptv_users",
        JSON.stringify({ ...parsed, activeUserId })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  // Auto-save channels to localStorage
  useEffect(() => {
    if (channels.length > 0) saveChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels]);

  // Filter channels based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredChannels(channels);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredChannels(
        channels.filter((ch) => ch.name.toLowerCase().includes(query))
      );
    }
  }, [searchQuery, channels]);

  // ─── Context value ────────────────────────────────────────────────────────
  const value = {
    // Auth
    authUser,
    authLoading,
    profile,
    signIn,
    signUp,
    signOut,

    // Content type
    contentType,
    setContentType,

    // Live TV
    channels,
    setChannels,
    filteredChannels,
    currentChannelIndex,
    setCurrentChannelIndex,

    // Users (IPTV accounts)
    users,
    setUsers,
    activeUserId,
    setActiveUserId,
    saveUsers,
    addUser,
    updateUser,
    removeUser,

    // VOD
    movieCategories,
    setMovieCategories,
    movies,
    setMovies,
    currentMovieCategory,
    setCurrentMovieCategory,
    seriesCategories,
    setSeriesCategories,
    series,
    setSeries,
    currentSeriesCategory,
    setCurrentSeriesCategory,
    currentSeries,
    setCurrentSeries,
    seriesSeasons,
    setSeriesSeasons,

    // Watch History
    watchHistory,
    addToWatchHistory,
    updateWatchProgress,
    removeFromWatchHistory,
    isSyncing,

    // Video Playback
    currentVideo,
    playVideo,
    closeVideo,

    // UI
    searchQuery,
    setSearchQuery,
    isLoading,
    setIsLoading,
    error,
    setError,

    // Actions
    saveChannels,
    loadSavedUsers,
    loadSavedChannels,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
