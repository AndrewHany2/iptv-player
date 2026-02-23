import { useApp } from "../context/AppContext";
import LiveChannels from "./LiveChannels";
import MoviesContent from "./MoviesContent";
import SeriesContent from "./SeriesContent";

const Sidebar = () => {
  const { contentType, searchQuery, setSearchQuery } = useApp();

  const getTitle = () => {
    switch (contentType) {
      case "live":
        return "Channels";
      case "movies":
        return "Movies";
      case "series":
        return "Series";
      default:
        return "Content";
    }
  };

  const getPlaceholder = () => {
    switch (contentType) {
      case "live":
        return "🔍 Search channels...";
      case "movies":
        return "🔍 Search movies...";
      case "series":
        return "🔍 Search series...";
      default:
        return "🔍 Search...";
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>{getTitle()}</h2>
        <input
          type="text"
          className="search-input"
          placeholder={getPlaceholder()}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-content">
        {contentType === "live" && <LiveChannels />}
        {contentType === "movies" && <MoviesContent />}
        {contentType === "series" && <SeriesContent />}
      </div>
    </aside>
  );
};

export default Sidebar;
