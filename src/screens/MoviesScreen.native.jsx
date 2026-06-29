import { useEffect, useState } from "react";
import { FlatList } from "react-native";
import { YStack, XStack, Text, Input, Spinner } from "../ui/primitives";
import { useMovies } from "../domain/hooks/useMovies";
import { useTVNavigation } from "../hooks/useTVNavigation";
import ContentShelf from "../presentation/components/ContentShelf.native";
import PosterCard from "../presentation/components/PosterCard.native";
import MovieDetail from "../components/MovieDetail";
import { colors } from "../ui/tokens";

const GRID_PAGE = 40;

/* ─── Category Page (drill-in grid) ─── */
function CategoryPage({ name, items, onBack, onPlay, onLoadMore, hasRemote, loadingMore }) {
  const [displayCount, setDisplayCount] = useState(GRID_PAGE);
  const [search, setSearch] = useState("");

  const filtered = items
    ? (search.trim() ? items.filter((i) => i.name?.toLowerCase().includes(search.toLowerCase())) : items)
    : null;
  const displayed = filtered ? filtered.slice(0, displayCount) : null;
  const hasLocalMore = filtered && displayCount < filtered.length;
  const hasMore = hasLocalMore || hasRemote;

  useEffect(() => { setDisplayCount(GRID_PAGE); }, [search]);

  return (
    <YStack flex={1} backgroundColor="#0A0E1A">
      <XStack alignItems="center" gap={12} paddingHorizontal={16} paddingTop={16} paddingBottom={10} borderBottomWidth={1} borderBottomColor="#28324E">
        <YStack paddingVertical={8} paddingHorizontal={12} backgroundColor="#1B2236" borderRadius={8} onPress={onBack}>
          <Text color="#6C5CE7" fontSize={14} fontWeight="600">← Back</Text>
        </YStack>
        <Text color="#fff" fontSize={18} fontWeight="700" flex={1} numberOfLines={1}>{name}</Text>
        {filtered != null && (
          <YStack backgroundColor="rgba(255,255,255,0.07)" borderRadius={20} paddingHorizontal={10} paddingVertical={4}>
            <Text color="#7A86A8" fontSize={12} fontWeight="600">{filtered.length.toLocaleString()}</Text>
          </YStack>
        )}
      </XStack>
      <Input
        margin={12} placeholder="Search titles..." placeholderTextColor="#555"
        value={search} onChangeText={setSearch}
        backgroundColor="#1B2236" color="#fff" borderRadius={10}
        paddingHorizontal={14} paddingVertical={10} fontSize={14} borderWidth={1} borderColor="#28324E"
      />
      {!displayed ? (
        <YStack flex={1} justifyContent="center" alignItems="center"><Spinner size="large" color="#6C5CE7" /></YStack>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={displayed}
          keyExtractor={(item) => String(item.stream_id)}
          numColumns={3}
          contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 12 }}
          renderItem={({ item }) => <PosterCard item={item} onPress={onPlay} />}
          onEndReached={() => {
            if (hasLocalMore) setDisplayCount((c) => Math.min(c + GRID_PAGE, filtered.length));
            else if (hasRemote && !loadingMore && onLoadMore) onLoadMore();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={(hasMore || loadingMore)
            ? <YStack alignItems="center" paddingVertical={20}><Spinner size="small" color="#6C5CE7" /></YStack>
            : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </YStack>
  );
}

/* ─── Screen ─── */
export default function MoviesScreen({ navigation }) {
  const {
    loading, error, reload, activeUserId, shelves, discoverItems,
    handleShelfVisible, handleLoadMore, openCategory, closeCategory,
    categoryPage, isTopRatedCategory, topRatedHasMore, topRatedLoadingMore, handleTopRatedMore,
    selectedMovie, selectMovie, clearSelectedMovie, playVideoObject,
  } = useMovies({ navigation });

  const { focusedRow, focusedCol } = useTVNavigation({
    active: !categoryPage && !selectedMovie,
    rows: [{ items: discoverItems, onSelect: (i) => openCategory(discoverItems[i].id, discoverItems[i].label) }],
  });

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0A0E1A" padding={24}>
        <Spinner size="large" color="#6C5CE7" />
        <Text color="#7A86A8" marginTop={12} fontSize={14}>Loading movies...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0A0E1A" padding={24}>
        <Text fontSize={48} marginBottom={12}>⚠️</Text>
        <Text color={colors.danger} fontSize={18} fontWeight="700" marginBottom={8}>Couldn't load movies</Text>
        <Text color="#7A86A8" fontSize={14} textAlign="center" marginBottom={20}>Check your connection and try again</Text>
        <YStack backgroundColor="#6C5CE7" paddingHorizontal={24} paddingVertical={12} borderRadius={10} onPress={reload}>
          <Text color="#fff" fontWeight="600">Retry</Text>
        </YStack>
      </YStack>
    );
  }

  if (!activeUserId) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0A0E1A" padding={24}>
        <Text fontSize={48} marginBottom={12}>🎬</Text>
        <Text color="#fff" fontSize={18} fontWeight="600" marginBottom={8}>No IPTV Account</Text>
        <Text color="#7A86A8" fontSize={14} textAlign="center" marginBottom={20}>Tap "Accounts" to add your IPTV service</Text>
        <YStack backgroundColor="#6C5CE7" paddingHorizontal={24} paddingVertical={12} borderRadius={10} onPress={() => navigation.navigate("Accounts")}>
          <Text color="#fff" fontWeight="600">Add Account</Text>
        </YStack>
      </YStack>
    );
  }

  const listHeader = (
    <YStack paddingHorizontal={16} paddingTop={20} paddingBottom={4}>
      <Text color="#fff" fontSize={20} fontWeight="700" letterSpacing={-0.3} marginBottom={12}>Discover</Text>
      <XStack gap={10} flexWrap="wrap">
        {discoverItems.map((pill, idx) => (
          <XStack
            key={pill.id} alignItems="center" gap={8} paddingHorizontal={16} paddingVertical={10}
            backgroundColor="rgba(108, 92, 231,0.08)" borderWidth={1}
            borderColor={focusedRow === 0 && focusedCol === idx ? "#22D3EE" : "rgba(108, 92, 231,0.28)"}
            borderRadius={999} onPress={() => openCategory(pill.id, pill.label)}
          >
            <Text fontSize={14}>{pill.id === "all" ? "🎬" : "⭐"}</Text>
            <Text color="#fff" fontSize={12} fontWeight="600">{pill.label}</Text>
            <Text color="#6C5CE7" fontSize={14} fontWeight="700">→</Text>
          </XStack>
        ))}
      </XStack>
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor="#0A0E1A">
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        data={shelves}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => (
          <ContentShelf
            title={item.name} count={item.totalCount} items={item.items}
            hasMore={item.hasMore} loadingMore={item.loadingMore} manual={item.manual}
            onVisible={() => handleShelfVisible(item.id)}
            onPress={selectMovie}
            onTitlePress={() => openCategory(item.id, item.name)}
            onLoadMore={() => handleLoadMore(item.id)}
          />
        )}
        ListEmptyComponent={<YStack padding={60} alignItems="center"><Text color="#666" fontSize={15}>No movies found</Text></YStack>}
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        removeClippedSubviews
      />
      {categoryPage && (
        <YStack position="absolute" top={0} left={0} right={0} bottom={0}>
          <CategoryPage
            name={categoryPage.name}
            items={categoryPage.items}
            onBack={closeCategory}
            onPlay={selectMovie}
            hasRemote={isTopRatedCategory && topRatedHasMore}
            loadingMore={isTopRatedCategory && topRatedLoadingMore}
            onLoadMore={isTopRatedCategory ? handleTopRatedMore : undefined}
          />
        </YStack>
      )}
      {selectedMovie && (
        <YStack position="absolute" top={0} left={0} right={0} bottom={0}>
          <MovieDetail
            item={selectedMovie}
            onBack={clearSelectedMovie}
            onPlay={(videoObj) => { playVideoObject(videoObj); clearSelectedMovie(); }}
          />
        </YStack>
      )}
    </YStack>
  );
}
