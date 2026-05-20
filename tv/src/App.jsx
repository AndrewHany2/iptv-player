import { useRef, useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import TVAuthPage from "./components/TVAuthPage";
import TVSidebar, { NAV_ITEMS } from "./components/TVSidebar";
import TVContent from "./components/TVContent";
import TVVideoPlayer from "./components/TVVideoPlayer";
import "./App.css";

const SIDEBAR_ITEMS_COUNT = NAV_ITEMS.length + 1; // +1 for sign-out

function TVApp() {
  const { authUser, authLoading, profile, signOut, setContentType, contentType, currentVideo } =
    useApp();

  const [focusArea, setFocusArea] = useState("sidebar");
  const [sidebarFocusIdx, setSidebarFocusIdx] = useState(0);

  const sidebarItemRefs = useRef([]);
  const signOutRef = useRef(null);
  const contentRef = useRef(null);

  // Focus sidebar on mount after auth
  useEffect(() => {
    if (authUser && !authLoading) {
      sidebarItemRefs.current[0]?.focus();
    }
  }, [authUser, authLoading]);

  const focusSidebar = (idx = sidebarFocusIdx) => {
    const clampedIdx = Math.max(0, Math.min(idx, SIDEBAR_ITEMS_COUNT - 1));
    setFocusArea("sidebar");
    setSidebarFocusIdx(clampedIdx);
    if (clampedIdx < NAV_ITEMS.length) {
      sidebarItemRefs.current[clampedIdx]?.focus();
    } else {
      signOutRef.current?.focus();
    }
  };

  const focusGrid = () => {
    setFocusArea("grid");
    contentRef.current?.focusFirst();
  };

  const handleSidebarKeyDown = (e, idx) => {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = Math.min(idx + 1, SIDEBAR_ITEMS_COUNT - 1);
        setSidebarFocusIdx(next);
        if (next < NAV_ITEMS.length) {
          sidebarItemRefs.current[next]?.focus();
        } else {
          signOutRef.current?.focus();
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = Math.max(idx - 1, 0);
        setSidebarFocusIdx(prev);
        if (prev < NAV_ITEMS.length) {
          sidebarItemRefs.current[prev]?.focus();
        } else {
          signOutRef.current?.focus();
        }
        break;
      }
      case "ArrowRight":
      case "Enter": {
        e.preventDefault();
        if (idx < NAV_ITEMS.length) {
          setContentType(NAV_ITEMS[idx].type);
        } else {
          signOut();
          return;
        }
        focusGrid();
        break;
      }
      default:
    }
  };

  const handleSidebarSelect = (type) => {
    setContentType(type);
    focusGrid();
  };

  if (authLoading) {
    return (
      <div className="tv-boot">
        <div className="tv-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!authUser) {
    return <TVAuthPage />;
  }

  return (
    <div className="tv-layout">
      <TVSidebar
        activeType={contentType}
        focusedIdx={sidebarFocusIdx}
        itemRefs={sidebarItemRefs}
        signOutRef={signOutRef}
        onSelect={handleSidebarSelect}
        onKeyDown={handleSidebarKeyDown}
        profile={profile}
        onSignOut={signOut}
      />
      <TVContent
        ref={contentRef}
        onFocusSidebar={() => focusSidebar(sidebarFocusIdx)}
      />
      {currentVideo && <TVVideoPlayer />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <TVApp />
    </AppProvider>
  );
}

export default App;
