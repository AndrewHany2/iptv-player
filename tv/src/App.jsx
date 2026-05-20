import { useRef, useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import TVAuthPage from "./components/TVAuthPage";
import TVProfileSelector from "./components/TVProfileSelector";
import TVSidebar, { NAV_ITEMS } from "./components/TVSidebar";
import TVContent from "./components/TVContent";
import TVVideoPlayer from "./components/TVVideoPlayer";
import TVUsersModal from "./components/TVUsersModal";
import TVProfilesModal from "./components/TVProfilesModal";
import "./App.css";

const SIDEBAR_ITEMS_COUNT = NAV_ITEMS.length + 1; // +1 for sign-out

function TVApp() {
  const {
    authUser,
    authLoading,
    profile,
    activeProfileId,
    appProfiles,
    signOut,
    setContentType,
    contentType,
    currentVideo,
  } = useApp();

  const [sidebarFocusIdx, setSidebarFocusIdx] = useState(0);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [profilesOpen, setProfilesOpen] = useState(false);

  const sidebarItemRefs = useRef([]);
  const signOutRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (authUser && activeProfileId && !authLoading) {
      sidebarItemRefs.current[0]?.focus();
    }
  }, [authUser, activeProfileId, authLoading]);

  const focusSidebar = (idx = sidebarFocusIdx) => {
    const clampedIdx = Math.max(0, Math.min(idx, SIDEBAR_ITEMS_COUNT - 1));
    setSidebarFocusIdx(clampedIdx);
    if (clampedIdx < NAV_ITEMS.length) {
      sidebarItemRefs.current[clampedIdx]?.focus();
    } else {
      signOutRef.current?.focus();
    }
  };

  const focusGrid = () => {
    contentRef.current?.focusFirst();
  };

  const handleSidebarActivate = (type) => {
    if (type === "accounts") { setAccountsOpen(true); return; }
    if (type === "profiles") { setProfilesOpen(true); return; }
    setContentType(type);
    focusGrid();
  };

  const handleSidebarKeyDown = (e, idx) => {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = Math.min(idx + 1, SIDEBAR_ITEMS_COUNT - 1);
        setSidebarFocusIdx(next);
        if (next < NAV_ITEMS.length) sidebarItemRefs.current[next]?.focus();
        else signOutRef.current?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = Math.max(idx - 1, 0);
        setSidebarFocusIdx(prev);
        if (prev < NAV_ITEMS.length) sidebarItemRefs.current[prev]?.focus();
        else signOutRef.current?.focus();
        break;
      }
      case "ArrowRight":
      case "Enter": {
        e.preventDefault();
        if (idx < NAV_ITEMS.length) handleSidebarActivate(NAV_ITEMS[idx].type);
        else signOut();
        break;
      }
      default:
    }
  };

  if (authLoading) {
    return (
      <div className="tv-boot">
        <div className="tv-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!authUser) return <TVAuthPage />;

  // No active profile yet → show profile selector
  if (!activeProfileId) return <TVProfileSelector />;

  const currentProfileName = appProfiles.find((p) => p.id === activeProfileId)?.name;

  return (
    <div className="tv-layout">
      <TVSidebar
        activeType={contentType}
        focusedIdx={sidebarFocusIdx}
        itemRefs={sidebarItemRefs}
        signOutRef={signOutRef}
        onSelect={handleSidebarActivate}
        onKeyDown={handleSidebarKeyDown}
        profile={profile}
        activeProfileName={currentProfileName}
        onSignOut={signOut}
      />
      <TVContent
        ref={contentRef}
        onFocusSidebar={() => focusSidebar(sidebarFocusIdx)}
      />
      {currentVideo && <TVVideoPlayer />}
      {accountsOpen && (
        <TVUsersModal onClose={() => { setAccountsOpen(false); focusSidebar(sidebarFocusIdx); }} />
      )}
      {profilesOpen && (
        <TVProfilesModal onClose={() => { setProfilesOpen(false); focusSidebar(sidebarFocusIdx); }} />
      )}
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
