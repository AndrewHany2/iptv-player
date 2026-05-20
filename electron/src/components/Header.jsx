import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";

const Header = ({ onOpenUsers, onOpenProfiles }) => {
  const { users, activeUserId, authUser, profile, activeProfile, signOut, isSyncing } = useApp();

  const activeUser = users.find((u) => u.id === activeUserId);
  const displayName = activeUser
    ? activeUser.nickname || `${activeUser.username}@${activeUser.host}`
    : "Not connected";

  return (
    <header className="header">
      <h1>📺 IPTV Player</h1>
      <div className="header-controls">
        {isSyncing && <span className="sync-badge">↻ Syncing…</span>}

        {activeUser && (
          <div className="active-user-badge">
            <span className="user-icon">📡</span>
            <span className="user-name">{displayName}</span>
          </div>
        )}

        <button type="button" className="btn btn-secondary" onClick={onOpenUsers}>
          👥 IPTV Accounts
        </button>

        {activeProfile && (
          <button type="button" className="btn btn-secondary" onClick={onOpenProfiles}>
            {activeProfile.avatar} {activeProfile.name}
          </button>
        )}

        {authUser && (
          <div className="auth-user-section">
            <span className="auth-email">
              👤 {profile?.username ?? "…"}
            </span>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={signOut}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

Header.propTypes = {
  onOpenUsers: PropTypes.func.isRequired,
  onOpenProfiles: PropTypes.func.isRequired,
};

export default Header;
