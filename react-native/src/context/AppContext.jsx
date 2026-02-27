import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import iptvApi from '../services/iptvApi';
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
} from '../services/supabase';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  // ─── Auth state ───────────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured());
  const [profile, setProfile] = useState(null);

  // ─── Users (IPTV accounts) ────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);

  // ─── Live TV ──────────────────────────────────────────────────────────────
  const [channels, setChannels] = useState([]);

  // ─── Watch history ────────────────────────────────────────────────────────
  const [watchHistory, setWatchHistory] = useState([]);
  const watchHistoryRef = useRef([]);
  watchHistoryRef.current = watchHistory;
  const [isSyncing, setIsSyncing] = useState(false);
  const progressSyncTimer = useRef(null);

  // ─── UI ───────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─── Video playback ───────────────────────────────────────────────────────
  const [currentVideo, setCurrentVideo] = useState(null);

  // ─── Derived ──────────────────────────────────────────────────────────────
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
    await AsyncStorage.removeItem('iptv_users');
    await AsyncStorage.removeItem('iptv_channels');
    await AsyncStorage.removeItem('iptv_watch_history');
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
        AsyncStorage.setItem('iptv_users', JSON.stringify({ users: updated, activeUserId }));
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
        const updated = prev.map((u) => (u.id === id ? { ...u, ...formData } : u));
        AsyncStorage.setItem('iptv_users', JSON.stringify({ users: updated, activeUserId }));
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
        AsyncStorage.setItem('iptv_users', JSON.stringify({ users: updated, activeUserId }));
        return updated;
      });
      if (activeUserId === id) setActiveUserId(null);
    },
    [authUser, activeUserId]
  );

  const saveUsers = useCallback(
    (overrideUsers) => {
      const list = overrideUsers ?? users;
      AsyncStorage.setItem('iptv_users', JSON.stringify({ users: list, activeUserId }));
    },
    [users, activeUserId]
  );

  // ─── Watch history functions ───────────────────────────────────────────────
  const loadWatchHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem('iptv_watch_history');
      if (saved) setWatchHistory(JSON.parse(saved));
    } catch (err) {
      console.error('Error loading watch history:', err);
    }
  };

  const saveWatchHistory = (history) => {
    AsyncStorage.setItem('iptv_watch_history', JSON.stringify(history)).catch((err) =>
      console.error('Error saving watch history:', err)
    );
  };

  const shouldKeepHistoryItem = (historyItem, newItem) => {
    if (newItem.type === 'series' && historyItem.type === 'series') {
      if (newItem.seriesId && historyItem.seriesId)
        return historyItem.seriesId !== newItem.seriesId;
      if (newItem.seriesName && historyItem.seriesName)
        return historyItem.seriesName !== newItem.seriesName;
      return historyItem.streamId !== newItem.streamId;
    }
    return !(
      historyItem.type === newItem.type && historyItem.streamId === newItem.streamId
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
  const loadSavedUsers = async () => {
    try {
      const saved = await AsyncStorage.getItem('iptv_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUsers(parsed.users || []);
        setActiveUserId(parsed.activeUserId || null);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadSavedChannels = async () => {
    try {
      const saved = await AsyncStorage.getItem('iptv_channels');
      if (saved) setChannels(JSON.parse(saved));
    } catch (err) {
      console.error('Error loading channels:', err);
    }
  };

  const saveChannels = () => {
    AsyncStorage.setItem('iptv_channels', JSON.stringify(channels)).catch((err) =>
      console.error('Error saving channels:', err)
    );
  };

  const syncActiveUser = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    iptvApi.setCredentials(user.host, user.username, user.password);
  };

  // ─── Effects ──────────────────────────────────────────────────────────────

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
  }, []);

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

    fetchIptvAccounts(authUser.id).then(async (remoteAccounts) => {
      let savedActiveId = null;
      try {
        const raw = await AsyncStorage.getItem('iptv_users');
        if (raw) savedActiveId = JSON.parse(raw)?.activeUserId || null;
      } catch { /* ignore */ }

      let accountList = remoteAccounts;
      if (remoteAccounts.length > 0) {
        setUsers(remoteAccounts);
      } else {
        try {
          const raw = await AsyncStorage.getItem('iptv_users');
          if (raw) {
            const parsed = JSON.parse(raw);
            accountList = parsed.users || [];
            if (accountList.length > 0) setUsers(accountList);
          }
        } catch (err) {
          console.error('Error loading users from AsyncStorage:', err);
        }
      }

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
            url: iptvApi.buildStreamUrl('live', ch.stream_id, ch.stream_type || 'ts'),
            id: ch.stream_id,
          }))
        );
      } catch (err) {
        console.error('[AutoLoad] Failed to load channels:', err);
      } finally {
        setIsLoading(false);
      }
    });

    loadSavedChannels();

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
  }, [authUser?.id]);

  useEffect(() => {
    if (activeUserId) {
      syncActiveUser();
      AsyncStorage.getItem('iptv_users').then((saved) => {
        const parsed = saved ? JSON.parse(saved) : {};
        AsyncStorage.setItem('iptv_users', JSON.stringify({ ...parsed, activeUserId }));
      });
    }
  }, [activeUserId]);

  useEffect(() => {
    if (channels.length > 0) saveChannels();
  }, [channels]);

  // ─── Context value ────────────────────────────────────────────────────────
  const value = {
    // Auth
    authUser,
    authLoading,
    profile,
    signIn,
    signUp,
    signOut,

    // Live TV
    channels,
    setChannels,

    // Users (IPTV accounts)
    users,
    setUsers,
    activeUserId,
    setActiveUserId,
    saveUsers,
    addUser,
    updateUser,
    removeUser,

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
