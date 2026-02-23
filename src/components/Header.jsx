import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";

const Header = ({ onOpenUsers }) => {
  const { users, activeUserId } = useApp();

  const activeUser = users.find((u) => u.id === activeUserId);
  const displayName = activeUser
    ? activeUser.nickname || `${activeUser.username}@${activeUser.host}`
    : "Not connected";

  return (
    <header className="header">
      <h1>📺 IPTV Player</h1>
      <div className="header-controls">
        {activeUser && (
          <div className="active-user-badge">
            <span className="user-icon">👤</span>
            <span className="user-name">{displayName}</span>
          </div>
        )}
        <button type="button" className="btn btn-primary" onClick={onOpenUsers}>
          👥 Users
        </button>
      </div>
    </header>
  );
};

Header.propTypes = {
  onOpenUsers: PropTypes.func.isRequired,
};

export default Header;
