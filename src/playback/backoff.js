// @ts-check
/**
 * Exponential backoff + quality-downgrade ladder.
 *
 * PURE module: no timers, no side effects, no engine imports. Used by the
 * recoveryMachine to compute retry delays and quality steps as plain numbers /
 * strings the host can act on.
 */

/**
 * Compute the delay (ms) before the Nth retry attempt using exponential
 * backoff with symmetric jitter, capped at `max`.
 *
 * The un-jittered base delay for an attempt is `base * factor^attempt`, clamped
 * to `max`. Jitter then scales that delay by a random factor in
 * `[1 - jitter, 1 + jitter]`. The final value is clamped to `[0, max]`.
 *
 * `attempt` is zero-based: attempt 0 is the first retry.
 *
 * Pass a deterministic `rand` (returning [0,1)) to make jitter testable.
 *
 * @param {number} attempt - Zero-based retry attempt index.
 * @param {Object} [opts]
 * @param {number} [opts.base=1000]   - Base delay in ms for attempt 0.
 * @param {number} [opts.max=15000]   - Maximum delay in ms (hard cap).
 * @param {number} [opts.factor=2]    - Exponential growth factor.
 * @param {number} [opts.jitter=0.5]  - Fractional jitter (0 = none, 0.5 = +/-50%).
 * @param {() => number} [opts.rand=Math.random] - RNG returning [0,1), injectable for tests.
 * @returns {number} Delay in milliseconds, in [0, max].
 */
export function nextDelay(attempt, opts = {}) {
  const {
    base = 1000,
    max = 15000,
    factor = 2,
    jitter = 0.5,
    rand = Math.random,
  } = opts;

  const a = attempt < 0 ? 0 : attempt;
  const raw = base * Math.pow(factor, a);
  const capped = Math.min(raw, max);

  // Symmetric jitter: scale by [1 - jitter, 1 + jitter].
  const j = 1 + (rand() * 2 - 1) * jitter;
  const delay = capped * j;

  // Clamp to [0, max].
  if (delay < 0) return 0;
  if (delay > max) return max;
  return delay;
}

/**
 * Quality cap ladder, ordered from highest quality (index 0) to lowest
 * (last index). Stepping "down" moves toward lower quality / lower bitrate
 * (higher index); stepping "up" moves toward higher quality (lower index).
 *
 * Ordering (high -> low):
 *   'auto' > '1080' > '720' > '480' > 'data-saver'
 *
 * Note: 'auto' sits at the top because it allows the engine to pick the best
 * level. Auto-downgrade steps away from 'auto' toward an explicit ceiling.
 *
 * @type {readonly string[]}
 */
export const QUALITY_CAPS = ['auto', '1080', '720', '480', 'data-saver'];

/**
 * Step the current quality cap one rung in the given direction, bounded by the
 * array and (optionally) by a user-pinned manual ceiling.
 *
 * The manual ceiling is the *best* quality the user permits. Auto-stepping must
 * never raise quality above it: the result index is never smaller (higher
 * quality) than the manual cap's index. Stepping down (lower quality) is always
 * allowed within array bounds.
 *
 * @param {string} currentCap - Current cap, one of QUALITY_CAPS.
 * @param {'up'|'down'} direction - 'down' = lower quality, 'up' = higher quality.
 * @param {string} [manualCap] - User-pinned ceiling (best allowed quality). Optional.
 * @returns {string} The next cap value (unchanged if already at a bound).
 */
export function stepCap(currentCap, direction, manualCap) {
  const idx = QUALITY_CAPS.indexOf(currentCap);
  // Unknown current cap: fall back to the manual ceiling, else the top.
  if (idx === -1) {
    return manualCap && QUALITY_CAPS.includes(manualCap) ? manualCap : QUALITY_CAPS[0];
  }

  // Manual ceiling clamps the *highest* quality (smallest index) allowed.
  const ceilingIdx =
    manualCap && QUALITY_CAPS.includes(manualCap) ? QUALITY_CAPS.indexOf(manualCap) : 0;

  let nextIdx = direction === 'down' ? idx + 1 : idx - 1;

  // Bound by array.
  if (nextIdx < 0) nextIdx = 0;
  if (nextIdx > QUALITY_CAPS.length - 1) nextIdx = QUALITY_CAPS.length - 1;

  // Never step above the manual ceiling (never to a smaller index than it).
  if (nextIdx < ceilingIdx) nextIdx = ceilingIdx;

  return QUALITY_CAPS[nextIdx];
}
