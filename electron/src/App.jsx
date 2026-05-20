import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Header from "./components/Header";
import ContentBrowser from "./components/ContentBrowser";
import VideoPlayer from "./components/VideoPlayer";
import UsersModal from "./components/UsersModal";
import ProfilesModal from "./components/ProfilesModal";
import ProfileSelector from "./components/ProfileSelector";
import AuthPage from "./components/AuthPage";
import "./App.css";

function AppContent() {
  const { authUser, authLoading, activeProfileId } = useApp();
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showProfilesModal, setShowProfilesModal] = useState(false);

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!authUser) return <AuthPage />;

  // No active profile yet → show profile selector
  if (!activeProfileId) {
    return <ProfileSelector onManage={() => setShowProfilesModal(true)} />;
  }

  return (
    <div className="app-container">
      <Header
        onOpenUsers={() => setShowUsersModal(true)}
        onOpenProfiles={() => setShowProfilesModal(true)}
      />
      <div className="main-content">
        <ContentBrowser />
      </div>
      {showUsersModal && (
        <UsersModal onClose={() => setShowUsersModal(false)} />
      )}
      {showProfilesModal && (
        <ProfilesModal onClose={() => setShowProfilesModal(false)} />
      )}
      <VideoPlayer />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
