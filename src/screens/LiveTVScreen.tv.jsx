import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useContentService } from "../domain/hooks/useContentService";
import { VirtualGridTV } from "../presentation/components/VirtualGrid.tv";
import StatePanel from "../ui/StatePanel";
import Icon from "../ui/Icon";
import { colors, iconSizes } from "../ui/tokens";
import { ss } from "../utils/scaleSize";
import "../styles/tvl.css";
import "../styles/tvResponsiveScaling.css";
import "../styles/tvRemoteFocus.css";
import "./LiveTVScreen.tv.css";

const CAT_COLS = 4;
const CH_COLS = 8;
const CH_PAGE = 40;
// Virtual-grid row metrics (design px @ 1280 viewport): 8-col 16:9 logo + name.
const CH_GAP = 12;
const CH_ROW_H = 120;

const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_ENTER = 13;
const KEY_BACK = new Set([27, 461, 10009, 8]);

export default function LiveTVScreenTV({ navigation }) {
  const { contentService, activeUser, activeUserId } = useContentService();
  const { playVideo, currentVideo } = useApp();
  const currentVideoRef = useRef(null);
  useEffect(() => { currentVideoRef.current = currentVideo; }, [currentVideo]);

  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState([]);
  const [catFocus, setCatFocus] = useState(0);
  const [page, setPage] = useState(null);

  const catsRef = useRef([]);
  const catFocusRef = useRef(0);
  const pageRef = useRef(null);
  const allItemsRef = useRef(new Map());
  const catElRef = useRef(null);
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
    if (activeUserId) loadCats();
  }, [activeUserId]);

  const loadCats = async () => {
    if (!activeUser) return;
    setLoading(true);
    allItemsRef.current.clear();
    try {
      const list = await contentService.getLiveCategories();
      if (!list?.length) return;
      setCats(list);
      catsRef.current = list;
    } catch (e) {
      console.error("LiveTVScreenTV:", e);
    } finally {
      setLoading(false);
    }
  };

  const openCat = async (cat) => {
    const next = {
      catId: cat.id,
      name: cat.name,
      items: null,
      display: CH_PAGE,
      focus: 0,
    };
    setPage(next);
    pageRef.current = next;
    try {
      let all = allItemsRef.current.get(cat.id);
      if (!all) {
        all = await contentService.getLiveChannels(cat.id);
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

  const play = (item) => {
    const url = contentService.buildLiveUrl(item.stream_id, item.container_extension || "ts");
    playVideo({
      type: "live",
      streamId: item.stream_id,
      name: item.name,
      url,
      cover: item.stream_icon || null,
      startTime: 0,
    });
    navigation.navigate("VideoPlayer");
  };

  useEffect(() => {
    const onKey = (e) => {
      if (navActiveRef.current) return;
      if (currentVideoRef.current) return;
      const k = e.keyCode || e.which;
      if (pageRef.current) handleChKey(k, e);
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

  // ── Category grid keys ────────────────────────────────────────────────────
  const movCat = (n) => {
    catFocusRef.current = n;
    setCatFocus(n);
  };
  const onCatLeft = () => {
    const f = catFocusRef.current;
    if (f > 0) movCat(f - 1);
  };
  const onCatRight = () => {
    const f = catFocusRef.current;
    const max = catsRef.current.length - 1;
    if (f < max) movCat(f + 1);
  };
  const onCatUp = () => {
    const f = catFocusRef.current;
    if (f >= CAT_COLS) movCat(f - CAT_COLS);
    else focusNav();
  };
  const onCatDown = () => {
    const f = catFocusRef.current;
    movCat(Math.min(f + CAT_COLS, catsRef.current.length - 1));
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

  // ── Channel grid keys ─────────────────────────────────────────────────────
  // The grid is virtualized (VirtualGridTV), so focus may roam the whole list —
  // bounds use the full length, not a display cap.
  const movCh = (pg, focus) => {
    const n = { ...pg, focus };
    pageRef.current = n;
    setPage(n);
  };

  const onChLeft = (pg) => {
    if (pg.focus > 0) movCh(pg, pg.focus - 1);
  };
  const onChRight = (pg) => {
    const max = pg.items.length - 1;
    if (pg.focus >= max) return;
    movCh(pg, pg.focus + 1);
  };
  const onChUp = (pg) => {
    if (pg.focus >= CH_COLS) movCh(pg, pg.focus - CH_COLS);
    else focusNav();
  };
  const onChDown = (pg) => {
    const max = pg.items.length - 1;
    const next = Math.min(pg.focus + CH_COLS, max);
    movCh(pg, next);
  };
  const onChEnter = (pg) => {
    const item = pg.items[pg.focus];
    if (item) play(item);
  };

  const handleChKey = (k, e) => {
    const pg = pageRef.current;
    e.preventDefault();
    if (KEY_BACK.has(k)) {
      closePage();
      return;
    }
    if (!pg?.items) return;
    switch (k) {
      case KEY_LEFT:
        onChLeft(pg);
        break;
      case KEY_RIGHT:
        onChRight(pg);
        break;
      case KEY_UP:
        onChUp(pg);
        break;
      case KEY_DOWN:
        onChDown(pg);
        break;
      case KEY_ENTER:
        onChEnter(pg);
        break;
    }
  };

  useEffect(() => {
    catElRef.current?.scrollIntoView({ block: "nearest" });
  }, [catFocus]);
  // Channel-grid focus scrolling is handled inside VirtualGridTV (focusIndex).

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="tvl-screen">
        <StatePanel mode="loading" title="Loading channels…" />
      </div>
    );
  }
  if (!activeUserId) {
    return (
      <div className="tvl-screen">
        <StatePanel
          mode="empty"
          icon="tv"
          title="No IPTV Account"
          message='Open "Accounts" to add your IPTV service'
          cta={() => navigation.navigate("Accounts")}
          ctaLabel="Add Account"
        />
      </div>
    );
  }

  if (page) {
    return (
      <div className="tvl-screen">
        <div className="tvl-topbar">
          <button className="tvl-topbar-back" onClick={closePage} aria-label="Back">
            <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
              <Icon name="chevron-right" size={ss(iconSizes.md)} color={colors.text} />
            </span>
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
        {page.items ? (
          <div className="tvl-ch-grid-window">
            <VirtualGridTV
              items={page.items}
              cols={CH_COLS}
              rowHeight={CH_ROW_H}
              gap={CH_GAP}
              focusIndex={page.focus}
              className="tvl-ch-vgrid"
              renderItem={(item, i) => (
                <ChannelCard
                  key={String(item.stream_id)}
                  item={item}
                  isFocused={i === page.focus}
                />
              )}
            />
          </div>
        ) : (
          <div className="tvl-center">
            <div className="tvl-spinner" />
            <p>Loading…</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tvl-screen">
      <div className="tvl-topbar">
        <span className="tvl-topbar-title">Live TV</span>
      </div>
      <div className="tvl-scroll">
        <div className="tvl-cat-grid">
          {cats.map((cat, i) => (
            <div
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ item, isFocused }) {
  const [err, setErr] = useState(false);
  const src = item.stream_icon || null;
  return (
    <div
      className={isFocused ? "tvl-ch-card tvl-ch-card--on" : "tvl-ch-card"}
    >
      <div className="tvl-ch-logo">
        {src && !err ? (
          <img src={src} alt="" onError={() => setErr(true)} loading="lazy" />
        ) : (
          <div className="tvl-ch-ph">
            <Icon name="tv" size={ss(iconSizes.lg)} color={colors.border} />
          </div>
        )}
        <span className="tvl-ch-live">LIVE</span>
      </div>
      <div className="tvl-ch-name">{item.name}</div>
    </div>
  );
}
