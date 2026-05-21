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
  isSupabaseConfigured,
  getSession,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  onAuthStateChange,
  fetchProfile,
  upsertProfile,
  fetchAppProfiles,
  insertAppProfile,
  updateAppProfile,
  deleteAppProfile,
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
  const [profile, setProfile] = useState(null);

  // ─── App profiles ─────────────────────────────────────────────────────────
  const [appProfiles, setAppProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);

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
  watchHistoryRef.current = watchHistory;
  const [isSyncing, setIsSyncing] = useState(false);
  const progressSyncTimer = useRef(null);

  // ─── UI ───────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─── Video playback ───────────────────────────────────────────────────────
  const [currentVideo, setCurrentVideo] = useState(null);

  // ─── Derived ──────────────────────────────────────────────────────────────
  // Watch-history key: profile ID when a profile is active, else auth UID, else host_user
  const userKey = useMemo(() => {
    if (activeProfileId) return activeProfileId;
    if (authUser) return authUser.id;
    const user = users.find((u) => u.id === activeUserId);
    return user ? `${user.host}_${user.username}` : null;
  }, [activeProfileId, authUser, users, activeUserId]);

  const activeProfile = useMemo(
    () => appProfiles.find((p) => p.id === activeProfileId) ?? null,
    [appProfiles, activeProfileId]
  );

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
    setAppProfiles([]);
    setActiveProfileId(null);
    setUsers([]);
    setActiveUserId(null);
    setChannels([]);
    setWatchHistory([]);
    localStorage.removeItem("iptv_active_profile");
  }, []);

  // ─── Profile operations ───────────────────────────────────────────────────
  const addProfile = useCallback(
    async ({ name, avatar = "👤" }) => {
      let newProfile;

      if (authUser && isSupabaseConfigured()) {
        newProfile = await insertAppProfile(authUser.id, { name, avatar });
      }

      if (!newProfile) {
        // Local mode fallback
        newProfile = {
          id: `local_${Date.now()}`,
          name: name.trim(),
          avatar,
          created_at: new Date().toISOString(),
        };
      }

      setAppProfiles((prev) => {
        const updated = [...prev, newProfile];
        if (!isSupabaseConfigured()) {
          localStorage.setItem("iptv_profiles", JSON.stringify(updated));
        }
        return updated;
      });
      return newProfile;
    },
    [authUser]
  );

  const updateProfile = useCallback(async (profileId, { name, avatar }) => {
    if (isSupabaseConfigured()) {
      await updateAppProfile(profileId, { name, avatar });
    }
    setAppProfiles((prev) => {
      const updated = prev.map((p) =>
        p.id === profileId ? { ...p, name: name.trim(), avatar } : p
      );
      if (!isSupabaseConfigured()) {
        localStorage.setItem("iptv_profiles", JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const removeProfile = useCallback(
    async (profileId) => {
      if (isSupabaseConfigured()) {
        await deleteAppProfile(profileId);
      }
      setAppProfiles((prev) => {
        const updated = prev.filter((p) => p.id !== profileId);
        if (!isSupabaseConfigured()) {
          localStorage.setItem("iptv_profiles", JSON.stringify(updated));
        }
        return updated;
      });
      if (activeProfileId === profileId) {
        setActiveProfileId(null);
        setUsers([]);
        setActiveUserId(null);
        setChannels([]);
        setWatchHistory([]);
        localStorage.removeItem("iptv_active_profile");
      }
    },
    [activeProfileId]
  );

  const switchProfile = useCallback((profileId) => {
    setActiveProfileId(profileId);
    setUsers([]);
    setActiveUserId(null);
    setChannels([]);
    setWatchHistory([]);
    setContentType("live");
    localStorage.setItem("iptv_active_profile", profileId);
  }, []);

  // ─── IPTV account operations ──────────────────────────────────────────────
  const usersKey = activeProfileId ? `iptv_users_${activeProfileId}` : "iptv_users";

  const addUser = useCallback(
    async (formData) => {
      const tempId = Date.now().toString();
      const newUser = { id: tempId, ...formData };

      if (authUser && activeProfileId && isSupabaseConfigured()) {
        const remoteId = await insertIptvAccount(authUser.id, activeProfileId, formData);
        if (remoteId) newUser.id = remoteId;
      }

      setUsers((prev) => {
        const updated = [...prev, newUser];
        localStorage.setItem(usersKey, JSON.stringify({ users: updated, activeUserId }));
        return updated;
      });

      return newUser;
    },
    [authUser, activeProfileId, activeUserId, usersKey]
  );

  const updateUser = useCallback(
    async (id, formData) => {
      if (authUser && isSupabaseConfigured()) {
        await supabaseUpdateIptvAccount(id, formData);
      }
      setUsers((prev) => {
        const updated = prev.map((u) => (u.id === id ? { ...u, ...formData } : u));
        localStorage.setItem(usersKey, JSON.stringify({ users: updated, activeUserId }));
        return updated;
      });
    },
    [authUser, activeUserId, usersKey]
  );

  const removeUser = useCallback(
    async (id) => {
      if (authUser && isSupabaseConfigured()) {
        await supabaseDeleteIptvAccount(id);
      }
      setUsers((prev) => {
        const updated = prev.filter((u) => u.id !== id);
        localStorage.setItem(usersKey, JSON.stringify({ users: updated, activeUserId }));
        return updated;
      });
      if (activeUserId === id) setActiveUserId(null);
    },
    [authUser, activeUserId, usersKey]
  );

  const saveUsers = useCallback(
    (overrideUsers) => {
      const list = overrideUsers ?? users;
      localStorage.setItem(usersKey, JSON.stringify({ users: list, activeUserId }));
    },
    [users, activeUserId, usersKey]
  );

  // ─── Watch history functions ───────────────────────────────────────────────
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
    const existingIdx = prev.findIndex((h) => !shouldKeepHistoryItem(h, item));

    let entry;
    let newHistory;
    if (existingIdx === -1) {
      entry = {
        ...item,
        watchedAt: now,
        id: `${item.type}_${item.streamId || item.id}_${Date.now()}`,
        currentTime: item.currentTime || 0,
        duration: item.duration || 0,
      };
      newHistory = [entry, ...prev].slice(0, 20);
    } else {
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
    }

    setWatchHistory(newHistory);
    if (userKey) upsertHistoryEntry(userKey, entry);
  };

  const removeFromWatchHistory = (id) => {
    const newHistory = watchHistoryRef.current.filter((item) => item.id !== id);
    setWatchHistory(newHistory);
    if (userKey) deleteHistoryEntry(userKey, id);
  };

  const updateWatchProgress = useCallback(
    (streamId, type, currentTime, duration) => {
      const updated = watchHistoryRef.current.map((item) => {
        if (item.streamId === streamId && item.type === type) {
          return { ...item, currentTime, duration, watchedAt: new Date().toISOString() };
        }
        return item;
      });
      setWatchHistory(updated);

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

  // ─── Local storage helpers ────────────────────────────────────────────────
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

  const loadSavedUsers = (profileId) => {
    const key = profileId ? `iptv_users_${profileId}` : "iptv_users";
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUsers(parsed.users || []);
        setActiveUserId(parsed.activeUserId || null);
      } else {
        setUsers([]);
        setActiveUserId(null);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const syncActiveUser = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    iptvApi.setCredentials(user.host, user.username, user.password);
  };

  // ─── Effects ──────────────────────────────────────────────────────────────

  // Mount: session + auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Load local profiles
      try {
        const savedProfiles = localStorage.getItem("iptv_profiles");
        if (savedProfiles) {
          const profiles = JSON.parse(savedProfiles);
          setAppProfiles(profiles);
        }
      } catch { /* ignore */ }
      loadSavedChannels();
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

  // Auth user loaded → fetch auth profile + app profiles
  useEffect(() => {
    if (!authUser) return;

    const meta = authUser.user_metadata;
    if (meta?.username) {
      upsertProfile(authUser.id, meta.username, authUser.email).then(() =>
        fetchProfile(authUser.id).then((p) => setProfile(p))
      );
    } else {
      fetchProfile(authUser.id).then((p) => setProfile(p));
    }

    fetchAppProfiles(authUser.id).then((profiles) => {
      setAppProfiles(profiles);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Active profile changed → load that profile's IPTV accounts + watch history
  useEffect(() => {
    if (!activeProfileId) return;

    const loadProfileData = async () => {
      // Load IPTV accounts
      let accountList = [];

      if (isSupabaseConfigured()) {
        accountList = await fetchIptvAccounts(activeProfileId);
        if (accountList.length > 0) {
          setUsers(accountList);
        }
      }

      // localStorage fallback / local mode
      if (accountList.length === 0) {
        try {
          const raw = localStorage.getItem(`iptv_users_${activeProfileId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            accountList = parsed.users || [];
            if (accountList.length > 0) setUsers(accountList);
          }
        } catch { /* ignore */ }
      }

      if (accountList.length === 0) {
        setUsers([]);
        setActiveUserId(null);
        return;
      }

      // Restore preferred account
      let savedActiveId = null;
      try {
        const raw = localStorage.getItem(`iptv_users_${activeProfileId}`);
        if (raw) savedActiveId = JSON.parse(raw)?.activeUserId || null;
      } catch { /* ignore */ }

      const user =
        accountList.find((u) => u.id === savedActiveId) || accountList[0];
      setActiveUserId(user.id);
      iptvApi.setCredentials(user.host, user.username, user.password);

      // Auto-load channels
      loadSavedChannels();
      setIsLoading(true);
      try {
        const channelsData = await iptvApi.getLiveStreams();
        setChannels(
          channelsData.map((ch) => ({
            name: ch.name,
            url: iptvApi.buildStreamUrl("live", ch.stream_id, ch.stream_type || "ts"),
            id: ch.stream_id,
            stream_id: ch.stream_id,
          }))
        );
      } catch (err) {
        console.error("[AutoLoad] Failed to load channels:", err);
      } finally {
        setIsLoading(false);
      }

      // Preload categories in background so tab switches are instant
      iptvApi.getVODCategories().catch(() => {});
      iptvApi.getSeriesCategories().catch(() => {});
    };

    loadProfileData();

    // Load watch history for this profile
    if (isSupabaseConfigured()) {
      setIsSyncing(true);
      fetchRemoteHistory(activeProfileId)
        .then((remote) => setWatchHistory(remote))
        .finally(() => setIsSyncing(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId]);

  // Active user credentials sync
  useEffect(() => {
    if (activeUserId) {
      syncActiveUser();
      const saved = localStorage.getItem(usersKey);
      const parsed = saved ? JSON.parse(saved) : {};
      localStorage.setItem(usersKey, JSON.stringify({ ...parsed, activeUserId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  // Auto-save channels
  useEffect(() => {
    if (channels.length > 0) saveChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels]);

  // Filter channels by search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredChannels(channels);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredChannels(channels.filter((ch) => ch.name.toLowerCase().includes(query)));
    }
  }, [searchQuery, channels]);

  // ─── Context value ────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({
    // Auth
    authUser,
    authLoading,
    profile,
    signIn,
    signUp,
    signOut,

    // App profiles
    appProfiles,
    activeProfileId,
    activeProfile,
    switchProfile,
    addProfile,
    updateProfile,
    removeProfile,

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [authUser, authLoading, profile, appProfiles, activeProfileId, activeProfile,
    contentType, channels, filteredChannels, currentChannelIndex,
    users, activeUserId, watchHistory, isSyncing, currentVideo,
    searchQuery, isLoading, error,
    signIn, signUp, signOut, switchProfile, addProfile, updateProfile, removeProfile,
    addUser, updateUser, removeUser, saveUsers, saveChannels,
    addToWatchHistory, updateWatchProgress, removeFromWatchHistory, playVideo, closeVideo]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
