import { useApp } from "../context/AppContext";

const ContentTabs = () => {
  const { contentType, setContentType } = useApp();

  const tabs = [
    { id: "live", label: "📺 Live TV" },
    { id: "movies", label: "🎬 Movies" },
    { id: "series", label: "📺 Series" },
  ];

  return (
    <div className="content-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`content-tab ${contentType === tab.id ? "active" : ""}`}
          onClick={() => setContentType(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ContentTabs;
