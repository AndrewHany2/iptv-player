import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { nextDelay, stepCap, QUALITY_CAPS } from "./backoff.js";

describe("nextDelay", () => {
  test("with no jitter, follows exponential sequence base*factor^attempt", () => {
    const opts = { base: 1000, factor: 2, max: 15000, jitter: 0 };
    assert.equal(nextDelay(0, opts), 1000);
    assert.equal(nextDelay(1, opts), 2000);
    assert.equal(nextDelay(2, opts), 4000);
    assert.equal(nextDelay(3, opts), 8000);
  });

  test("caps at max", () => {
    const opts = { base: 1000, factor: 2, max: 15000, jitter: 0 };
    assert.equal(nextDelay(4, opts), 15000); // 16000 -> capped
    assert.equal(nextDelay(10, opts), 15000);
    assert.equal(nextDelay(100, opts), 15000);
  });

  test("sequence is monotonic up to cap (no jitter)", () => {
    const opts = { base: 1000, factor: 2, max: 15000, jitter: 0 };
    let prev = -1;
    for (let a = 0; a < 6; a++) {
      const d = nextDelay(a, opts);
      assert.ok(d >= prev, `attempt ${a} delay ${d} >= prev ${prev}`);
      prev = d;
    }
  });

  test("jitter stays within +/- bounds (inject rand=0 and rand=1)", () => {
    const opts = { base: 1000, factor: 2, max: 100000, jitter: 0.5 };
    // rand()=0 -> factor 1 + (0*2-1)*0.5 = 0.5  -> lower bound
    assert.equal(nextDelay(0, { ...opts, rand: () => 0 }), 500);
    // rand()=0.999.. -> factor ~1 + (1*2-1)*0.5 = 1.5 -> upper bound
    const hi = nextDelay(0, { ...opts, rand: () => 1 });
    assert.equal(hi, 1500);
    // rand()=0.5 -> no change
    assert.equal(nextDelay(0, { ...opts, rand: () => 0.5 }), 1000);
  });

  test("jittered value never exceeds max", () => {
    const opts = { base: 10000, factor: 2, max: 15000, jitter: 0.5, rand: () => 1 };
    assert.ok(nextDelay(1, opts) <= 15000);
  });

  test("never returns negative", () => {
    const opts = { base: 1000, factor: 2, max: 15000, jitter: 2, rand: () => 0 };
    assert.ok(nextDelay(0, opts) >= 0);
  });

  test("uses defaults when opts omitted", () => {
    const d = nextDelay(0, { rand: () => 0.5 });
    assert.equal(d, 1000); // base default 1000, factor^0
  });
});

describe("stepCap", () => {
  test("QUALITY_CAPS ordering high->low", () => {
    assert.deepEqual([...QUALITY_CAPS], ["auto", "1080", "720", "480", "data-saver"]);
  });

  test("down moves one rung toward lower quality", () => {
    assert.equal(stepCap("auto", "down"), "1080");
    assert.equal(stepCap("1080", "down"), "720");
    assert.equal(stepCap("720", "down"), "480");
    assert.equal(stepCap("480", "down"), "data-saver");
  });

  test("down is bounded at the lowest rung", () => {
    assert.equal(stepCap("data-saver", "down"), "data-saver");
  });

  test("up moves one rung toward higher quality", () => {
    assert.equal(stepCap("data-saver", "up"), "480");
    assert.equal(stepCap("480", "up"), "720");
    assert.equal(stepCap("720", "up"), "1080");
    assert.equal(stepCap("1080", "up"), "auto");
  });

  test("up is bounded at the top rung when no manual cap", () => {
    assert.equal(stepCap("auto", "up"), "auto");
  });

  test("up never rises above the manual ceiling", () => {
    // manual ceiling = 720: cannot step up past 720.
    assert.equal(stepCap("720", "up", "720"), "720");
    assert.equal(stepCap("480", "up", "720"), "720");
    // already below ceiling, stepping up stops at ceiling.
    assert.equal(stepCap("data-saver", "up", "720"), "480");
    assert.equal(stepCap("480", "up", "720"), "720");
  });

  test("down still allowed below the manual ceiling", () => {
    assert.equal(stepCap("720", "down", "720"), "480");
    assert.equal(stepCap("480", "down", "1080"), "data-saver");
  });

  test("unknown current cap falls back to manual ceiling or top", () => {
    assert.equal(stepCap("garbage", "down"), "auto");
    assert.equal(stepCap("garbage", "up", "720"), "720");
  });
});
