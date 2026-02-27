import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const diffMs = Date.now() - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getHistoryIcon = (type) => {
  const icons = { live: '📺', movie: '🎬', movies: '🎬', series: '🎭' };
  return icons[type] || '▶️';
};

const getHistoryLabel = (item) => {
  if (item.type === 'series' && item.seasonNum && item.episodeNum) {
    return `S${String(item.seasonNum).padStart(2, '0')}E${String(item.episodeNum).padStart(2, '0')}`;
  }
  return item.type;
};

export default function HistoryScreen({ navigation }) {
  const { watchHistory, removeFromWatchHistory, playVideo } = useApp();

  const handleItemPress = (item) => {
    playVideo({ ...item, startTime: item.currentTime || 0 });
    navigation.navigate('VideoPlayer');
  };

  const handleRemove = (item) => {
    Alert.alert('Remove from History', `Remove "${item.name}" from history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFromWatchHistory(item.id) },
    ]);
  };

  if (watchHistory.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🕘</Text>
        <Text style={styles.emptyTitle}>No History Yet</Text>
        <Text style={styles.emptyHint}>Start watching content to see it here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={watchHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const progress =
            item.duration > 0
              ? Math.min(Math.round((item.currentTime / item.duration) * 100), 100)
              : null;
          const hasProgress = item.currentTime > 0;

          return (
            <TouchableOpacity style={styles.card} onPress={() => handleItemPress(item)}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{getHistoryIcon(item.type)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <View style={styles.meta}>
                  <Text style={styles.label}>{getHistoryLabel(item)}</Text>
                  <Text style={styles.time}>{formatRelativeTime(item.watchedAt)}</Text>
                </View>
                {hasProgress && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: progress !== null ? `${progress}%` : '0%' },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {progress !== null
                        ? `${progress}%`
                        : `${Math.floor(item.currentTime / 60)}m ${Math.floor(item.currentTime % 60)}s`}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.removeIcon}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: '#888', fontSize: 14, textAlign: 'center' },
  list: { padding: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  iconContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#0f0f23',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: '500', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: {
    color: '#e94560',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#2a0a12',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  time: { color: '#888', fontSize: 12 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  progressBar: { flex: 1, height: 3, backgroundColor: '#333', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#e94560', borderRadius: 2 },
  progressText: { color: '#888', fontSize: 11 },
  removeBtn: { padding: 4, marginLeft: 8 },
  removeIcon: { color: '#666', fontSize: 16 },
});
