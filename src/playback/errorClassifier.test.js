import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { classifyError, ErrorClass } from "./errorClassifier.js";

describe("classifyError", () => {
  test("offline flag -> OFFLINE (trumps everything)", () => {
    assert.equal(classifyError({ offline: true }), ErrorClass.OFFLINE);
    assert.equal(classifyError({ offline: true, httpStatus: 404 }), ErrorClass.OFFLINE);
    assert.equal(classifyError({ kind: "offline" }), ErrorClass.OFFLINE);
  });

  test("404 / manifest-removed -> GONE", () => {
    assert.equal(classifyError({ httpStatus: 404 }), ErrorClass.GONE);
    assert.equal(classifyError({ kind: "manifest-removed" }), ErrorClass.GONE);
    assert.equal(classifyError({ kind: "gone" }), ErrorClass.GONE);
  });

  test("401 / 403 / auth -> AUTH_EXPIRED", () => {
    assert.equal(classifyError({ httpStatus: 401 }), ErrorClass.AUTH_EXPIRED);
    assert.equal(classifyError({ httpStatus: 403 }), ErrorClass.AUTH_EXPIRED);
    assert.equal(classifyError({ kind: "auth" }), ErrorClass.AUTH_EXPIRED);
    assert.equal(classifyError({ kind: "auth-expired" }), ErrorClass.AUTH_EXPIRED);
  });

  test("media / decode / hls mediaError -> MEDIA_DECODE", () => {
    assert.equal(classifyError({ kind: "media" }), ErrorClass.MEDIA_DECODE);
    assert.equal(classifyError({ kind: "decode" }), ErrorClass.MEDIA_DECODE);
    assert.equal(classifyError({ type: "mediaError" }), ErrorClass.MEDIA_DECODE);
  });

  test("stall / buffer-underrun / bufferStall -> STALL", () => {
    assert.equal(classifyError({ kind: "stall" }), ErrorClass.STALL);
    assert.equal(classifyError({ kind: "buffer-underrun" }), ErrorClass.STALL);
    assert.equal(classifyError({ type: "bufferStallError" }), ErrorClass.STALL);
  });

  test("5xx / timeout / segment / fetch / network / hls networkError -> TRANSIENT_NETWORK", () => {
    assert.equal(classifyError({ httpStatus: 500 }), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ httpStatus: 503 }), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ httpStatus: 599 }), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ kind: "timeout" }), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ kind: "segment" }), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ kind: "fetch" }), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ kind: "network" }), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ type: "networkError" }), ErrorClass.TRANSIENT_NETWORK);
  });

  test("unknown -> TRANSIENT_NETWORK (keep-trying bias)", () => {
    assert.equal(classifyError({}), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError(), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ kind: "weird-unmapped" }), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ httpStatus: 418 }), ErrorClass.TRANSIENT_NETWORK);
  });

  test("classification is case-insensitive on type/kind", () => {
    assert.equal(classifyError({ type: "NetworkError" }), ErrorClass.TRANSIENT_NETWORK);
    assert.equal(classifyError({ kind: "AUTH" }), ErrorClass.AUTH_EXPIRED);
  });
});
