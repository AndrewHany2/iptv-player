import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { createHistory, go, back, canGoBack, resolveBack } from "./tabHistory.js";

describe("createHistory", () => {
  test("defaults to live with empty stack", () => {
    const h = createHistory();
    assert.equal(h.activeTab, "live");
    assert.deepEqual(h.stack, []);
    assert.equal(canGoBack(h), false);
  });

  test("honors an explicit initial tab", () => {
    const h = createHistory("movies");
    assert.equal(h.activeTab, "movies");
    assert.deepEqual(h.stack, []);
  });
});

describe("go", () => {
  test("pushes the previous tab onto the stack", () => {
    let h = createHistory();
    h = go(h, "movies");
    assert.equal(h.activeTab, "movies");
    assert.deepEqual(h.stack, ["live"]);
    h = go(h, "series");
    assert.equal(h.activeTab, "series");
    assert.deepEqual(h.stack, ["live", "movies"]);
  });

  test("re-selecting the active tab is a no-op (no duplicate push)", () => {
    let h = go(createHistory(), "movies");
    const before = h;
    h = go(h, "movies");
    assert.equal(h, before, "should return the same object unchanged");
    assert.deepEqual(h.stack, ["live"]);
  });

  test("does not mutate the input history", () => {
    const h = createHistory();
    go(h, "movies");
    assert.deepEqual(h.stack, [], "original stack must be untouched");
  });
});

describe("back", () => {
  test("pops to the previous tab", () => {
    let h = createHistory();
    h = go(h, "movies");
    h = go(h, "series");
    h = back(h);
    assert.equal(h.activeTab, "movies");
    assert.deepEqual(h.stack, ["live"]);
    h = back(h);
    assert.equal(h.activeTab, "live");
    assert.deepEqual(h.stack, []);
  });

  test("is a no-op on empty history", () => {
    const h = createHistory();
    const after = back(h);
    assert.equal(after, h, "should return the same object unchanged");
    assert.equal(after.activeTab, "live");
  });

  test("does not mutate the input history", () => {
    const h = go(createHistory(), "movies");
    back(h);
    assert.deepEqual(h.stack, ["live"], "original stack must be untouched");
  });
});

describe("scenarios", () => {
  test("deep path unwinds in order", () => {
    let h = createHistory();
    for (const t of ["movies", "series", "home"]) h = go(h, t);
    assert.equal(h.activeTab, "home");
    assert.deepEqual(h.stack, ["live", "movies", "series"]);

    h = back(h); assert.equal(h.activeTab, "series");
    h = back(h); assert.equal(h.activeTab, "movies");
    h = back(h); assert.equal(h.activeTab, "live");
    h = back(h); assert.equal(h.activeTab, "live", "stays put at root");
  });

  test("revisiting a tab retraces every step (browser-like, no dedupe)", () => {
    let h = createHistory();
    h = go(h, "movies");
    h = go(h, "live");
    h = go(h, "movies");
    assert.deepEqual(h.stack, ["live", "movies", "live"]);
    h = back(h); assert.equal(h.activeTab, "live");
    h = back(h); assert.equal(h.activeTab, "movies");
    h = back(h); assert.equal(h.activeTab, "live");
  });
});

describe("resolveBack", () => {
  test("at the true root (no modal, empty stack) asks to exit — never a no-op", () => {
    assert.deepEqual(
      resolveBack({ stack: [], activeTab: "live" }),
      { type: "exitPrompt" },
    );
    // Defensive: missing/empty state still yields an action.
    assert.deepEqual(resolveBack(), { type: "exitPrompt" });
    assert.deepEqual(resolveBack({}), { type: "exitPrompt" });
  });

  test("an open exit prompt cancels itself first", () => {
    assert.deepEqual(
      resolveBack({ showExitPrompt: true, showSettings: true, stack: ["live"] }),
      { type: "closeExit" },
    );
  });

  test("Settings closes before Accounts and before popping", () => {
    assert.deepEqual(
      resolveBack({ showSettings: true, showAccounts: true, stack: ["live"] }),
      { type: "closeSettings" },
    );
  });

  test("Accounts closes before popping the tab stack", () => {
    assert.deepEqual(
      resolveBack({ showAccounts: true, stack: ["live"] }),
      { type: "closeAccounts" },
    );
  });

  test("with a non-empty stack and no modal, pops the previous tab", () => {
    assert.deepEqual(
      resolveBack({ stack: ["live", "movies"], activeTab: "series" }),
      { type: "popTab", activeTab: "movies", stack: ["live"] },
    );
  });
});
