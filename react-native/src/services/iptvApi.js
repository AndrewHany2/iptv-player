class IPTVApi {
  constructor() {
    this.baseUrl = null;
    this.username = null;
    this.password = null;
  }

  setCredentials(host, username, password) {
    let cleanHost = host.replace(/^(https?:\/\/)/, '');
    cleanHost = cleanHost.replace(/\/$/, '');
    this.baseUrl = `http://${cleanHost}`;
    this.username = username;
    this.password = password;
  }

  buildUrl(action, params = {}) {
    let url = `${this.baseUrl}/player_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}&action=${encodeURIComponent(action)}`;
    Object.entries(params).forEach(([key, value]) => {
      url += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    });
    return url;
  }

  async fetch(url) {
    const response = await globalThis.fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getLiveStreams() {
    return this.fetch(this.buildUrl('get_live_streams'));
  }

  async getVODCategories() {
    return this.fetch(this.buildUrl('get_vod_categories'));
  }

  async getVODStreams(categoryId) {
    return this.fetch(this.buildUrl('get_vod_streams', { category_id: categoryId }));
  }

  async getSeriesCategories() {
    return this.fetch(this.buildUrl('get_series_categories'));
  }

  async getSeries(categoryId) {
    return this.fetch(this.buildUrl('get_series', { category_id: categoryId }));
  }

  async getSeriesInfo(seriesId) {
    return this.fetch(this.buildUrl('get_series_info', { series_id: seriesId }));
  }

  async getShortEpg(streamId, limit = 2) {
    return this.fetch(this.buildUrl('get_short_epg', { stream_id: streamId, limit }));
  }

  buildStreamUrl(type, streamId, extension = 'ts') {
    if (type === 'live') {
      return `${this.baseUrl}/live/${this.username}/${this.password}/${streamId}.${extension}`;
    } else if (type === 'movie') {
      return `${this.baseUrl}/movie/${this.username}/${this.password}/${streamId}.${extension}`;
    } else if (type === 'series') {
      return `${this.baseUrl}/series/${this.username}/${this.password}/${streamId}.${extension}`;
    }
    return null;
  }
}

export default new IPTVApi();
