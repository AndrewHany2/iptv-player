import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";
import "../styles/tvl.css";
import "./HistoryScreen.tv.css";

const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_ENTER = 13;
const KEY_BACK = new Set([27, 461, 10009, 8]);

export default function HistoryScreenTV({ navigation }) {
  const { users, activeUserId, playVideo, watchHistory, myList } = useApp();
  const [focus, setFocus] = useState(0);

  const focusRef = useRef(0);
  const itemsRef = useRef([]);
  const elRef = useRef(null);
  const navActiveRef = useRef(false);

  const focusNav = () => {
    navActiveRef.current = true;
    globalThis.dispatchEvent(new CustomEvent("tv-nav-focus"));
  };

  const user = users.find((u) => u.id === activeUserId);
  useEffect(() => {
    if (activeUserId && user)
      iptvApi.setCredentials(user.host, user.username, user.password);
  }, [activeUserId]);

  // Combine myList and watchHistory
  const allItems = [
    ...(myList || []).map((item) => ({ ...item, source: "myList" })),
    ...(watchHistory || []).map((item) => ({ ...item, source: "history" })),
  ].sort((a, b) => {
    // Sort myList items first, then by watchedAt for history items
    if (a.source === "myList" && b.source === "history") return -1;
    if (a.source === "history" && b.source === "myList") return 1;
    return new Date(b.watchedAt || 0) - new Date(a.watchedAt || 0);
  });

  useEffect(() => {
    itemsRef.current = allItems;
  }, [myList, watchHistory]);

  const navigateToDetail = (item) => {
    // Navigate to appropriate detail page based on content type
    if (item.type === "movie" || item.type === "movies") {
      // Navigate to Movies screen which will open the detail
      // Use getParent() to access the tab navigator
      const tabNavigator = navigation.getParent();
      if (tabNavigator) {
        tabNavigator.navigate("Movies", {
          openDetail: true,
          movieId: item.movieId || item.streamId,
          streamId: item.movieId || item.streamId,
          name: item.name,
          cover: item.cover || item.stream_icon,
          containerExtension:
            item.containerExtension || item.container_extension,
          currentTime: item.currentTime || 0,
          hasHistory: (item.currentTime || 0) > 0,
        });
      }
    } else if (item.type === "series") {
      // Navigate to Series screen which will open the detail
      // Use getParent() to access the tab navigator
      const tabNavigator = navigation.getParent();
      if (tabNavigator) {
        tabNavigator.navigate("Series", {
          openDetail: true,
          seriesId: item.seriesId || item.streamId,
          episodeId: item.episodeId,
          name: item.name,
          cover: item.cover || item.stream_icon,
          containerExtension:
            item.containerExtension || item.container_extension,
          currentTime: item.currentTime || 0,
          hasHistory: (item.currentTime || 0) > 0,
        });
      }
    } else if (item.type === "live") {
      // For live TV, play directly as there's no detail page
      const url = iptvApi.buildStreamUrl(
        "live",
        item.streamId,
        item.containerExtension || "ts",
      );
      playVideo({
        type: item.type,
        streamId: item.streamId,
        name: item.name,
        url,
        cover: item.cover,
        startTime: item.currentTime || 0,
      });
      navigation.navigate("VideoPlayer");
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (navActiveRef.current) return;
      const k = e.keyCode || e.which;
      const list = itemsRef.current;
      e.preventDefault();
      switch (k) {
        case KEY_UP: {
          if (focusRef.current === 0) {
            focusNav();
            break;
          }
          const n = focusRef.current - 1;
          focusRef.current = n;
          setFocus(n);
          break;
        }
        case KEY_DOWN: {
          const n = Math.min(list.length - 1, focusRef.current + 1);
          focusRef.current = n;
          setFocus(n);
          break;
        }
        case KEY_ENTER: {
          const item = list[focusRef.current];
          if (item) navigateToDetail(item);
          break;
        }
        default: {
          if (KEY_BACK.has(k)) {
            navigation.goBack?.();
          }
          break;
        }
      }
    };
    const onNavBlur = () => {
      navActiveRef.current = false;
    };
    document.addEventListener("keydown", onKey);
    globalThis.addEventListener("tv-nav-blur", onNavBlur);
    return () => {
      document.removeEventListener("keydown", onKey);
      globalThis.removeEventListener("tv-nav-blur", onNavBlur);
    };
  }, []);

  useEffect(() => {
    elRef.current?.scrollIntoView({ block: "nearest" });
  }, [focus]);

  if (!activeUserId) {
    return (
      <div className="tvl-screen">
        <div className="tvl-center">
          <p className="tvl-empty-msg">No IPTV Account</p>
          <button
            className="tvl-btn"
            onClick={() => navigation.navigate("Accounts")}
          >
            Add Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tvl-screen">
      <div className="tvl-topbar">
        <span className="tvl-topbar-title">My List & History</span>
      </div>
      {allItems.length === 0 ? (
        <div className="tvl-hist-empty">No items yet</div>
      ) : (
        <div className="tvl-scroll">
          <div className="tvl-hist-list">
            {allItems.map((item, i) => (
              <HistItem
                key={`${item.source}-${item.type}-${item.movieId || item.episodeId || item.streamId || item.id}-${i}`}
                item={item}
                isFocused={i === focus}
                elRef={i === focus ? elRef : null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistItem({ item, isFocused, elRef }) {
  const [err, setErr] = useState(false);
  const src = item.cover || null;
  const progress = item.currentTime || 0;
  const duration = item.duration || 0;
  const pct = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;

  const fmt = (s) => {
    if (!s) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const fmtDate = (ts) => {
    if (!ts) return "";
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 60) return m <= 1 ? "Just now" : `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  const typeIcon =
    item.type === "movie" ? "🎬" : item.type === "series" ? "📺" : "📡";

  return (
    <div
      ref={elRef}
      className={
        isFocused ? "tvl-hist-item tvl-hist-item--on" : "tvl-hist-item"
      }
    >
      <div className="tvl-hist-thumb">
        {src && !err ? (
          <img src={src} alt="" onError={() => setErr(true)} loading="lazy" />
        ) : (
          <div className="tvl-hist-ph">{typeIcon}</div>
        )}
        {pct > 0 && pct < 100 && (
          <div className="tvl-hist-bar" style={{ width: `${pct}%` }} />
        )}
      </div>
      <div className="tvl-hist-info">
        <div className="tvl-hist-title">{item.name}</div>
        <div className="tvl-hist-meta">
          <span className="tvl-hist-type">{item.type}</span>
          <span className="tvl-hist-date">{fmtDate(item.watchedAt)}</span>
        </div>
        {duration > 0 && (
          <div className="tvl-hist-time">
            {fmt(progress)} / {fmt(duration)}
          </div>
        )}
      </div>
      <div className="tvl-hist-action">
        {pct > 0 && pct < 100 ? "Resume" : "Play"}
      </div>
    </div>
  );
}
