import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, SectionList, TextInput,
} from 'react-native';
import { useApp } from '../context/AppContext';
import iptvApi from '../services/iptvApi';

const formatTimeLeft = (cur, dur) => {
  if (!dur || !cur) return null;
  const left = dur - cur;
  if (left <= 60) return null;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

/* ─── Continue Watching Card ─── */
function CWCard({ item, onPress }) {
  const progress = item.duration > 0 ? Math.min((item.currentTime / item.duration) * 100, 100) : 15;
  const timeLeft = formatTimeLeft(item.currentTime, item.duration);
  const epLabel = item.seasonNum && item.episodeNum
    ? `S${item.seasonNum} · E${String(item.episodeNum).padStart(2, '0')}` : null;
  const bg = item.cover || item.movie_image || item.stream_icon || null;
  const showTitle = item.seriesName || item.name;

  return (
    <TouchableOpacity style={cwStyles.card} onPress={onPress} {...({ className: 'lumen-cw-card' })}>
      <View style={cwStyles.inner}>
        {bg ? (
          <Image source={{ uri: bg }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, cwStyles.noBg]} />
        )}
        <View style={[StyleSheet.absoluteFillObject, { background: 'linear-gradient(to top right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0) 100%)' }]} />
        {item.seasonNum && (
          <View style={cwStyles.season}><Text style={cwStyles.seasonText}>S{item.seasonNum}</Text></View>
        )}
        <div className="lumen-cw-play">▶</div>
        <View style={cwStyles.bottom}>
          <Text style={cwStyles.title} numberOfLines={1}>{showTitle?.toUpperCase()}</Text>
          <View style={cwStyles.bar}><View style={[cwStyles.barFill, { width: `${progress}%` }]} /></View>
        </View>
      </View>
      <View style={cwStyles.meta}>
        <Text style={cwStyles.name} numberOfLines={1}>{showTitle}</Text>
        {epLabel && <Text style={cwStyles.epLine}>{epLabel}</Text>}
        {timeLeft && <Text style={cwStyles.timeLeft}>{timeLeft}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const cwStyles = StyleSheet.create({
  card: { width: 320, flexShrink: 0 },
  inner: { width: 320, height: 180, borderRadius: 8, backgroundColor: '#16213e', overflow: 'hidden' },
  noBg: { backgroundColor: '#16213e' },
  season: { position: 'absolute', top: 10, left: 12, zIndex: 4 },
  seasonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 4, paddingHorizontal: 12 },
  title: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3, marginBottom: 6 },
  bar: { height: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  barFill: { height: '100%', backgroundColor: '#e94560' },
  meta: { paddingTop: 10, paddingHorizontal: 2 },
  name: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  epLine: { color: '#888', fontSize: 12, marginBottom: 2 },
  timeLeft: { color: '#888', fontSize: 12 },
});

const getTrailerUrl = (trailer) => {
  if (!trailer) return null;
  const match = trailer.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  if (/^[A-Za-z0-9_-]{11}$/.test(trailer.trim()))
    return `https://www.youtube-nocookie.com/embed/${trailer.trim()}`;
  return null;
};

/* ─── Series Details Page ─── */
function SeriesDetailsPage({ series, seriesInfo, loading, onBack, onBrowseEpisodes, cwItem, onContinue }) {
  const [showTrailer, setShowTrailer] = useState(false);
  const data = seriesInfo || {};
  const backdrop = data.backdrop_path?.[0] || data.cover || series.cover || null;
  const trailer = getTrailerUrl(data.youtube_trailer);
  const year = (data.release_date || data.releasedate || '').slice(0, 4);

  return (
    <ScrollView style={detailStyles.root} contentContainerStyle={detailStyles.scroll}>
      <View style={detailStyles.hero}>
        {backdrop
          ? <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#16213e' }]} />
        }
        <View style={[StyleSheet.absoluteFillObject, { background: 'linear-gradient(to top, #0f0f23 0%, rgba(15,15,35,0.6) 55%, rgba(15,15,35,0.15) 100%)' }]} />
        <TouchableOpacity style={detailStyles.backBtn} onPress={onBack}>
          <Text style={detailStyles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={detailStyles.heroBody}>
          <Text style={detailStyles.title}>{series.name}</Text>
          {loading ? (
            <ActivityIndicator color="#e94560" style={{ marginVertical: 12 }} />
          ) : (
            <>
              <View style={detailStyles.chips}>
                {year ? <View style={detailStyles.chip}><Text style={detailStyles.chipText}>{year}</Text></View> : null}
                {data.genre ? <View style={detailStyles.chip}><Text style={detailStyles.chipText}>{data.genre.split(',')[0].trim()}</Text></View> : null}
                {data.rating ? <Text style={detailStyles.rating}>⭐ {parseFloat(data.rating).toFixed(1)}</Text> : null}
              </View>
            </>
          )}
          <View style={detailStyles.actions}>
            {cwItem && onContinue && (
              <TouchableOpacity style={detailStyles.playBtn} onPress={onContinue}>
                <Text style={detailStyles.playBtnText}>
                  {'▶  Continue'}
                  {cwItem.seasonNum ? ` S${cwItem.seasonNum}E${String(cwItem.episodeNum).padStart(2, '0')}` : ''}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={cwItem ? detailStyles.trailerBtn : detailStyles.playBtn} onPress={onBrowseEpisodes}>
              <Text style={cwItem ? detailStyles.trailerBtnText : detailStyles.playBtnText}>▶  Browse Episodes</Text>
            </TouchableOpacity>
            {!loading && trailer && (
              <TouchableOpacity style={detailStyles.trailerBtn} onPress={() => setShowTrailer(v => !v)}>
                <Text style={detailStyles.trailerBtnText}>{showTrailer ? '✕  Close' : '🎬  Trailer'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {showTrailer && trailer && (
        <View style={detailStyles.trailerWrap}>
          <iframe
            src={`${trailer}?autoplay=1`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: 420, border: 'none', borderRadius: 8 }}
          />
        </View>
      )}

      {(data.plot || data.description || data.overview || data.cast || data.director) && (
        <View style={detailStyles.meta}>
          {(data.plot || data.description || data.overview) ? (
            <Text style={detailStyles.metaPlot}>{data.plot || data.description || data.overview}</Text>
          ) : null}
          {data.cast ? <Text style={detailStyles.metaRow}><Text style={detailStyles.metaLabel}>Cast  </Text>{data.cast}</Text> : null}
          {data.director ? <Text style={detailStyles.metaRow}><Text style={detailStyles.metaLabel}>Director  </Text>{data.director}</Text> : null}
        </View>
      )}
    </ScrollView>
  );
}

const detailStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f23' },
  scroll: { paddingBottom: 80 },
  hero: { width: '100%', height: 520, position: 'relative' },
  backBtn: { position: 'absolute', top: 20, left: 48, zIndex: 10, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8 },
  backText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  heroBody: { position: 'absolute', bottom: 0, left: 48, right: 48, zIndex: 5, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: -1, marginBottom: 12 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#3a3a5e', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: '#aaa', fontSize: 12 },
  rating: { color: '#ffd700', fontSize: 13, fontWeight: '600' },
  desc: { color: '#ccc', fontSize: 15, lineHeight: 23, marginBottom: 24, maxWidth: 640 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playBtn: { backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 8 },
  playBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  trailerBtn: { backgroundColor: 'rgba(40,40,60,0.85)', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 8, borderWidth: 1, borderColor: '#3a3a5e' },
  trailerBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  trailerWrap: { paddingHorizontal: 48, paddingTop: 8, paddingBottom: 24 },
  meta: { paddingHorizontal: 48, paddingTop: 24, gap: 10 },
  metaPlot: { color: '#ccc', fontSize: 15, lineHeight: 24, marginBottom: 12 },
  metaRow: { color: '#aaa', fontSize: 14, lineHeight: 20 },
  metaLabel: { color: '#fff', fontWeight: '700' },
});

/* ─── Poster Card ─── */
function PosterCard({ item, onPress }) {
  const poster = item.cover || item.backdrop_path || item.stream_icon || null;
  return (
    <TouchableOpacity
      style={styles.poster}
      onPress={() => onPress(item)}
      {...({ className: 'lumen-poster' })}
    >
      {poster ? (
        <Image source={{ uri: poster }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.posterNoBg]} />
      )}

      <View style={StyleSheet.absoluteFillObject} {...({ className: 'lumen-poster-gradient' })} />

      <View style={styles.hdBadge}>
        <Text style={styles.hdText}>HD</Text>
      </View>

      <View style={styles.posterBottom}>
        <View style={styles.accentBar} />
        <Text style={styles.posterTitle} numberOfLines={3}>{item.name?.toUpperCase()}</Text>
        {item.rating ? <Text style={styles.posterMeta}>⭐ {item.rating}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}


const SHELF_PAGE = typeof window !== 'undefined' ? Math.ceil(window.innerWidth / 200) + 2 : 10;
const GRID_PAGE = 40;

/* ─── Shelf — lazy-loads when visible, parent drives pagination ─── */
function Shelf({ catId, title, items, totalCount, hasMore, loadingMore, onVisible, onPress, onTitlePress, onLoadMore, manual }) {
  const sentinelRef = useRef(null);
  const railRef = useRef(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);
  const hasDragged = useRef(false);
  useEffect(() => {
    if (items !== null) return;
    if (manual) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { onVisible(catId); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { obs.disconnect(); onVisible(catId); } },
      { rootMargin: '300px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [catId, items, onVisible, manual]);

  if (items !== null && !items?.length) return null;

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onMouseDown = (e) => {
      isDragging.current = true;
      hasDragged.current = false;
      dragStartX.current = e.pageX;
      dragStartLeft.current = el.scrollLeft;
      el.style.cursor = 'grabbing';
    };
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.pageX - dragStartX.current;
      if (Math.abs(dx) > 4) { hasDragged.current = true; el.scrollLeft = dragStartLeft.current - dx; }
    };
    const onMouseUp = () => { isDragging.current = false; el.style.cursor = 'grab'; };
    const onClickCapture = (e) => {
      if (hasDragged.current) { hasDragged.current = false; e.stopPropagation(); e.preventDefault(); }
    };
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('click', onClickCapture, true);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [items !== null]);

  const scrollBy = (delta) => {
    const el = railRef.current;
    if (el) el.scrollLeft = Math.max(0, el.scrollLeft + delta);
  };

  const handleScroll = (e) => {
    if (!hasMore || loadingMore) return;
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    if (scrollWidth - scrollLeft - clientWidth < 500) onLoadMore(catId);
  };

  return (
    <View style={styles.shelf}>
      <div ref={sentinelRef} style={{ height: 0 }} />
      <View style={styles.shelfHead}>
        <TouchableOpacity onPress={() => onTitlePress && onTitlePress(catId, title)} {...({ className: 'lumen-shelf-title-btn' })}>
          <Text style={styles.shelfTitle}>{title} <Text style={styles.shelfTitleArrow}>›</Text></Text>
        </TouchableOpacity>
        {totalCount != null && <Text style={styles.shelfCount}>{totalCount}</Text>}
      </View>
      {items === null ? (
        <View style={styles.shelfLoading}>
          {manual ? (
            <TouchableOpacity
              style={styles.loadAllBtn}
              onPress={() => onTitlePress && onTitlePress(catId, title)}
            >
              <Text style={styles.loadAllBtnText}>Load All</Text>
            </TouchableOpacity>
          ) : (
            <ActivityIndicator size="small" color="#e94560" />
          )}
        </View>
      ) : (
        <div style={{ position: 'relative' }} className="lumen-shelf-rail">
          <button className="lumen-shelf-nav" onClick={() => scrollBy(-800)}>‹</button>
          <div
            ref={railRef}
            onScroll={handleScroll}
            style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingLeft: 48, paddingRight: 48, scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'grab' }}
          >
            {items.map((item) => (
              <PosterCard key={String(item.series_id)} item={item} onPress={onPress} />
            ))}
            {loadingMore && (
              <View style={[styles.seeMoreCard, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="small" color="#e94560" />
              </View>
            )}
          </div>
          <button className="lumen-shelf-nav right" onClick={() => scrollBy(800)}>›</button>
        </div>
      )}
    </View>
  );
}

const getEpisodeNumber = (episode) => {
  let num = episode.episode_num;
  if (episode.title) {
    const m = episode.title.match(/S\d+E(\d+)/i) || episode.title.match(/E(\d+)/i);
    if (m?.[1]) num = m[1];
  }
  return num;
};

/* ─── Category Page — paginates 40 items at a time, with search ─── */
function CategoryPage({ name, items, onBack, onPress }) {
  const [displayCount, setDisplayCount] = useState(GRID_PAGE);
  const [search, setSearch] = useState('');

  const filtered = items
    ? (search.trim() ? items.filter((i) => i.name?.toLowerCase().includes(search.toLowerCase())) : items)
    : null;
  const displayed = filtered ? filtered.slice(0, displayCount) : null;
  const hasMore = filtered && displayCount < filtered.length;

  useEffect(() => { setDisplayCount(GRID_PAGE); }, [search]);

  const handleScroll = ({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
    if (hasMore && contentSize.height - contentOffset.y - layoutMeasurement.height < 800) {
      setDisplayCount((c) => Math.min(c + GRID_PAGE, filtered.length));
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.catHeader}>
        <TouchableOpacity style={styles.catBackBtn} onPress={onBack}>
          <Text style={styles.catBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.catPageTitle}>{name}</Text>
        {filtered != null && (
          <View style={styles.catCountBadge}>
            <Text style={styles.catCount}>{filtered.length.toLocaleString()}</Text>
          </View>
        )}
        <TextInput
          style={styles.catSearch}
          placeholder="Search titles..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {!displayed ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#e94560" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.catGrid} onScroll={handleScroll} scrollEventThrottle={200}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 200px)', gap: 12, justifyContent: 'center' }}>
            {displayed.map((item) => (
              <PosterCard key={String(item.series_id)} item={item} onPress={onPress} />
            ))}
          </div>
          {hasMore && (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="small" color="#e94560" />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/* ─── Screen ─── */
export default function SeriesScreen({ navigation }) {
  const { users, activeUserId, playVideo, watchHistory } = useApp();

  const [loading, setLoading] = useState(false);
  const [shelves, setShelves] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [categoryItems, setCategoryItems] = useState(null);
  const [currentSeries, setCurrentSeries] = useState(null);
  const [seriesSeasons, setSeriesSeasons] = useState({});
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const loadedRef = useRef(new Set());
  const allShuffledRef = useRef([]);

  useEffect(() => { if (activeUserId) load(); }, [activeUserId]);

  const load = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    setLoading(true);
    loadedRef.current.clear();
    setShelves([]);
    try {
      iptvApi.setCredentials(user.host, user.username, user.password);
      const cats = await iptvApi.getSeriesCategories();
      if (!cats?.length) { setLoading(false); return; }
      setShelves([
        { id: 'all', name: 'All', items: null, totalCount: null, hasMore: false, loadingMore: false },
        ...cats.map((c) => ({ id: c.category_id, name: c.category_name, items: null, totalCount: null, hasMore: false, loadingMore: false })),
      ]);
    } catch (err) {
      console.error('Error loading series:', err);
    } finally {
      setLoading(false);
    }
  };

  // Loads first page only into state; full result stays in iptvApi cache
  const handleShelfVisible = useCallback(async (catId) => {
    if (loadedRef.current.has(catId)) return;
    loadedRef.current.add(catId);
    try {
      let all;
      if (catId === 'all') {
        const series = await iptvApi.getAllSeries();
        all = [...(series || [])].sort(() => Math.random() - 0.5);
        allShuffledRef.current = all;
      } else {
        const series = await iptvApi.getSeries(catId);
        all = series || [];
      }
      const firstPage = all.slice(0, SHELF_PAGE);
      setShelves((prev) => prev.map((s) => s.id === catId
        ? { ...s, items: firstPage, totalCount: all.length, hasMore: all.length > SHELF_PAGE }
        : s
      ));
    } catch {
      setShelves((prev) => prev.map((s) => s.id === catId ? { ...s, items: [], totalCount: 0, hasMore: false } : s));
    }
  }, []);

  // Re-calls API (instant cache hit) or uses shuffled ref to append next page
  const handleLoadMore = useCallback(async (catId) => {
    setShelves((prev) => prev.map((s) => s.id === catId ? { ...s, loadingMore: true } : s));
    try {
      const all = catId === 'all' ? allShuffledRef.current : await iptvApi.getSeries(catId);
      setShelves((prev) => prev.map((s) => {
        if (s.id !== catId) return s;
        const nextItems = (all || []).slice(0, (s.items?.length || 0) + SHELF_PAGE);
        return { ...s, items: nextItems, hasMore: nextItems.length < (all?.length || 0), loadingMore: false };
      }));
    } catch {
      setShelves((prev) => prev.map((s) => s.id === catId ? { ...s, loadingMore: false } : s));
    }
  }, []);

  // Fetches all items for the category grid (cache hit after shelf loaded)
  const handleTitlePress = async (catId, name) => {
    setCurrentCategory({ catId, name });
    setCategoryItems(null);
    try {
      let all;
      if (catId === 'all') {
        if (!allShuffledRef.current.length) {
          const series = await iptvApi.getAllSeries();
          allShuffledRef.current = [...(series || [])].sort(() => Math.random() - 0.5);
        }
        all = allShuffledRef.current;
      } else {
        all = await iptvApi.getSeries(catId);
        if (!loadedRef.current.has(catId)) handleShelfVisible(catId);
      }
      setCategoryItems(all || []);
    } catch {
      setCategoryItems([]);
    }
  };

  const handleSeriesPress = async (item) => {
    setCurrentSeries({ id: item.series_id, name: item.name, cover: item.cover, seriesInfo: null });
    setShowEpisodeList(false);
    setEpisodeLoading(true);
    try {
      const info = await iptvApi.getSeriesInfo(item.series_id);
      setSeriesSeasons(info.episodes || {});
      setCurrentSeries({ id: item.series_id, name: item.name, cover: item.cover, seriesInfo: info.info || {} });
    } catch (err) {
      console.error('Error loading series info:', err);
      setCurrentSeries(prev => prev ? { ...prev, seriesInfo: {} } : null);
    } finally {
      setEpisodeLoading(false);
    }
  };

  const handleEpisodePress = (episode, seasonNum) => {
    const url = iptvApi.buildStreamUrl('series', episode.id, episode.container_extension || 'mp4');
    const epNum = getEpisodeNumber(episode);
    const name = `${currentSeries.name} — S${String(seasonNum).padStart(2, '0')}E${String(epNum).padStart(2, '0')}`;
    playVideo({
      type: 'series', streamId: episode.id, seriesId: currentSeries.id,
      seriesName: currentSeries.name, name, url, cover: currentSeries.cover,
      seasonNum, episodeNum: epNum, seriesSeasons,
    });
    navigation.navigate('VideoPlayer');
  };


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading series...</Text>
      </View>
    );
  }

  if (!activeUserId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🎭</Text>
        <Text style={styles.emptyTitle}>No IPTV Account</Text>
        <Text style={styles.emptyHint}>Tap "Accounts" to add your IPTV service</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Accounts')}>
          <Text style={styles.addBtnText}>Add Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ── Series details view ── */
  if (currentSeries && !showEpisodeList) {
    return (
      <SeriesDetailsPage
        series={currentSeries}
        seriesInfo={currentSeries.seriesInfo}
        loading={episodeLoading}
        onBack={() => { setCurrentSeries(null); setSeriesSeasons({}); setShowEpisodeList(false); }}
        onBrowseEpisodes={() => setShowEpisodeList(true)}
        cwItem={currentSeries.cwItem || null}
        onContinue={currentSeries.cwItem ? () => {
          const cw = currentSeries.cwItem;
          playVideo({ ...cw, startTime: cw.currentTime || 0 });
          navigation.navigate('VideoPlayer');
        } : null}
      />
    );
  }

  /* ── Episode drill-down view ── */
  if (currentSeries && showEpisodeList) {
    const seasonSections = Object.keys(seriesSeasons)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((seasonNum) => ({
        title: `Season ${seasonNum}`,
        seasonNum,
        data: seriesSeasons[seasonNum] || [],
      }));

    return (
      <View style={styles.root}>
        <View style={styles.episodeHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowEpisodeList(false)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.episodeSeriesTitle} numberOfLines={1}>{currentSeries.name}</Text>
        </View>
        <SectionList
          sections={seasonSections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.episodeList}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.seasonHeader}>
              <Text style={styles.seasonTitle}>{title}</Text>
            </View>
          )}
          renderItem={({ item, section }) => (
            <TouchableOpacity
              style={styles.episodeRow}
              onPress={() => handleEpisodePress(item, section.seasonNum)}
            >
              <View style={styles.epBadge}>
                <Text style={styles.epNum}>E{getEpisodeNumber(item)}</Text>
              </View>
              <View style={styles.epInfo}>
                <Text style={styles.epTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                {item.info?.duration && <Text style={styles.epDuration}>{item.info.duration}</Text>}
              </View>
              <Text style={styles.playIcon}>▶</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  /* ── Category page ── */
  if (currentCategory) {
    return (
      <CategoryPage
        name={currentCategory.name}
        items={categoryItems}
        onBack={() => { setCurrentCategory(null); setCategoryItems(null); }}
        onPress={handleSeriesPress}
      />
    );
  }

  /* ── Browse view ── */
  const continueWatching = watchHistory.filter((item) =>
    item.type === 'series' && item.currentTime > 0 &&
    (item.duration <= 0 || item.currentTime / item.duration < 0.95)
  );

  const handleCWPress = async (cwItem) => {
    setCurrentSeries({ id: cwItem.seriesId, name: cwItem.seriesName || cwItem.name, cover: cwItem.cover, seriesInfo: null, cwItem });
    setShowEpisodeList(false);
    setEpisodeLoading(true);
    try {
      const info = await iptvApi.getSeriesInfo(cwItem.seriesId);
      setSeriesSeasons(info.episodes || {});
      setCurrentSeries(prev => prev ? { ...prev, seriesInfo: info.info || {} } : null);
    } catch {
      setCurrentSeries(prev => prev ? { ...prev, seriesInfo: {} } : null);
    } finally {
      setEpisodeLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {continueWatching.length > 0 && (
        <View style={styles.cwSection}>
          <View style={styles.cwHeader}>
            <Text style={styles.cwSectionTitle}>Continue Watching</Text>
            <TouchableOpacity onPress={() => navigation.navigate('mylist')}>
              <Text style={styles.seeHistory}>See history ›</Text>
            </TouchableOpacity>
          </View>
          <div style={{ display: 'flex', overflowX: 'auto', gap: 12, paddingLeft: 48, paddingRight: 48, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {continueWatching.map((item) => (
              <CWCard key={item.id} item={item} onPress={() => handleCWPress(item)} />
            ))}
          </div>
        </View>
      )}
      <View style={styles.pageBody}>
        {shelves.length > 0 ? (
          shelves.map((shelf) => (
            <Shelf
              key={shelf.id}
              catId={shelf.id}
              title={shelf.name}
              items={shelf.items}
              totalCount={shelf.totalCount}
              hasMore={shelf.hasMore}
              loadingMore={shelf.loadingMore}
              onVisible={handleShelfVisible}
              onPress={handleSeriesPress}
              onTitlePress={handleTitlePress}
              onLoadMore={handleLoadMore}
              manual={shelf.id === 'all'}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No series found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f23' },
  scroll: { paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23', padding: 24 },
  loadingText: { color: '#aaa', marginTop: 12, fontSize: 14 },

  /* ── Hero ── */
  hero: { width: '100%', height: 480, backgroundColor: '#1a1a2e', overflow: 'hidden', position: 'relative' },
  heroBody: { position: 'absolute', bottom: 140, left: 48, maxWidth: 580, zIndex: 2 },
  heroTagline: {
    color: '#e94560', fontSize: 12, fontWeight: '700',
    letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12,
  },
  heroTitle: {
    color: '#fff', fontSize: 56, fontWeight: '900',
    lineHeight: 62, letterSpacing: -1.5, marginBottom: 14,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  heroRating: { color: '#ffd700', fontSize: 13, fontWeight: '600' },
  chip: { borderWidth: 1, borderColor: '#2a2a4e', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  chipText: { color: '#aaa', fontSize: 11 },
  heroDesc: { color: '#ccc', fontSize: 15, lineHeight: 22, marginBottom: 22, maxWidth: 480 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btnPlay: {
    backgroundColor: '#fff', paddingHorizontal: 26, paddingVertical: 12,
    borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  btnPlayText: { color: '#000', fontSize: 15, fontWeight: '700' },
  btnInfo: {
    backgroundColor: 'rgba(40,40,60,0.70)', paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  btnInfoText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnAdd: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  btnAddText: { color: '#fff', fontSize: 18 },

  /* ── Page body ── */
  pageBody: { paddingTop: 0 },
  cwSection: { paddingTop: 28, paddingBottom: 8 },
  cwHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 48, marginBottom: 14 },
  cwSectionTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  seeHistory: { color: '#888', fontSize: 13 },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 48, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: '#2a2a4e',
  },
  catBackBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#1a1a2e', borderRadius: 8, flexShrink: 0 },
  catBackText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  catPageTitle: { color: '#fff', fontSize: 22, fontWeight: '700', flexShrink: 0 },
  catCountBadge: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  catCount: { color: '#888', fontSize: 12, fontWeight: '600' },
  catGrid: { paddingHorizontal: 48, paddingVertical: 32 },
  catSearchRow: { paddingHorizontal: 48, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e1e38' },
  catSearch: { flex: 1, backgroundColor: '#1a1a2e', color: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#2a2a4e', minWidth: 0 },
  shelfTitleArrow: { color: '#e94560', fontSize: 18 },

  /* ── Shelf ── */
  shelf: { paddingTop: 28, paddingBottom: 8, overflow: 'visible' },
  shelfLoading: { paddingHorizontal: 48, paddingVertical: 18 },
  loadAllBtn: { alignSelf: 'flex-start', backgroundColor: '#e94560', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  loadAllBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  shelfHead: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between', paddingHorizontal: 48, marginBottom: 14,
  },
  shelfTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  shelfCount: { color: '#555', fontSize: 13, fontWeight: '500' },
  shelfTrack: { paddingHorizontal: 48, gap: 8 },
  seeMoreCard: {
    width: 200, aspectRatio: 2 / 3, borderRadius: 8,
    backgroundColor: '#16213e', borderWidth: 1, borderColor: '#2a2a4e',
    justifyContent: 'center', alignItems: 'center',
  },
  seeMoreCount: { color: '#e94560', fontSize: 28, fontWeight: '800' },
  seeMoreLabel: { color: '#888', fontSize: 12, marginTop: 4 },

  /* ── Poster card ── */
  poster: {
    width: 200, aspectRatio: 2 / 3,
    borderRadius: 8, backgroundColor: '#16213e', overflow: 'hidden', flexShrink: 0,
  },
  posterNoBg: { backgroundColor: '#16213e' },
  hdBadge: {
    position: 'absolute', top: 8, right: 8, zIndex: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  hdText: { color: '#ccc', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  posterBottom: { position: 'absolute', left: 12, right: 12, bottom: 14, zIndex: 4 },
  accentBar: { width: 24, height: 2, backgroundColor: '#e94560', borderRadius: 1, marginBottom: 8 },
  posterTitle: {
    color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.4, lineHeight: 16,
  },
  posterMeta: { color: '#aaa', fontSize: 10, marginTop: 5, letterSpacing: 0.3 },

  /* ── Episode view ── */
  episodeHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 48, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#2a2a4e',
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#1a1a2e', borderRadius: 8 },
  backBtnText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  episodeSeriesTitle: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 },
  episodeList: { paddingHorizontal: 48, paddingVertical: 12, paddingBottom: 80 },
  seasonHeader: {
    backgroundColor: '#16213e', paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 6, marginTop: 12, borderRadius: 8,
  },
  seasonTitle: { color: '#e94560', fontSize: 15, fontWeight: '700' },
  episodeRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#2a2a4e',
  },
  epBadge: {
    backgroundColor: '#e94560', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, marginRight: 12,
  },
  epNum: { color: '#fff', fontSize: 12, fontWeight: '700' },
  epInfo: { flex: 1 },
  epTitle: { color: '#fff', fontSize: 14 },
  epDuration: { color: '#888', fontSize: 12, marginTop: 2 },
  playIcon: { color: '#e94560', fontSize: 16 },

  /* ── Empty ── */
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 15 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  addBtn: { backgroundColor: '#e94560', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  addBtnText: { color: '#fff', fontWeight: '600' },
});
