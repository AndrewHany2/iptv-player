/**
 * Focused auth view over the app store.
 *
 * Part of the incremental split of the 418-line AppContext god object. For now
 * this is a FACADE: it selects auth-related values from useApp() so screens can
 * migrate to the narrow `useAuth()` API today. A later phase relocates the
 * state + Supabase listeners into a real AuthProvider here, transparently to
 * every caller that already uses this hook.
 */
import { useApp } from "./AppContext";

export function useAuth() {
  const { authUser, authLoading, profile, signIn, signUp, signOut } = useApp();
  return { authUser, authLoading, profile, signIn, signUp, signOut };
}
