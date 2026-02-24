const PROXY_ENABLED = true;
const PROXY_URL = "http://localhost:5000/proxy";

class IPTVApi {
  constructor() {
    this.baseUrl = null;
    this.username = null;
    this.password = null;
  }

  setCredentials(host, username, password) {
    let cleanHost = host.replace(/^(https?:\/\/)/, "");
    cleanHost = cleanHost.replace(/\/$/, "");
    this.baseUrl = `http://${cleanHost}`;
    this.username = username;
    this.password = password;
  }

  buildUrl(action, params = {}) {
    const url = new URL(`${this.baseUrl}/player_api.php`);
    url.searchParams.append("username", this.username);
    url.searchParams.append("password", this.password);
    url.searchParams.append("action", action);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  }

  async fetch(url) {
    let fetchUrl = url;
    if (PROXY_ENABLED) {
      fetchUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
    }

    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getLiveStreams() {
    const url = this.buildUrl("get_live_streams");
    return this.fetch(url);
  }

  async getVODCategories() {
    const url = this.buildUrl("get_vod_categories");
    return this.fetch(url);
  }

  async getVODStreams(categoryId) {
    const url = this.buildUrl("get_vod_streams", { category_id: categoryId });
    return this.fetch(url);
  }

  async getSeriesCategories() {
    const url = this.buildUrl("get_series_categories");
    return this.fetch(url);
  }

  async getSeries(categoryId) {
    const url = this.buildUrl("get_series", { category_id: categoryId });
    return this.fetch(url);
  }

  async getSeriesInfo(seriesId) {
    const url = this.buildUrl("get_series_info", { series_id: seriesId });
    return this.fetch(url);
  }

  async getShortEpg(streamId, limit = 2) {
    const url = this.buildUrl("get_short_epg", {
      stream_id: streamId,
      limit,
    });
    return this.fetch(url);
  }

  buildStreamUrl(type, streamId, extension = "ts") {
    // type: 'live', 'movie', 'series'
    if (type === "live") {
      return `${this.baseUrl}/live/${this.username}/${this.password}/${streamId}.${extension}`;
    } else if (type === "movie") {
      return `${this.baseUrl}/movie/${this.username}/${this.password}/${streamId}.${extension}`;
    } else if (type === "series") {
      return `${this.baseUrl}/series/${this.username}/${this.password}/${streamId}.${extension}`;
    }
    return null;
  }
}

export default new IPTVApi();
