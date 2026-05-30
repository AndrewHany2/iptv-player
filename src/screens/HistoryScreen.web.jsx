import { useRef, useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, SectionList,
} from 'react-native';
import { useApp } from '../context/AppContext';
import iptvApi from '../services/iptvApi';

const getTrailerUrl = (t) => {
  if (!t) return null;
  const m = t.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  if (/^[A-Za-z0-9_-]{11}$/.test(t.trim())) return `https://www.youtube-nocookie.com/embed/${t.trim()}`;
  return null;
};

const getEpisodeNumber = (ep) => {
  let num = ep.episode_num;
  if (ep.title) { const m = ep.title.match(/S\d+E(\d+)/i) || ep.title.match(/E(\d+)/i); if (m?.[1]) num = m[1]; }
  return num;
};

/* ── Movie Detail Page ── */
function MovieDetailPage({ item, info, onBack, onPlay }) {
  const [showTrailer, setShowTrailer] = useState(false);
  const data = info?.info || {};
  const backdrop = data.backdrop_path?.[0] || data.cover_big || item.cover || null;
  const year = (data.releasedate || data.release_date || '').slice(0, 4);
  const trailer = getTrailerUrl(data.youtube_trailer);
  const resumeTime = item.currentTime || 0;
  const isLoading = info === null;

  return (
    <ScrollView style={detailStyles.root} contentContainerStyle={detailStyles.scroll}>
      <View style={detailStyles.hero}>
        {backdrop ? <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#16213e' }]} />}
        <View style={[StyleSheet.absoluteFillObject, { background: 'linear-gradient(to top, #0f0f23 0%, rgba(15,15,35,0.6) 55%, rgba(15,15,35,0.15) 100%)' }]} />
        <TouchableOpacity style={detailStyles.backBtn} onPress={onBack}>
          <Text style={detailStyles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={detailStyles.heroBody}>
          <Text style={detailStyles.title}>{item.name}</Text>
          {isLoading ? <ActivityIndicator color="#e94560" style={{ marginVertical: 12 }} /> : (
            <View style={detailStyles.chips}>
              {year ? <View style={detailStyles.chip}><Text style={detailStyles.chipText}>{year}</Text></View> : null}
              {data.genre ? <View style={detailStyles.chip}><Text style={detailStyles.chipText}>{data.genre.split(',')[0].trim()}</Text></View> : null}
              {data.rating ? <Text style={detailStyles.rating}>⭐ {parseFloat(data.rating).toFixed(1)}</Text> : null}
            </View>
          )}
          <View style={detailStyles.actions}>
            {resumeTime > 0 && (
              <TouchableOpacity style={detailStyles.playBtn} onPress={() => onPlay(resumeTime)}>
                <Text style={detailStyles.playBtnText}>▶  Continue</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={resumeTime > 0 ? detailStyles.secondaryBtn : detailStyles.playBtn} onPress={() => onPlay(0)}>
              <Text style={resumeTime > 0 ? detailStyles.secondaryBtnText : detailStyles.playBtnText}>
                {resumeTime > 0 ? '↺  From Start' : '▶  Play Now'}
              </Text>
            </TouchableOpacity>
            {!isLoading && trailer && (
              <TouchableOpacity style={detailStyles.secondaryBtn} onPress={() => setShowTrailer(v => !v)}>
                <Text style={detailStyles.secondaryBtnText}>{showTrailer ? '✕  Close' : '🎬  Trailer'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {showTrailer && trailer && (
        <View style={{ paddingHorizontal: 48, paddingBottom: 24 }}>
          <iframe src={`${trailer}?autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
            style={{ width: '100%', height: 420, border: 'none', borderRadius: 8 }} />
        </View>
      )}
      {(data.description || data.plot || data.overview || data.cast || data.director) && (
        <View style={detailStyles.meta}>
          {(data.description || data.plot || data.overview) && <Text style={detailStyles.metaPlot}>{data.description || data.plot || data.overview}</Text>}
          {data.cast && <Text style={detailStyles.metaRow}><Text style={detailStyles.metaLabel}>Cast  </Text>{data.cast}</Text>}
          {data.director && <Text style={detailStyles.metaRow}><Text style={detailStyles.metaLabel}>Director  </Text>{data.director}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

/* ── Series Detail Page ── */
function SeriesDetailPage({ item, info, infoLoading, onBack, onContinue, onBrowseEpisodes }) {
  const [showTrailer, setShowTrailer] = useState(false);
  const data = info || {};
  const backdrop = data.backdrop_path?.[0] || data.cover || item.cover || null;
  const year = (data.release_date || data.releasedate || '').slice(0, 4);
  const trailer = getTrailerUrl(data.youtube_trailer);
  const showTitle = item.seriesName || item.name;
  const epLabel = item.seasonNum ? ` S${item.seasonNum}E${String(item.episodeNum).padStart(2, '0')}` : '';

  return (
    <ScrollView style={detailStyles.root} contentContainerStyle={detailStyles.scroll}>
      <View style={detailStyles.hero}>
        {backdrop ? <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#16213e' }]} />}
        <View style={[StyleSheet.absoluteFillObject, { background: 'linear-gradient(to top, #0f0f23 0%, rgba(15,15,35,0.6) 55%, rgba(15,15,35,0.15) 100%)' }]} />
        <TouchableOpacity style={detailStyles.backBtn} onPress={onBack}>
          <Text style={detailStyles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={detailStyles.heroBody}>
          <Text style={detailStyles.title}>{showTitle}</Text>
          {infoLoading ? <ActivityIndicator color="#e94560" style={{ marginVertical: 12 }} /> : (
            <View style={detailStyles.chips}>
              {year ? <View style={detailStyles.chip}><Text style={detailStyles.chipText}>{year}</Text></View> : null}
              {data.genre ? <View style={detailStyles.chip}><Text style={detailStyles.chipText}>{data.genre.split(',')[0].trim()}</Text></View> : null}
              {data.rating ? <Text style={detailStyles.rating}>⭐ {parseFloat(data.rating).toFixed(1)}</Text> : null}
            </View>
          )}
          <View style={detailStyles.actions}>
            <TouchableOpacity style={detailStyles.playBtn} onPress={onContinue}>
              <Text style={detailStyles.playBtnText}>▶  Continue{epLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={detailStyles.secondaryBtn} onPress={onBrowseEpisodes}>
              <Text style={detailStyles.secondaryBtnText}>☰  Episodes</Text>
            </TouchableOpacity>
            {!infoLoading && trailer && (
              <TouchableOpacity style={detailStyles.secondaryBtn} onPress={() => setShowTrailer(v => !v)}>
                <Text style={detailStyles.secondaryBtnText}>{showTrailer ? '✕  Close' : '🎬  Trailer'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {showTrailer && trailer && (
        <View style={{ paddingHorizontal: 48, paddingBottom: 24 }}>
          <iframe src={`${trailer}?autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
            style={{ width: '100%', height: 420, border: 'none', borderRadius: 8 }} />
        </View>
      )}
      {(data.plot || data.description || data.overview || data.cast || data.director) && (
        <View style={detailStyles.meta}>
          {(data.plot || data.description || data.overview) && <Text style={detailStyles.metaPlot}>{data.plot || data.description || data.overview}</Text>}
          {data.cast && <Text style={detailStyles.metaRow}><Text style={detailStyles.metaLabel}>Cast  </Text>{data.cast}</Text>}
          {data.director && <Text style={detailStyles.metaRow}><Text style={detailStyles.metaLabel}>Director  </Text>{data.director}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

/* ── Episode List Page ── */
function EpisodeListPage({ seriesName, seriesSeasons, onBack, onEpisodePress }) {
  const sections = Object.keys(seriesSeasons).sort((a, b) => parseInt(a) - parseInt(b))
    .map((num) => ({ title: `Season ${num}`, seasonNum: num, data: seriesSeasons[num] || [] }));

  return (
    <View style={detailStyles.root}>
      <View style={detailStyles.epHeader}>
        <TouchableOpacity style={detailStyles.epBackBtn} onPress={onBack}>
          <Text style={detailStyles.epBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={detailStyles.epTitle} numberOfLines={1}>{seriesName}</Text>
      </View>
      <SectionList sections={sections} keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 48, paddingVertical: 12, paddingBottom: 80 }}
        renderSectionHeader={({ section: { title } }) => (
          <View style={detailStyles.seasonHeader}><Text style={detailStyles.seasonTitle}>{title}</Text></View>
        )}
        renderItem={({ item, section }) => (
          <TouchableOpacity style={detailStyles.episodeRow} onPress={() => onEpisodePress(item, section.seasonNum)}>
            <View style={detailStyles.epBadge}><Text style={detailStyles.epNum}>E{getEpisodeNumber(item)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={detailStyles.epName} numberOfLines={1}>{item.title || 'Untitled'}</Text>
              {item.info?.duration && <Text style={detailStyles.epDur}>{item.info.duration}</Text>}
            </View>
            <Text style={{ color: '#e94560', fontSize: 16 }}>▶</Text>
          </TouchableOpacity>
        )}
      />
    </View>
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
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  playBtn: { backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 8 },
  playBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { backgroundColor: 'rgba(40,40,60,0.85)', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 8, borderWidth: 1, borderColor: '#3a3a5e' },
  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  meta: { paddingHorizontal: 48, paddingTop: 24, gap: 10 },
  metaPlot: { color: '#ccc', fontSize: 15, lineHeight: 24, marginBottom: 12 },
  metaRow: { color: '#aaa', fontSize: 14, lineHeight: 20 },
  metaLabel: { color: '#fff', fontWeight: '700' },
  epHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 48, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#2a2a4e' },
  epBackBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#1a1a2e', borderRadius: 8 },
  epBackText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  epTitle: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 },
  seasonHeader: { backgroundColor: '#16213e', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6, marginTop: 12, borderRadius: 8 },
  seasonTitle: { color: '#e94560', fontSize: 15, fontWeight: '700' },
  episodeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#2a2a4e' },
  epBadge: { backgroundColor: '#e94560', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 12 },
  epNum: { color: '#fff', fontSize: 12, fontWeight: '700' },
  epName: { color: '#fff', fontSize: 14 },
  epDur: { color: '#888', fontSize: 12, marginTop: 2 },
});

function useDragScroll() {
  const railRef = useRef(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);
  const hasDragged = useRef(false);

  const attachRef = useCallback((el) => {
    railRef.current = el;
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
    el._cleanup = () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => () => railRef.current?._cleanup?.(), []);

  const scrollBy = (delta) => {
    const el = railRef.current;
    if (el) el.scrollLeft = Math.max(0, el.scrollLeft + delta);
  };

  return { railRef: attachRef, scrollBy };
}

const formatTimeLeft = (currentTime, duration) => {
  if (!duration || !currentTime) return null;
  const left = duration - currentTime;
  if (left <= 60) return null;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

const getEpLabel = (item) => {
  if (item.type === 'series' && item.seasonNum && item.episodeNum) {
    return `S${item.seasonNum} · E${String(item.episodeNum).padStart(2, '0')}`;
  }
  return null;
};

/* ── Continue Watching Card (landscape) ── */
function CWCard({ item, onPress }) {
  const progress = item.duration > 0 ? Math.min((item.currentTime / item.duration) * 100, 100) : 15;
  const timeLeft = formatTimeLeft(item.currentTime, item.duration);
  const epLabel = getEpLabel(item);
  const seasonBadge = item.seasonNum ? `S${item.seasonNum}` : null;
  const bg = item.cover || item.movie_image || item.stream_icon || null;
  const showTitle = item.seriesName || item.name;
  const epTitle = item.seriesName && item.name !== item.seriesName ? item.name : null;

  return (
    <TouchableOpacity style={styles.cwCard} onPress={onPress} {...({ className: 'lumen-cw-card' })}>
      {/* Landscape image box */}
      <View style={styles.cwInner}>
        {bg ? (
          <Image source={{ uri: bg }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.cwNoBg]} />
        )}
        {/* Bottom-left gradient */}
        <View style={[StyleSheet.absoluteFillObject, { background: 'linear-gradient(to top right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0) 100%)' }]} />

        {seasonBadge && (
          <View style={styles.cwSeason}>
            <Text style={styles.cwSeasonText}>{seasonBadge}</Text>
          </View>
        )}

        {/* Play icon overlay — shown on hover via CSS */}
        <div className="lumen-cw-play">▶</div>

        <View style={styles.cwBottom}>
          <View style={styles.cwBar}>
            <View style={[styles.cwBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>

      {/* Info below card */}
      <View style={styles.cwMeta}>
        <Text style={styles.cwShowName} numberOfLines={1}>{showTitle}</Text>
        {(epLabel || epTitle) && (
          <Text style={styles.cwEpLine} numberOfLines={1}>
            {[epLabel, epTitle].filter(Boolean).join(' · ')}
          </Text>
        )}
        {timeLeft && <Text style={styles.cwTimeLeft}>{timeLeft}</Text>}
      </View>
    </TouchableOpacity>
  );
}

/* ── My List Poster Card (portrait) ── */
function MyListCard({ item, onPress, onRemove }) {
  const poster = item.cover || item.movie_image || item.stream_icon || null;
  const epLabel = getEpLabel(item);

  return (
    <TouchableOpacity style={styles.posterCard} onPress={onPress} {...({ className: 'lumen-poster' })}>
      <View style={styles.poster}>
        {poster ? (
          <Image source={{ uri: poster }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.posterNoBg]} />
        )}
        <View style={styles.hdBadge}><Text style={styles.hdText}>HD</Text></View>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={(e) => { e?.stopPropagation?.(); onRemove(); }}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.posterLabel} numberOfLines={2}>{item.name}</Text>
      {epLabel && <Text style={styles.posterMeta}>{epLabel}</Text>}
    </TouchableOpacity>
  );
}

export default function HistoryScreen({ navigation }) {
  const { watchHistory, removeFromWatchHistory, playVideo, myList, removeFromMyList } = useApp();
  const fav$ = useDragScroll();
  const cw$ = useDragScroll();
  const [currentDetail, setCurrentDetail] = useState(null);
  const [showEpisodes, setShowEpisodes] = useState(false);

  const handlePlay = (item, startTime) => {
    playVideo({ ...item, startTime: startTime ?? item.currentTime ?? 0 });
    navigation.navigate('VideoPlayer');
  };

  const openDetail = async (historyItem) => {
    if (historyItem.type === 'live') {
      handlePlay(historyItem, 0);
      return;
    }
    if (historyItem.type === 'movies') {
      setCurrentDetail({ historyItem, type: 'movie', info: null, seriesSeasons: {}, infoLoading: true });
      setShowEpisodes(false);
      try {
        const info = await iptvApi.getVODInfo(historyItem.streamId);
        setCurrentDetail((prev) => prev ? { ...prev, info, infoLoading: false } : null);
      } catch {
        setCurrentDetail((prev) => prev ? { ...prev, info: {}, infoLoading: false } : null);
      }
    } else if (historyItem.type === 'series') {
      setCurrentDetail({ historyItem, type: 'series', info: null, seriesSeasons: {}, infoLoading: true });
      setShowEpisodes(false);
      try {
        const result = await iptvApi.getSeriesInfo(historyItem.seriesId);
        setCurrentDetail((prev) => prev ? { ...prev, info: result.info || {}, seriesSeasons: result.episodes || {}, infoLoading: false } : null);
      } catch {
        setCurrentDetail((prev) => prev ? { ...prev, info: {}, infoLoading: false } : null);
      }
    }
  };

  /* ── Detail views ── */
  if (currentDetail?.type === 'movie') {
    return (
      <MovieDetailPage
        item={currentDetail.historyItem}
        info={currentDetail.infoLoading ? null : currentDetail.info}
        onBack={() => setCurrentDetail(null)}
        onPlay={(startTime) => {
          const item = currentDetail.historyItem;
          const url = item.url || iptvApi.buildStreamUrl('movie', item.streamId, 'mp4');
          playVideo({ ...item, url, startTime });
          navigation.navigate('VideoPlayer');
          setCurrentDetail(null);
        }}
      />
    );
  }

  if (currentDetail?.type === 'series') {
    if (showEpisodes) {
      return (
        <EpisodeListPage
          seriesName={currentDetail.historyItem.seriesName || currentDetail.historyItem.name}
          seriesSeasons={currentDetail.seriesSeasons}
          onBack={() => setShowEpisodes(false)}
          onEpisodePress={(episode, seasonNum) => {
            const item = currentDetail.historyItem;
            const epNum = getEpisodeNumber(episode);
            const url = iptvApi.buildStreamUrl('series', episode.id, episode.container_extension || 'mp4');
            playVideo({
              type: 'series', streamId: episode.id, seriesId: item.seriesId,
              seriesName: item.seriesName || item.name,
              name: `${item.seriesName || item.name} — S${String(seasonNum).padStart(2, '0')}E${String(epNum).padStart(2, '0')}`,
              url, cover: item.cover, seasonNum, episodeNum: epNum,
              seriesSeasons: currentDetail.seriesSeasons,
            });
            navigation.navigate('VideoPlayer');
            setCurrentDetail(null); setShowEpisodes(false);
          }}
        />
      );
    }
    return (
      <SeriesDetailPage
        item={currentDetail.historyItem}
        info={currentDetail.info}
        infoLoading={currentDetail.infoLoading}
        onBack={() => setCurrentDetail(null)}
        onContinue={() => {
          const item = currentDetail.historyItem;
          const url = item.url || iptvApi.buildStreamUrl('series', item.streamId, 'mp4');
          playVideo({ ...item, url, startTime: item.currentTime || 0 });
          navigation.navigate('VideoPlayer');
          setCurrentDetail(null);
        }}
        onBrowseEpisodes={() => setShowEpisodes(true)}
      />
    );
  }

  const continueWatching = watchHistory.filter((item) => {
    if (item.type === 'live' || !item.currentTime || item.currentTime <= 0) return false;
    if (item.duration > 0) return item.currentTime / item.duration < 0.95;
    return true;
  });

  if (myList.length === 0 && continueWatching.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🎬</Text>
        <Text style={styles.emptyTitle}>Your list is empty</Text>
        <Text style={styles.emptyHint}>Open a movie or series and tap ♡ Favorites to save it here</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>

      {/* Favorites */}
      {myList.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorites</Text>
          <div style={{ position: 'relative' }} className="lumen-shelf-rail">
            <button className="lumen-shelf-nav" onClick={() => fav$.scrollBy(-800)}>‹</button>
            <div
              ref={fav$.railRef}
              style={{ display: 'flex', overflowX: 'auto', gap: 12, paddingLeft: 48, paddingRight: 48, scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'grab' }}
            >
              {myList.map((item) => (
                <MyListCard
                  key={item.id}
                  item={item}
                  onPress={() => openDetail(item)}
                  onRemove={() => removeFromMyList(item.id)}
                />
              ))}
            </div>
            <button className="lumen-shelf-nav right" onClick={() => fav$.scrollBy(800)}>›</button>
          </div>
        </View>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Watching</Text>
          <div style={{ position: 'relative' }} className="lumen-shelf-rail">
            <button className="lumen-shelf-nav" onClick={() => cw$.scrollBy(-800)}>‹</button>
            <div
              ref={cw$.railRef}
              style={{ display: 'flex', overflowX: 'auto', gap: 12, paddingLeft: 48, paddingRight: 48, scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'grab' }}
            >
              {continueWatching.map((item) => (
                <CWCard key={item.id} item={item} onPress={() => openDetail(item)} />
              ))}
            </div>
            <button className="lumen-shelf-nav right" onClick={() => cw$.scrollBy(800)}>›</button>
          </div>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f23' },
  scroll: { paddingTop: 40, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyHint: { color: '#888', fontSize: 14, textAlign: 'center' },

  section: { paddingBottom: 48 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 48, marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5,
    paddingHorizontal: 48, marginBottom: 20,
  },
  sectionTitleInRow: {
    color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5,
  },
  seeAll: { color: '#888', fontSize: 13 },
  shelfTrack: { paddingHorizontal: 48, gap: 12 },

  /* ── My List poster (portrait 2:3) ── */
  posterCard: { width: 200, flexShrink: 0 },
  poster: {
    width: 200, aspectRatio: 2 / 3,
    borderRadius: 8, backgroundColor: '#16213e', overflow: 'hidden',
  },
  posterLabel: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 8, lineHeight: 17 },
  posterNoBg: { backgroundColor: '#16213e' },
  hdBadge: {
    position: 'absolute', top: 8, right: 8, zIndex: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  hdText: { color: '#ccc', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  removeBtn: {
    position: 'absolute', top: 8, left: 8, zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    width: 22, height: 22, justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  posterBottom: { position: 'absolute', left: 12, right: 12, bottom: 14, zIndex: 4 },
  accentBar: { width: 24, height: 2, backgroundColor: '#e94560', borderRadius: 1, marginBottom: 8 },
  posterTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.4, lineHeight: 16 },
  posterMeta: { color: '#aaa', fontSize: 10, marginTop: 5, letterSpacing: 0.3 },

  /* ── Continue Watching card (landscape 16:9) ── */
  cwCard: { width: 320, flexShrink: 0 },
  cwInner: {
    width: 320, height: 180,
    borderRadius: 8, backgroundColor: '#16213e', overflow: 'hidden',
  },
  cwNoBg: { backgroundColor: '#16213e' },
  cwSeason: { position: 'absolute', top: 10, left: 12, zIndex: 4 },
  cwSeasonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cwBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 4, paddingHorizontal: 12 },
  cwTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3, marginBottom: 6 },
  cwBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  cwBarFill: { height: '100%', backgroundColor: '#e94560' },
  cwMeta: { paddingTop: 10, paddingHorizontal: 2 },
  cwShowName: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  cwEpLine: { color: '#888', fontSize: 12, marginBottom: 2 },
  cwTimeLeft: { color: '#888', fontSize: 12 },
});
