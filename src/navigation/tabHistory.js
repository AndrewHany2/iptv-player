/**
 * Tab-history stack for the TV/web navigator — pure mechanics behind the remote
 * Back key's "history -1" behavior. Kept framework-free (no React) so it can be
 * unit-tested in isolation; AppNavigator.web.jsx drives it from useState/useRef.
 *
 * Shape: { activeTab, stack } where `stack` is the ordered list of
 * previously-viewed tabs (oldest first). It behaves like browser history:
 * re-selecting the current tab is a no-op (no duplicate push), and Back pops the
 * most recent entry.
 */

/** Initial history rooted at `initialTab`, empty stack. */
export function createHistory(initialTab = "live") {
  return { activeTab: initialTab, stack: [] };
}

/** Navigate to `tab`, pushing the current tab onto the stack. Selecting the
 *  already-active tab returns the same history unchanged. */
export function go(history, tab) {
  if (history.activeTab === tab) return history;
  return { activeTab: tab, stack: [...history.stack, history.activeTab] };
}

/** Go back one entry. Pops the most recent tab off the stack and makes it
 *  active. With an empty stack the history is returned unchanged (no-op). */
export function back(history) {
  if (history.stack.length === 0) return history;
  return {
    activeTab: history.stack[history.stack.length - 1],
    stack: history.stack.slice(0, -1),
  };
}

/** True when there is somewhere to go back to. */
export function canGoBack(history) {
  return history.stack.length > 0;
}

/**
 * Decide what the remote Back key should do, given the current UI state. Pure so
 * AppNavigator can dispatch on the result and the precedence stays unit-tested.
 *
 * Precedence (highest first): an open exit prompt cancels itself, then the
 * Settings / Accounts modals close, then a non-empty tab stack pops one entry,
 * and finally — at the true root with nothing open and no history — Back asks
 * to exit the app. The key property is that there is NO silent no-op: every
 * Back press yields an action.
 *
 * @param {{ showExitPrompt?: boolean, showSettings?: boolean,
 *           showAccounts?: boolean, stack?: string[], activeTab?: string }} state
 * @returns {{ type: "closeExit" }
 *   | { type: "closeSettings" }
 *   | { type: "closeAccounts" }
 *   | { type: "popTab", activeTab: string, stack: string[] }
 *   | { type: "exitPrompt" }}
 */
export function resolveBack(state) {
  const { showExitPrompt, showSettings, showAccounts, stack = [], activeTab } =
    state || {};
  if (showExitPrompt) return { type: "closeExit" };
  if (showSettings) return { type: "closeSettings" };
  if (showAccounts) return { type: "closeAccounts" };
  if (stack.length > 0) {
    const next = back({ activeTab, stack });
    return { type: "popTab", activeTab: next.activeTab, stack: next.stack };
  }
  return { type: "exitPrompt" };
}
