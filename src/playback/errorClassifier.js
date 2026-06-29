// @ts-check
/**
 * Maps a normalized raw player error into a coarse ErrorClass the recovery
 * machine reasons about. PURE: no side effects, no engine imports.
 *
 * The `raw` object is a normalized shape (see drivers/types.js NormalizedError)
 * that both hls.js and expo-video errors are flattened into by the drivers:
 *   { httpStatus?, type?, fatal?, offline?, kind? }
 *
 * Mapping table (first match wins, top to bottom):
 *
 *   condition                                              -> ErrorClass
 *   ----------------------------------------------------------------------
 *   offline flag truthy                                    -> OFFLINE
 *   httpStatus 404, or kind 'manifest-removed'/'gone'      -> GONE
 *   httpStatus 401 or 403, or kind 'auth'/'auth-expired'   -> AUTH_EXPIRED
 *   kind 'media'/'decode', or hls type 'mediaError'        -> MEDIA_DECODE
 *   kind 'stall'/'buffer-underrun', or hls 'bufferStall*'  -> STALL
 *   httpStatus 5xx, or kind 'timeout'/'segment'/'fetch'/   -> TRANSIENT_NETWORK
 *     'network', or hls type 'networkError'
 *   anything else (unknown)                                -> TRANSIENT_NETWORK
 *
 * Default bias is TRANSIENT_NETWORK ("keep trying") so unknown failures never
 * strand the user on a fatal screen.
 */

/**
 * @readonly
 * @enum {string}
 */
export const ErrorClass = {
  TRANSIENT_NETWORK: 'TRANSIENT_NETWORK',
  STALL: 'STALL',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  MEDIA_DECODE: 'MEDIA_DECODE',
  OFFLINE: 'OFFLINE',
  GONE: 'GONE',
};

/**
 * @param {string|undefined|null} v
 * @returns {string}
 */
function lower(v) {
  return typeof v === 'string' ? v.toLowerCase() : '';
}

/**
 * Classify a normalized raw error.
 *
 * @param {{httpStatus?: number, type?: string, fatal?: boolean, offline?: boolean, kind?: string}} [raw]
 * @returns {string} One of ErrorClass.*
 */
export function classifyError(raw) {
  const r = raw || {};
  const status = typeof r.httpStatus === 'number' ? r.httpStatus : undefined;
  const type = lower(r.type);
  const kind = lower(r.kind);

  // Offline trumps everything: there is no point classifying the HTTP error.
  if (r.offline === true || kind === 'offline') {
    return ErrorClass.OFFLINE;
  }

  // Gone: resource permanently unavailable.
  if (status === 404 || kind === 'manifest-removed' || kind === 'gone') {
    return ErrorClass.GONE;
  }

  // Auth: refreshable once, then fatal (handled by the machine).
  if (status === 401 || status === 403 || kind === 'auth' || kind === 'auth-expired') {
    return ErrorClass.AUTH_EXPIRED;
  }

  // Media / decode errors.
  if (kind === 'media' || kind === 'decode' || type === 'mediaerror') {
    return ErrorClass.MEDIA_DECODE;
  }

  // Stall / buffer underrun.
  if (
    kind === 'stall' ||
    kind === 'buffer-underrun' ||
    kind === 'bufferstall' ||
    type === 'bufferstall' ||
    type === 'bufferstallerror'
  ) {
    return ErrorClass.STALL;
  }

  // Transient network: 5xx, timeouts, dropped segments, fetch failures.
  if (
    (typeof status === 'number' && status >= 500 && status <= 599) ||
    kind === 'timeout' ||
    kind === 'segment' ||
    kind === 'fetch' ||
    kind === 'network' ||
    type === 'networkerror'
  ) {
    return ErrorClass.TRANSIENT_NETWORK;
  }

  // Unknown: keep-trying bias.
  return ErrorClass.TRANSIENT_NETWORK;
}
