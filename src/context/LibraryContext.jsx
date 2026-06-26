/**
 * Focused library view (watch history + my list) over the app store.
 *
 * Part of the incremental split of AppContext. FACADE for now (selects from
 * useApp()); a later phase moves the history/favorites state + 5s debounced
 * Supabase sync into a real LibraryProvider here without changing this surface.
 */
import { useApp } from "./AppContext";

export function useLibrary() {
  const {
    watchHistory, addToWatchHistory, updateWatchProgress, removeFromWatchHistory, isSyncing,
    myList, addToMyList, removeFromMyList, isInMyList,
  } = useApp();

  return {
    watchHistory, addToWatchHistory, updateWatchProgress, removeFromWatchHistory, isSyncing,
    myList, addToMyList, removeFromMyList, isInMyList,
  };
}
