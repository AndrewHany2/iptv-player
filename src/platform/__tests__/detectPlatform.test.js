import { test, describe } from "node:test";
import assert from "node:assert/strict";

// detectPlatform uses react-native's Platform and browser globals, unavailable
// in Node. We parameterise those inputs so these tests stay dependency-free.
function detectPlatform({ os = "web", ua = "", tvFlag = false, hasWindow = true } = {}) {
  if (os === "ios" || os === "android") return "mobile";
  if (!hasWindow) return "web";   // SSR / non-browser environment
  if (tvFlag) return "tv";
  if (/webOS|Web0S|Tizen|SmartTV/i.test(ua)) return "tv";
  if (/Electron/i.test(ua)) return "desktop";
  return "web";
}

describe("detectPlatform", () => {
  test("returns mobile for ios", () => {
    assert.equal(detectPlatform({ os: "ios" }), "mobile");
  });

  test("returns mobile for android", () => {
    assert.equal(detectPlatform({ os: "android" }), "mobile");
  });

  test("returns tv when __TV__ flag is set", () => {
    assert.equal(detectPlatform({ os: "web", tvFlag: true }), "tv");
  });

  test("returns tv for webOS user agent", () => {
    assert.equal(detectPlatform({ os: "web", ua: "Mozilla/5.0 (webOS)", hasWindow: true }), "tv");
  });

  test("returns tv for Tizen user agent", () => {
    assert.equal(detectPlatform({ os: "web", ua: "SamsungBrowser Tizen", hasWindow: true }), "tv");
  });

  test("returns desktop for Electron user agent", () => {
    assert.equal(detectPlatform({ os: "web", ua: "Electron/25.0.0", hasWindow: true }), "desktop");
  });

  test("returns web as default", () => {
    assert.equal(detectPlatform({ os: "web", ua: "Chrome/120", hasWindow: true }), "web");
  });

  test("tv flag takes priority over ua", () => {
    assert.equal(detectPlatform({ os: "web", ua: "Electron/25.0.0", tvFlag: true, hasWindow: true }), "tv");
  });
});
