import iptvApi from "../../services/iptvApi";
import { normalizeCategory } from "../models/Category";
import { normalizeMovie, normalizeMovieInfo } from "../models/Movie";
import { normalizeSeries, normalizeSeriesInfo } from "../models/Series";
import { normalizeChannel } from "../models/Channel";

class ContentService {
  // ── Configuration ──────────────────────────────────────────────────────────

  /**
   * Point the service at an IPTV account. Pass null to clear.
   * Replaces callers reaching into iptvApi.setCredentials directly.
   * @param {{ host: string, username: string, password: string } | null} credentials
   */
  configure(credentials) {
    if (credentials) {
      iptvApi.setCredentials(credentials.host, credentials.username, credentials.password);
      this._configured = true;
    } else {
      this._configured = false;
    }
  }

  get isConfigured() {
    return this._configured === true;
  }

  // ── Live TV ──────────────────────────────────────────────────────────────

  async getLiveCategories() {
    const raw = await iptvApi.getLiveCategories();
    return (raw ?? []).map(normalizeCategory);
  }

  async getLiveChannels(categoryId) {
    const raw = categoryId
      ? await iptvApi.getLiveStreamsByCategory(categoryId)
      : await iptvApi.getLiveStreams();
    return (raw ?? []).map(normalizeChannel);
  }

  async getAllLiveChannels() {
    return this.getLiveChannels(null);
  }

  getShortEpg(streamId, limit = 2) {
    return iptvApi.getShortEpg(streamId, limit);
  }

  // ── Movies ───────────────────────────────────────────────────────────────

  async getMovieCategories() {
    const raw = await iptvApi.getVODCategories();
    return (raw ?? []).map(normalizeCategory);
  }

  async getMoviesByCategory(categoryId) {
    const raw = await iptvApi.getVODStreams(categoryId);
    return (raw ?? []).map(normalizeMovie);
  }

  async getAllMovies() {
    const raw = await iptvApi.getAllVODStreamsRobust();
    return (raw ?? []).map(normalizeMovie);
  }

  async getMovieInfo(movieId) {
    const raw = await iptvApi.getVODInfo(movieId);
    return normalizeMovieInfo(raw);
  }

  /** Raw VOD info ({ info: {...}, movie_data: {...} }) for views that render the
   *  provider's native shape directly (e.g. the TV detail screen). */
  getMovieInfoRaw(movieId) {
    return iptvApi.getVODInfo(movieId);
  }

  buildMovieUrl(movieId, containerExtension = "mp4") {
    return iptvApi.buildStreamUrl("movie", movieId, containerExtension);
  }

  // ── Series ───────────────────────────────────────────────────────────────

  async getSeriesCategories() {
    const raw = await iptvApi.getSeriesCategories();
    return (raw ?? []).map(normalizeCategory);
  }

  async getSeriesByCategory(categoryId) {
    const raw = await iptvApi.getSeries(categoryId);
    return (raw ?? []).map(normalizeSeries);
  }

  async getAllSeries() {
    const raw = await iptvApi.getAllSeriesRobust();
    return (raw ?? []).map(normalizeSeries);
  }

  async getSeriesInfo(seriesId) {
    const raw = await iptvApi.getSeriesInfo(seriesId);
    return normalizeSeriesInfo(raw);
  }

  buildEpisodeUrl(episodeId, containerExtension = "mkv") {
    return iptvApi.buildStreamUrl("series", episodeId, containerExtension);
  }

  buildLiveUrl(streamId, extension = "ts") {
    return iptvApi.buildStreamUrl("live", streamId, extension);
  }
}

export const contentService = new ContentService();
export default contentService;
