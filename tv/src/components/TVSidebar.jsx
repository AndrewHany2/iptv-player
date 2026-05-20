import PropTypes from "prop-types";

const NAV_ITEMS = [
  { type: "live", icon: "📺", label: "Live TV" },
  { type: "movies", icon: "🎬", label: "Movies" },
  { type: "series", icon: "📺", label: "Series" },
  { type: "history", icon: "🕘", label: "History" },
];

const TVSidebar = ({
  activeType,
  focusedIdx,
  itemRefs,
  onSelect,
  onKeyDown,
  profile,
  onSignOut,
  signOutRef,
}) => {
  return (
    <nav className="tv-sidebar">
      <div className="tv-sidebar-logo">📺 IPTV</div>

      <div className="tv-sidebar-nav">
        {NAV_ITEMS.map((item, idx) => (
          <button
            key={item.type}
            ref={(el) => (itemRefs.current[idx] = el)}
            type="button"
            className={`tv-sidebar-item ${activeType === item.type ? "active" : ""}`}
            tabIndex={0}
            onKeyDown={(e) => onKeyDown(e, idx)}
            onClick={() => onSelect(item.type)}
          >
            <span className="tv-sidebar-icon">{item.icon}</span>
            <span className="tv-sidebar-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="tv-sidebar-footer">
        {profile && (
          <div className="tv-sidebar-profile">
            <span className="tv-sidebar-username">@{profile.username}</span>
          </div>
        )}
        <button
          ref={signOutRef}
          type="button"
          className="tv-sidebar-item tv-sidebar-signout"
          tabIndex={0}
          onKeyDown={(e) => onKeyDown(e, NAV_ITEMS.length)}
          onClick={onSignOut}
        >
          <span className="tv-sidebar-icon">↩</span>
          <span className="tv-sidebar-label">Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

TVSidebar.propTypes = {
  activeType: PropTypes.string.isRequired,
  focusedIdx: PropTypes.number.isRequired,
  itemRefs: PropTypes.object.isRequired,
  onSelect: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  profile: PropTypes.object,
  onSignOut: PropTypes.func.isRequired,
  signOutRef: PropTypes.object.isRequired,
};

export default TVSidebar;
export { NAV_ITEMS };
