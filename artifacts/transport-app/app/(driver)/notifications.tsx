import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetNotifications, useMarkNotificationRead, Notification } from '@workspace/api-client-react';
import { MaterialIcons } from '@expo/vector-icons';
import { formatRelativeTime } from '@/utils/date';

export default function CustomerNotifications() {
  const colors = useColors();
  const { data: notifications, isLoading, refetch, isRefetching } = useGetNotifications();
  const markRead = useMarkNotificationRead();

  const handleRead = (item: Notification) => {
    if (item.isRead) return;
    markRead.mutate({ id: item.id });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'trip_accepted': return 'check-circle';
      case 'driver_arriving': return 'location-on';
      case 'trip_completed': return 'star';
      case 'trip_cancelled': return 'cancel';
      default: return 'notifications';
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: item.isRead ? colors.background : colors.card, borderColor: colors.border }]}
      onPress={() => handleRead(item)}
      disabled={item.isRead}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryDark }]}>
        <MaterialIcons name={getIcon(item.type) as any} size={24} color="#fff" />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: item.isRead ? 'Inter_500Medium' : 'Inter_700Bold' }]}>{item.title}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{item.body}</Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications || []}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="notifications-none" size={64} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No tienes notificaciones</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 16, marginBottom: 4 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 8 },
  time: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 16 }
});