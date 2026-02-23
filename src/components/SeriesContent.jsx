import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const SeriesContent = () => {
  const {
    seriesCategories,
    setSeriesCategories,
    series,
    setSeries,
    setCurrentSeriesCategory,
    currentSeries,
    setCurrentSeries,
    seriesSeasons,
    setSeriesSeasons,
    users,
    activeUserId,
  } = useApp();

  const [view, setView] = useState("categories"); // 'categories', 'series', 'episodes'

  const loadCategories = useCallback(async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;

    try {
      iptvApi.setCredentials(user.host, user.username, user.password);
      const categories = await iptvApi.getSeriesCategories();
      setSeriesCategories(categories || []);
    } catch (error) {
      console.error("Error loading series categories:", error);
    }
  }, [users, activeUserId, setSeriesCategories]);

  useEffect(() => {
    if (seriesCategories.length === 0 && activeUserId) {
      loadCategories();
    }
  }, [activeUserId, seriesCategories.length, loadCategories]);

  const loadSeries = async (categoryId, categoryName) => {
    try {
      const seriesList = await iptvApi.getSeries(categoryId);
      setSeries(seriesList || []);
      setCurrentSeriesCategory({ id: categoryId, name: categoryName });
      setView("series");
    } catch (error) {
      console.error("Error loading series:", error);
    }
  };

  const loadEpisodes = async (seriesId, seriesName) => {
    try {
      const info = await iptvApi.getSeriesInfo(seriesId);
      setSeriesSeasons(info.episodes || {});
      setCurrentSeries({ id: seriesId, name: seriesName });
      setView("episodes");
    } catch (error) {
      console.error("Error loading episodes:", error);
    }
  };

  const handleBackToCategories = () => {
    setView("categories");
    setSeries([]);
    setCurrentSeriesCategory(null);
  };

  const handleBackToSeries = () => {
    setView("series");
    setSeriesSeasons({});
    setCurrentSeries(null);
  };

  const handleEpisodeClick = async (episode, seasonNum) => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;

    const streamUrl = iptvApi.buildStreamUrl(
      "series",
      episode.id,
      episode.container_extension || "mp4",
    );
    const episodeName = `${currentSeries.name} - S${seasonNum}E${episode.episode_num}`;

    // eslint-disable-next-line no-alert, no-restricted-globals
    const shouldUseVLC = globalThis.confirm(
      `Play "${episodeName}" in VLC Media Player?\n\nClick OK to open in VLC (recommended)\nClick Cancel to try browser playback`,
    );

    if (shouldUseVLC) {
      try {
        await globalThis.electron.openInVLC(streamUrl, { name: episodeName });
      } catch (error) {
        console.error("Error opening VLC:", error);
        // eslint-disable-next-line no-alert
        alert("Failed to open VLC. Make sure VLC is installed.");
      }
    }
  };

  if (view === "categories") {
    if (seriesCategories.length === 0) {
      return (
        <div className="empty-state">
          <p>No series categories found</p>
          <p className="hint">Connect to an IPTV service to load series</p>
        </div>
      );
    }

    return (
      <div className="category-list">
        {seriesCategories.map((category) => (
          <button
            key={category.category_id}
            type="button"
            className="category-item"
            onClick={() =>
              loadSeries(category.category_id, category.category_name)
            }
          >
            <span className="category-name">📁 {category.category_name}</span>
          </button>
        ))}
      </div>
    );
  }

  if (view === "series") {
    return (
      <div className="items-list">
        <button
          type="button"
          className="back-button"
          onClick={handleBackToCategories}
        >
          ← Back to Categories
        </button>

        {series.length === 0 ? (
          <div className="empty-state">
            <p>No series found in this category</p>
          </div>
        ) : (
          <div className="series-grid">
            {series.map((show) => {
              const imageUrl =
                show.cover ||
                show.stream_icon ||
                show.backdrop_path ||
                show.poster ||
                show.cover_big;

              return (
                <button
                  key={show.series_id}
                  type="button"
                  className="series-card"
                  onClick={() => loadEpisodes(show.series_id, show.name)}
                >
                  <div className="series-poster">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={show.name}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="series-poster-fallback"
                      style={{ display: imageUrl ? "none" : "flex" }}
                    >
                      📺
                    </div>
                  </div>
                  <div className="series-info">
                    <div className="series-title">{show.name}</div>
                    {show.rating && (
                      <div className="series-rating">{show.rating} ⭐</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Episodes view
  const seasons = Object.keys(seriesSeasons).sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );

  return (
    <div className="items-list">
      <button
        type="button"
        className="back-button"
        onClick={handleBackToSeries}
      >
        ← Back to Series
      </button>

      {seasons.length === 0 ? (
        <div className="empty-state">
          <p>No episodes found</p>
        </div>
      ) : (
        seasons.map((seasonNum) => (
          <div key={seasonNum} style={{ marginBottom: "20px" }}>
            <h3
              style={{
                padding: "10px 15px",
                background: "#3d3d3d",
                borderRadius: "6px",
                marginBottom: "5px",
              }}
            >
              Season {seasonNum}
            </h3>
            {seriesSeasons[seasonNum].map((episode) => (
              <button
                key={episode.id}
                type="button"
                className="item-card"
                onClick={() => handleEpisodeClick(episode, seasonNum)}
              >
                <div className="item-title">
                  ▶️ Episode {episode.episode_num}:{" "}
                  {episode.title || "Untitled"}
                </div>
                {episode.info?.duration && (
                  <div className="item-info">{episode.info.duration}</div>
                )}
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default SeriesContent;
