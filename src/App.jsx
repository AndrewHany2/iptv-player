import { useState } from "react";
import { AppProvider } from "./context/AppContext";
import Header from "./components/Header";
import ContentBrowser from "./components/ContentBrowser";
import UsersModal from "./components/UsersModal";
import "./App.css";

function App() {
  const [showUsersModal, setShowUsersModal] = useState(false);

  return (
    <AppProvider>
      <div className="app-container">
        <Header onOpenUsers={() => setShowUsersModal(true)} />

        <div className="main-content">
          <ContentBrowser />
        </div>

        {showUsersModal && (
          <UsersModal onClose={() => setShowUsersModal(false)} />
        )}
      </div>
    </AppProvider>
  );
}

export default App;
