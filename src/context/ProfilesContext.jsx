/**
 * Focused profiles + IPTV-accounts view over the app store.
 *
 * Part of the incremental split of AppContext. FACADE for now (selects from
 * useApp()); a later phase moves the profile/account state + Supabase sync into
 * a real ProfilesProvider here without changing this hook's surface.
 */
import { useMemo } from "react";
import { useApp } from "./AppContext";

export function useProfiles() {
  const {
    appProfiles, activeProfileId, activeProfile,
    switchProfile, addProfile, updateProfile, removeProfile,
    users, setUsers, activeUserId, setActiveUserId,
    addUser, updateUser, removeUser, saveUsers,
  } = useApp();

  const activeUser = useMemo(
    () => users.find((u) => u.id === activeUserId) ?? null,
    [users, activeUserId],
  );

  return {
    appProfiles, activeProfileId, activeProfile,
    switchProfile, addProfile, updateProfile, removeProfile,
    users, setUsers, activeUserId, setActiveUserId, activeUser,
    addUser, updateUser, removeUser, saveUsers,
  };
}
