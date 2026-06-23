import { useMemo } from "react";
import { useApp } from "../../context/AppContext";
import iptvApi from "../../services/iptvApi";
import { contentService } from "../services/ContentService";

/**
 * Returns contentService pre-configured with the active user's credentials.
 * Also exposes the active user for convenience.
 */
export function useContentService() {
  const { users, activeUserId } = useApp();

  const activeUser = useMemo(
    () => users.find((u) => u.id === activeUserId) ?? null,
    [users, activeUserId],
  );

  // Keep iptvApi credentials in sync whenever the active user changes.
  // ContentService delegates to iptvApi so this is sufficient.
  useMemo(() => {
    if (activeUser) {
      iptvApi.setCredentials(activeUser.host, activeUser.username, activeUser.password);
    }
  }, [activeUser]);

  return { contentService, activeUser, activeUserId };
}
