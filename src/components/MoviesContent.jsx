import { useCallback, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const MoviesContent = () => {
  const {
    movieCategories,
    setMovieCategories,
    movies,
    setMovies,
    setCurrentMovieCategory,
    users,
    activeUserId,
  } = useApp();

  const [view, setView] = useState("categories"); // 'categories' or 'movies'

  const loadCategories = useCallback(async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;

    try {
      iptvApi.setCredentials(user.host, user.username, user.password);
      const categories = await iptvApi.getVODCategories();
      setMovieCategories(categories || []);
    } catch (error) {
      console.error("Error loading movie categories:", error);
    }
  }, [users, activeUserId, setMovieCategories]);

  useEffect(() => {
    if (movieCategories.length === 0 && activeUserId) {
      loadCategories();
    }
  }, [activeUserId, movieCategories.length, loadCategories]);

  const loadMovies = async (categoryId, categoryName) => {
    try {
      const moviesList = await iptvApi.getVODStreams(categoryId);
      setMovies(moviesList || []);
      setCurrentMovieCategory({ id: categoryId, name: categoryName });
      setView("movies");
    } catch (error) {
      console.error("Error loading movies:", error);
    }
  };

  const handleBack = () => {
    setView("categories");
    setMovies([]);
    setCurrentMovieCategory(null);
  };

  const handleMovieClick = async (movie) => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;

    const streamUrl = iptvApi.buildStreamUrl(
      "movie",
      movie.stream_id,
      movie.container_extension || "mp4",
    );

    // eslint-disable-next-line no-alert, no-restricted-globals
    const shouldUseVLC = globalThis.confirm(
      `Play "${movie.name}" in VLC Media Player?\n\nClick OK to open in VLC (recommended)\nClick Cancel to try browser playback`,
    );

    if (shouldUseVLC) {
      try {
        await globalThis.electron.openInVLC(streamUrl, { name: movie.name });
      } catch (error) {
        console.error("Error opening VLC:", error);
        // eslint-disable-next-line no-alert
        alert("Failed to open VLC. Make sure VLC is installed.");
      }
    }
  };

  if (view === "categories") {
    if (movieCategories.length === 0) {
      return (
        <div className="empty-state">
          <p>No movie categories found</p>
          <p className="hint">Connect to an IPTV service to load movies</p>
        </div>
      );
    }

    return (
      <div className="category-list">
        {movieCategories.map((category) => (
          <button
            key={category.category_id}
            type="button"
            className="category-item"
            onClick={() =>
              loadMovies(category.category_id, category.category_name)
            }
          >
            <span className="category-name">📁 {category.category_name}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="items-list">
      <button type="button" className="back-button" onClick={handleBack}>
        ← Back to Categories
      </button>

      {movies.length === 0 ? (
        <div className="empty-state">
          <p>No movies found in this category</p>
        </div>
      ) : (
        <div className="series-grid">
          {movies.map((movie) => {
            const imageUrl =
              movie.stream_icon ||
              movie.cover ||
              movie.backdrop_path ||
              movie.poster ||
              movie.cover_big;

            return (
              <button
                key={movie.stream_id}
                type="button"
                className="series-card"
                onClick={() => handleMovieClick(movie)}
              >
                <div className="series-poster">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={movie.name}
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
                    🎬
                  </div>
                </div>
                <div className="series-info">
                  <div className="series-title">{movie.name}</div>
                  {movie.rating && (
                    <div className="series-rating">{movie.rating} ⭐</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MoviesContent;
