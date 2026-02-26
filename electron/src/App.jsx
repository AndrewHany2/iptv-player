import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import Header from "./components/Header";
import ContentBrowser from "./components/ContentBrowser";
import VideoPlayer from "./components/VideoPlayer";
import UsersModal from "./components/UsersModal";
import AuthPage from "./components/AuthPage";
import "./App.css";

function AppContent() {
  const { authUser, authLoading } = useApp();
  const [showUsersModal, setShowUsersModal] = useState(false);

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!authUser) {
    return <AuthPage />;
  }

  return (
    <div className="app-container">
      <Header onOpenUsers={() => setShowUsersModal(true)} />
      <div className="main-content">
        <ContentBrowser />
      </div>
      {showUsersModal && (
        <UsersModal onClose={() => setShowUsersModal(false)} />
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
