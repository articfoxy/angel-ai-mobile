import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../theme';
import { api } from '../services/api';
import type { Memory, MemoryStats } from '../types';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'person', label: 'People' },
  { key: 'project', label: 'Projects' },
  { key: 'commitment', label: 'Commitments' },
  { key: 'concept', label: 'Concepts' },
  { key: 'company', label: 'Companies' },
] as const;

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  person: 'person',
  project: 'folder',
  commitment: 'checkmark-circle',
  concept: 'bulb',
  company: 'business',
};

export function MemoryScreen() {
  const insets = useSafeAreaInsets();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      let data: Memory[];
      if (searchQuery.trim()) {
        data = await api.get<Memory[]>(`memories/search?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        const params = filter === 'all' ? '?limit=50' : `?type=${filter}&limit=50`;
        data = await api.get<Memory[]>(`memories${params}`);
      }
      setMemories(Array.isArray(data) ? data : []);
    } catch {
      setMemories([]);
    }
  }, [filter, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get<MemoryStats>('memories/stats');
      setStats(data);
    } catch {
      // Stats are non-critical
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchMemories(), fetchStats()]);
    setIsLoading(false);
  }, [fetchMemories, fetchStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMemories(), fetchStats()]);
    setRefreshing(false);
  }, [fetchMemories, fetchStats]);

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert('Delete Memory', 'Are you sure you want to delete this memory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`memories/${id}`);
            setMemories((prev) => prev.filter((m) => m.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete memory');
          }
        },
      },
    ]);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const renderMemory = ({ item }: { item: Memory }) => {
    const isExpanded = expandedId === item.id;
    const iconName = TYPE_ICONS[item.type] || 'document';

    return (
      <TouchableOpacity
        style={styles.memoryCard}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.memoryHeader}>
          <View style={styles.memoryIconBadge}>
            <Ionicons name={iconName} size={16} color={colors.primary} />
          </View>
          <View style={styles.memoryInfo}>
            <Text style={styles.memoryTitle} numberOfLines={isExpanded ? undefined : 1}>
              {item.title}
            </Text>
            <Text style={styles.memoryMeta}>
              {item.type} • {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text
          style={styles.memoryContent}
          numberOfLines={isExpanded ? undefined : 2}
        >
          {item.content}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Memory</Text>
        {stats && (
          <Text style={styles.statsText}>{stats.total} total</Text>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search memories..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => fetchMemories()}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); }}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f.key && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Memory Stats */}
      {stats && !searchQuery && (
        <View style={styles.statsRow}>
          {Object.entries(stats.byType || {}).map(([type, count]) => (
            <View key={type} style={styles.statBadge}>
              <Ionicons
                name={TYPE_ICONS[type] || 'document'}
                size={12}
                color={colors.textSecondary}
              />
              <Text style={styles.statBadgeText}>
                {count as number}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Memories List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id}
          renderItem={renderMemory}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No memories found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Start a session to create memories'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  statsText: {
    color: colors.textTertiary,
    fontSize: fontSize.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm + 2,
  },
  filtersContainer: {
    marginBottom: spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statBadgeText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  memoryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  memoryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryInfo: {
    flex: 1,
  },
  memoryTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  memoryMeta: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  memoryContent: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.textTertiary,
    fontSize: fontSize.md,
  },
});
