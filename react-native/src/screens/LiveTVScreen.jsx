import { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useApp } from '../context/AppContext';
import iptvApi from '../services/iptvApi';

export default function LiveTVScreen({ navigation }) {
  const { users, activeUserId, channels, setChannels, isLoading, setIsLoading, playVideo } =
    useApp();

  const [view, setView] = useState('categories'); // 'categories' | 'items'
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Accounts')} style={{ marginRight: 12 }}>
          <Text style={{ color: '#e94560', fontSize: 14, fontWeight: '600' }}>📡 Accounts</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (activeUserId) loadCategories();
  }, [activeUserId]);

  const loadCategories = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;

    setIsLoading(true);
    try {
      iptvApi.setCredentials(user.host, user.username, user.password);
      const channelsData = await iptvApi.getLiveStreams();
      const formatted = channelsData.map((ch) => ({
        name: ch.name,
        url: iptvApi.buildStreamUrl('live', ch.stream_id, 'm3u8'),
        id: ch.stream_id,
        stream_id: ch.stream_id,
        category: ch.category_name || 'Uncategorized',
        logo: ch.stream_icon || null,
      }));
      setChannels(formatted);

      const grouped = formatted.reduce((acc, ch) => {
        const cat = ch.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ch);
        return acc;
      }, {});

      setCategories(
        Object.keys(grouped).map((name) => ({
          category_id: name,
          category_name: name,
          count: grouped[name].length,
        }))
      );
    } catch (err) {
      console.error('Error loading channels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryPress = (category) => {
    const filtered = channels.filter(
      (ch) => (ch.category || 'Uncategorized') === category.category_name
    );
    setItems(filtered);
    setCurrentCategory(category);
    setSearchQuery('');
    setView('items');
  };

  const handleChannelPress = (item) => {
    const video = {
      type: 'live',
      streamId: item.stream_id || item.id,
      name: item.name,
      url: item.url,
    };
    playVideo(video);
    navigation.navigate('VideoPlayer');
  };

  const handleBack = () => {
    setView('categories');
    setItems([]);
    setCurrentCategory(null);
    setSearchQuery('');
  };

  const filteredCategories = categories.filter((c) =>
    c.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading channels...</Text>
      </View>
    );
  }

  if (!activeUserId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📡</Text>
        <Text style={styles.emptyTitle}>No IPTV Account</Text>
        <Text style={styles.emptyHint}>Tap "Accounts" to add your IPTV service</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Accounts')}>
          <Text style={styles.addBtnText}>Add Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder={`🔍 Search ${view === 'categories' ? 'categories' : currentCategory?.category_name}...`}
        placeholderTextColor="#666"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {view === 'items' && (
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>← Back to Categories</Text>
        </TouchableOpacity>
      )}

      {view === 'categories' ? (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.category_id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategoryPress(item)}>
              <Text style={styles.categoryIcon}>📁</Text>
              <Text style={styles.categoryName} numberOfLines={2}>{item.category_name}</Text>
              <Text style={styles.categoryCount}>{item.count} ch</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No categories found</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id || item.stream_id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.channelRow} onPress={() => handleChannelPress(item)}>
              {item.logo ? (
                <Image source={{ uri: item.logo }} style={styles.channelLogo} />
              ) : (
                <View style={styles.channelLogoPlaceholder}>
                  <Text style={{ fontSize: 20 }}>📺</Text>
                </View>
              )}
              <Text style={styles.channelName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.playIcon}>▶</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No channels found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' },
  loadingText: { color: '#aaa', marginTop: 12 },
  search: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  backBtn: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtnText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  grid: { paddingHorizontal: 8, paddingBottom: 20 },
  categoryCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  categoryIcon: { fontSize: 28, marginBottom: 8 },
  categoryName: { color: '#fff', fontSize: 13, textAlign: 'center', fontWeight: '500' },
  categoryCount: { color: '#888', fontSize: 11, marginTop: 4 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  channelLogo: { width: 40, height: 40, borderRadius: 6, marginRight: 12 },
  channelLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  channelName: { flex: 1, color: '#fff', fontSize: 15 },
  playIcon: { color: '#e94560', fontSize: 16 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 15 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyHint: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  addBtn: {
    backgroundColor: '#e94560',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
});
