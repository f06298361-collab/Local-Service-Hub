import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetMyDriverTrips } from '@workspace/api-client-react';
import { MaterialIcons } from '@expo-vector-icons';
import dayjs from 'dayjs';

export default function DriverHistory() {
  const colors = useColors();
  const { data: trips, isLoading, refetch, isRefetching } = useGetMyDriverTrips();

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {dayjs(item.createdAt).format('DD MMM YYYY, HH:mm')}
        </Text>
        <Text style={[styles.price, { color: colors.foreground }]}>
          ${item.finalPrice || item.estimatedPrice || '---'}
        </Text>
      </View>
      
      <View style={styles.route}>
        <View style={styles.routeRow}>
          <MaterialIcons name="my-location" size={16} color={colors.primary} />
          <Text style={[styles.address, { color: colors.foreground }]} numberOfLines={1}>{item.pickupAddress}</Text>
        </View>
        <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
        <View style={styles.routeRow}>
          <MaterialIcons name="location-on" size={16} color={colors.accent} />
          <Text style={[styles.address, { color: colors.foreground }]} numberOfLines={1}>{item.destinationAddress}</Text>
        </View>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? colors.success + '20' : colors.danger + '20' }]}>
        <Text style={[styles.statusText, { color: item.status === 'completed' ? colors.success : colors.danger }]}>
          {item.status === 'completed' ? 'Completado' : item.status === 'cancelled' ? 'Cancelado' : 'En proceso'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={trips || []}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="history" size={64} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No has realizado viajes aún</Text>
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
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  date: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  price: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  route: { gap: 8, marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeLine: { width: 1, height: 12, marginLeft: 7 },
  address: { fontFamily: 'Inter_400Regular', fontSize: 14, flex: 1 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 16 }
});