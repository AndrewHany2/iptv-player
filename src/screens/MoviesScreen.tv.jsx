import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";
import "../styles/tvl.css";
import "./MoviesScreen.tv.css";

const CAT_COLS = 4;
const MOV_COLS = 6;
const MOV_PAGE = 24;

const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_ENTER = 13;
const KEY_BACK = new Set([27, 461, 10009, 8]);

const getTrailerUrl = (t) => {
  if (!t) return null;
  const m = t.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  if (/^[A-Za-z0-9_-]{11}$/.test(t.trim()))
    return `https://www.youtube-nocookie.com/embed/${t.trim()}`;
  return null;
};

export default function MoviesScreenTV({ navigation, route }) {
  const {
    users, activeUserId, playVideo, watchHistory,
    isInMyList, addToMyList, removeFromMyList,
    currentVideo,
  } = useApp();
  const currentVideoRef = useRef(null);
  useEffect(() => { currentVideoRef.current = currentVideo; }, [currentVideo]);

  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState([]);
  const [catFocus, setCatFocus] = useState(0);
  const [page, setPage] = useState(null);
  const [detail, setDetail] = useState(null);

  const catsRef = useRef([]);
  const catFocusRef = useRef(0);
  const pageRef = useRef(null);
  const detailRef = useRef(null);
  const allItemsRef = useRef(new Map());
  const catElRef = useRef(null);
  const movElRef = useRef(null);
  const btnElRef = useRef(null);
  const navActiveRef = useRef(false);

  const focusNav = () => {
    navActiveRef.current = true;
    globalThis.dispatchEvent(new CustomEvent("tv-nav-focus"));
  };

  useEffect(() => {
    catsRef.current = cats;
  }, [cats]);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    detailRef.current = detail;
  }, [detail]);

  useEffect(() => {
    if (activeUserId) loadCats();
  }, [activeUserId]);

  // Handle navigation from history - open detail if params provided
  useEffect(() => {
    if (route?.params?.openDetail && route?.params?.streamId) {
      const streamId = route.params.streamId;
      const hasHistory = route.params.hasHistory || false;
      // Create a minimal item object to open detail
      const item = {
        stream_id: streamId,
        streamId: streamId,
        name: route.params.name || "Movie",
        stream_icon: route.params.cover || null,
        cover: route.params.cover || null,
        container_extension: route.params.containerExtension || "mp4",
      };
      // Small delay to ensure screen is mounted
      setTimeout(() => {
        openDetail(item, hasHistory);
        // Clear the params to prevent reopening on re-render
        navigation.setParams({ openDetail: false });
      }, 100);
    }
  }, [route?.params?.openDetail]);

  const loadCats = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    setLoading(true);
    allItemsRef.current.clear();
    try {
      iptvApi.setCredentials(user.host, user.username, user.password);
      const raw = await iptvApi.getVODCategories();
      if (!raw?.length) return;
      const list = raw.map((c) => ({
        id: c.category_id,
        name: c.category_name,
      }));
      setCats(list);
      catsRef.current = list;
    } catch (e) {
      console.error("MoviesScreenTV:", e);
    } finally {
      setLoading(false);
    }
  };

  const openCat = async (cat) => {
    const next = {
      catId: cat.id,
      name: cat.name,
      items: null,
      display: MOV_PAGE,
      focus: 0,
    };
    setPage(next);
    pageRef.current = next;
    try {
      let all = allItemsRef.current.get(cat.id);
      if (!all) {
        all = (await iptvApi.getVODStreams(cat.id)) ?? [];
        allItemsRef.current.set(cat.id, all);
      }
      const updated = { ...next, items: all };
      setPage(updated);
      pageRef.current = updated;
    } catch {
      const updated = { ...next, items: [] };
      setPage(updated);
      pageRef.current = updated;
    }
  };

  const closePage = () => {
    setPage(null);
    pageRef.current = null;
  };

  // ── Detail ────────────────────────────────────────────────────────────────
  const openDetail = async (item, hasHistory = false) => {
    // Set initial button focus to 0 (Play/Continue button)
    // The button will show "Continue" if there's history, "Play" otherwise
    const next = { item, info: null, btnIdx: 0, showTrailer: false };
    setDetail(next);
    detailRef.current = next;
    try {
      const streamId = item.stream_id ?? item.streamId;
      const info = await iptvApi.getVODInfo(streamId);
      const updated = { ...next, info };
      setDetail(updated);
      detailRef.current = updated;
    } catch {
      const updated = { ...next, info: {} };
      setDetail(updated);
      detailRef.current = updated;
    }
  };

  const closeDetail = () => {
    setDetail(null);
    detailRef.current = null;
  };
  const updDetail = (d) => {
    detailRef.current = d;
    setDetail(d);
  };

  const playMovie = (d, startTime = 0) => {
    const item = d.item;
    const streamId = item.stream_id ?? item.streamId;
    const url = iptvApi.buildStreamUrl(
      "movie",
      streamId,
      item.container_extension || "mp4",
    );
    playVideo({
      type: "movies",
      streamId,
      name: item.name,
      url,
      cover: item.stream_icon || item.cover || null,
      startTime,
    });
    navigation.navigate("VideoPlayer");
  };

  // ── D-pad ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (navActiveRef.current) return;
      if (currentVideoRef.current) return;
      const k = e.keyCode || e.which;
      if (detailRef.current) handleDetailKey(k, e);
      else if (pageRef.current) handleMovKey(k, e);
      else handleCatKey(k, e);
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

  // ── Category keys ─────────────────────────────────────────────────────────
  const movCatFocus = (n) => {
    catFocusRef.current = n;
    setCatFocus(n);
  };
  const onCatLeft = () => {
    const f = catFocusRef.current;
    if (f > 0) movCatFocus(f - 1);
  };
  const onCatRight = () => {
    const f = catFocusRef.current;
    const max = catsRef.current.length - 1;
    if (f < max) movCatFocus(f + 1);
  };
  const onCatUp = () => {
    const f = catFocusRef.current;
    if (f >= CAT_COLS) movCatFocus(f - CAT_COLS);
    else focusNav();
  };
  const onCatDown = () => {
    const f = catFocusRef.current;
    movCatFocus(Math.min(f + CAT_COLS, catsRef.current.length - 1));
  };
  const onCatEnter = () => {
    const cat = catsRef.current[catFocusRef.current];
    if (cat) openCat(cat);
  };

  const handleCatKey = (k, e) => {
    e.preventDefault();
    switch (k) {
      case KEY_LEFT:
        onCatLeft();
        break;
      case KEY_RIGHT:
        onCatRight();
        break;
      case KEY_UP:
        onCatUp();
        break;
      case KEY_DOWN:
        onCatDown();
        break;
      case KEY_ENTER:
        onCatEnter();
        break;
      default:
        if (KEY_BACK.has(k)) navigation.goBack?.();
    }
  };

  // ── Movie grid keys ───────────────────────────────────────────────────────
  const movMovFocus = (pg, focus) => {
    const n = { ...pg, focus };
    pageRef.current = n;
    setPage(n);
  };
  const growPage = (pg) => {
    const n = {
      ...pg,
      display: Math.min(pg.display + MOV_PAGE, pg.items.length),
    };
    pageRef.current = n;
    setPage(n);
  };

  const onMovLeft = (pg) => {
    if (pg.focus > 0) movMovFocus(pg, pg.focus - 1);
  };
  const onMovRight = (pg) => {
    const max = Math.min(pg.display, pg.items.length) - 1;
    if (pg.focus >= max) return;
    movMovFocus(pg, pg.focus + 1);
    if (pg.focus + 1 >= pg.display - MOV_COLS && pg.display < pg.items.length)
      growPage(pg);
  };
  const onMovUp = (pg) => {
    if (pg.focus >= MOV_COLS) movMovFocus(pg, pg.focus - MOV_COLS);
    else focusNav();
  };
  const onMovDown = (pg) => {
    const max = Math.min(pg.display, pg.items.length) - 1;
    const next = Math.min(pg.focus + MOV_COLS, max);
    movMovFocus(pg, next);
    if (next >= pg.display - MOV_COLS && pg.display < pg.items.length)
      growPage(pg);
  };
  const onMovEnter = (pg) => {
    const item = pg.items[pg.focus];
    if (item) openDetail(item);
  };

  const handleMovKey = (k, e) => {
    const pg = pageRef.current;
    e.preventDefault();
    if (KEY_BACK.has(k)) {
      closePage();
      return;
    }
    if (!pg?.items) return;
    switch (k) {
      case KEY_LEFT:
        onMovLeft(pg);
        break;
      case KEY_RIGHT:
        onMovRight(pg);
        break;
      case KEY_UP:
        onMovUp(pg);
        break;
      case KEY_DOWN:
        onMovDown(pg);
        break;
      case KEY_ENTER:
        onMovEnter(pg);
        break;
    }
  };

  // ── Detail keys ───────────────────────────────────────────────────────────
  const handleDetailKey = (k, e) => {
    const d = detailRef.current;
    if (!d) return;
    e.preventDefault();
    if (KEY_BACK.has(k)) {
      closeDetail();
      return;
    }
    if (!d.info) return;

    const streamId = d.item.stream_id ?? d.item.streamId;
    const resume = (watchHistory || []).find(
      (h) =>
        (h.type === "movies" || h.type === "movie") &&
        String(h.streamId) === String(streamId),
    );
    const trailer = getTrailerUrl(d.info?.info?.youtube_trailer);
    const buttons = [
      { type: "play" },
      ...(resume?.currentTime > 0 ? [{ type: "restart" }] : []),
      ...(trailer ? [{ type: "trailer" }] : []),
      { type: "fav" },
    ];
    const maxBtn = buttons.length - 1;

    switch (k) {
      case KEY_LEFT:
        closeDetail();
        break;
      case KEY_UP:
        if (d.btnIdx > 0) updDetail({ ...d, btnIdx: d.btnIdx - 1 });
        else focusNav();
        break;
      case KEY_DOWN:
        if (d.btnIdx < maxBtn) updDetail({ ...d, btnIdx: d.btnIdx + 1 });
        break;
      case KEY_ENTER: {
        const btn = buttons[d.btnIdx];
        if (btn?.type === "play") playMovie(d, resume?.currentTime || 0);
        else if (btn?.type === "restart") playMovie(d, 0);
        else if (btn?.type === "trailer")
          updDetail({ ...d, showTrailer: !d.showTrailer });
        else if (btn?.type === "fav") {
          if (isInMyList("movies", streamId))
            removeFromMyList(`mylist_movies_${streamId}`);
          else
            addToMyList({
              type: "movies",
              streamId,
              name: d.item.name,
              cover: d.item.stream_icon || d.item.cover || null,
            });
        }
        break;
      }
    }
  };

  useEffect(() => {
    catElRef.current?.scrollIntoView({ block: "nearest" });
  }, [catFocus]);
  useEffect(() => {
    movElRef.current?.scrollIntoView({ block: "nearest" });
  }, [page?.focus]);
  useEffect(() => {
    btnElRef.current?.scrollIntoView({ block: "nearest" });
  }, [detail?.btnIdx]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="tvl-screen">
        <div className="tvl-center">
          <div className="tvl-spinner" />
          <p>Loading…</p>
        </div>
      </div>
    );

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

  // ── Movie detail ──────────────────────────────────────────────────────────
  if (detail) {
    const { item, info, btnIdx, showTrailer } = detail;
    const data = info?.info || {};
    const streamId = item.stream_id ?? item.streamId;
    const poster = item.stream_icon || item.cover || data.movie_image || null;
    const year = (data.releasedate || data.release_date || "").slice(0, 4);
    const trailer = getTrailerUrl(data.youtube_trailer);
    const resume = (watchHistory || []).find(
      (h) =>
        (h.type === "movies" || h.type === "movie") &&
        String(h.streamId) === String(streamId),
    );
    const inFav = isInMyList("movies", streamId);
    const buttons = [
      { label: resume?.currentTime > 0 ? "▶  Continue" : "▶  Play", type: "play" },
      ...(resume?.currentTime > 0 ? [{ label: "↺  From Start", type: "restart" }] : []),
      ...(trailer ? [{ label: showTrailer ? "✕  Close Trailer" : "🎬  Trailer", type: "trailer" }] : []),
      { label: inFav ? "♥  Saved" : "♡  Add to Favorites", type: "fav" },
    ];
    const btnClass = (i, type) =>
      [
        "tvl-det-hero-btn",
        type === "play" ? "tvl-det-hero-btn--play" : "",
        type === "fav" && inFav ? "tvl-det-hero-btn--saved" : "",
        i === btnIdx ? "tvl-det-hero-btn--on" : "",
      ]
        .filter(Boolean)
        .join(" ");

    return (
      <div className="tvl-screen">
        <div className="tvl-topbar">
          <button className="tvl-topbar-back" onClick={closeDetail}>◀</button>
          <button className="tvl-topbar-title tvl-topbar-title--back" onClick={closeDetail}>
            {item.name}
          </button>
        </div>

        {/* Banner */}
        <div className="tvl-det-hero">
          {poster && <img className="tvl-det-hero-bg" src={poster} alt="" />}
          <div className="tvl-det-hero-grad" />
        </div>

        {/* Content below banner */}
        <div className="tvl-det-content">
          <div className="tvl-det-hero-thumb">
            {poster
              ? <img src={poster} alt="" />
              : <div className="tvl-det-hero-thumb-ph">🎬</div>}
          </div>
          <div className="tvl-det-hero-info">
            <div className="tvl-det-hero-title">{item.name}</div>
            <div className="tvl-det-hero-meta">
              {year && <span className="tvl-det-tag">{year}</span>}
              {data.genre && <span className="tvl-det-tag">{data.genre.split(",")[0].trim()}</span>}
              {data.rating && <span className="tvl-det-rating">⭐ {Number.parseFloat(data.rating).toFixed(1)}</span>}
              {data.age && <span className="tvl-det-tag tvl-det-tag--alert">{data.age}</span>}
              {data.duration && <span className="tvl-det-tag">{data.duration}</span>}
            </div>
            {!info && <div className="tvl-spinner" style={{ alignSelf: "flex-start" }} />}
            {info && (
              <div className="tvl-det-hero-btns">
                {buttons.map((btn, i) => (
                  <button
                    key={btn.type}
                    ref={i === btnIdx ? btnElRef : null}
                    className={btnClass(i, btn.type)}
                    onClick={() => {
                      if (btn.type === "play") playMovie(detail, resume?.currentTime || 0);
                      else if (btn.type === "restart") playMovie(detail, 0);
                      else if (btn.type === "trailer") updDetail({ ...detail, showTrailer: !detail.showTrailer });
                      else if (btn.type === "fav") {
                        if (inFav) removeFromMyList(`mylist_movies_${streamId}`);
                        else addToMyList({ type: "movies", streamId, name: item.name, cover: poster });
                      }
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
            {data.plot && <p className="tvl-det-hero-plot">{data.plot}</p>}
          </div>
        </div>

        {/* Body: full plot, cast, director, trailer */}
        {info && (data.plot || data.cast || data.director || (showTrailer && trailer)) && (
          <div className="tvl-det-body">
            {data.plot && <p className="tvl-det-body-plot">{data.plot}</p>}
            {data.cast && (
              <p className="tvl-det-body-crew"><strong>Cast</strong> {data.cast}</p>
            )}
            {data.director && (
              <p className="tvl-det-body-crew"><strong>Director</strong> {data.director}</p>
            )}
            {showTrailer && trailer && (
              <div className="tvl-mov-trailer">
                <iframe
                  title={`${item.name} trailer`}
                  src={`${trailer}?autoplay=1`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Movie grid ────────────────────────────────────────────────────────────
  if (page) {
    const displayed = page.items ? page.items.slice(0, page.display) : null;
    return (
      <div className="tvl-screen">
        <div className="tvl-topbar">
          <button className="tvl-topbar-back" onClick={closePage}>
            ◀
          </button>
          <button
            className="tvl-topbar-title tvl-topbar-title--back"
            onClick={closePage}
          >
            {page.name}
          </button>
          {page.items && (
            <span className="tvl-topbar-count">
              {page.items.length.toLocaleString()}
            </span>
          )}
        </div>
        {displayed ? (
          <div className="tvl-scroll">
            <div className="tvl-mov-grid">
              {displayed.map((item, i) => (
                <MovieCard
                  key={String(item.stream_id)}
                  item={item}
                  isFocused={i === page.focus}
                  elRef={i === page.focus ? movElRef : null}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="tvl-center">
            <div className="tvl-spinner" />
            <p>Loading movies…</p>
          </div>
        )}
      </div>
    );
  }

  // ── Category grid ─────────────────────────────────────────────────────────
  return (
    <div className="tvl-screen">
      <div className="tvl-topbar">
        <span className="tvl-topbar-title">Movies</span>
      </div>
      <div className="tvl-scroll">
        <div className="tvl-cat-grid">
          {cats.map((cat, i) => (
            <button
              key={cat.id}
              ref={i === catFocus ? catElRef : null}
              className={
                i === catFocus
                  ? "tvl-cat-card tvl-cat-card--on"
                  : "tvl-cat-card"
              }
              onClick={() => openCat(cat)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MovieCard({ item, isFocused, elRef }) {
  const [err, setErr] = useState(false);
  const src = item.stream_icon || item.cover || item.movie_image || null;
  const rating = item.tmdb_rating ?? item.rating;
  const fmtRating = (r) => (typeof r === "number" ? Math.round(r) : r);
  const rLabel = rating != null && rating !== "" ? fmtRating(rating) : null;
  return (
    <div
      ref={elRef}
      className={isFocused ? "tvl-card tvl-card--on" : "tvl-card"}
    >
      <div className="tvl-card-img">
        {src && !err ? (
          <img src={src} alt="" onError={() => setErr(true)} loading="lazy" />
        ) : (
          <div className="tvl-card-ph">▶</div>
        )}
        {rLabel && <span className="tvl-card-rating">{rLabel}</span>}
      </div>
      <div className="tvl-card-title">{item.name}</div>
    </div>
  );
}
