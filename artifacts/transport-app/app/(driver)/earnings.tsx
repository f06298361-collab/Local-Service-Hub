import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetMyEarnings, GetMyEarningsPeriod } from '@workspace/api-client-react';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDateTime } from '@/utils/date';

export default function DriverEarnings() {
  const colors = useColors();
  const [period, setPeriod] = useState<GetMyEarningsPeriod>('today');
  const { data: earnings, isLoading } = useGetMyEarnings({ period });

  const periods: { label: string, value: GetMyEarningsPeriod }[] = [
    { label: 'Hoy', value: 'today' },
    { label: 'Semana', value: 'week' },
    { label: 'Mes', value: 'month' },
  ];

  if (isLoading && !earnings) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.tabs}>
        {periods.map(p => (
          <TouchableOpacity 
            key={p.value}
            style={[styles.tab, { 
              backgroundColor: period === p.value ? colors.primary : colors.card,
              borderColor: period === p.value ? colors.primary : colors.border
            }]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[styles.tabText, { color: period === p.value ? '#fff' : colors.foreground }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Ganancias Totales</Text>
        <Text style={[styles.summaryAmount, { color: colors.foreground }]}>${earnings?.driverEarnings?.toFixed(2) || '0.00'}</Text>
        
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Viajes</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{earnings?.totalTrips || 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Comisión Plataforma</Text>
            <Text style={[styles.statValue, { color: colors.danger }]}>${earnings?.platformCommission?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pagos Recientes</Text>

      {earnings?.recentPayments?.length ? (
        earnings.recentPayments.map((payment: any) => (
          <View key={payment.id} style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.paymentIcon, { backgroundColor: colors.success + '20' }]}>
              <MaterialIcons name="attach-money" size={24} color={colors.success} />
            </View>
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentMethod, { color: colors.foreground }]}>Viaje #{payment.tripId}</Text>
              <Text style={[styles.paymentDate, { color: colors.mutedForeground }]}>{formatDateTime(payment.createdAt)}</Text>
            </View>
            <Text style={[styles.paymentAmount, { color: colors.success }]}>+${payment.driverAmount.toFixed(2)}</Text>
          </View>
        ))
      ) : (
        <View style={styles.empty}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>No hay pagos en este periodo</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  tab: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  summaryCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 32,
  },
  summaryLabel: { fontFamily: 'Inter_500Medium', fontSize: 16, marginBottom: 8 },
  summaryAmount: { fontFamily: 'Inter_700Bold', fontSize: 48, marginBottom: 24 },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: '100%', backgroundColor: '#333' },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  statValue: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, marginBottom: 16 },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  paymentIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  paymentInfo: { flex: 1 },
  paymentMethod: { fontFamily: 'Inter_600SemiBold', fontSize: 16, marginBottom: 4 },
  paymentDate: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  paymentAmount: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  empty: { padding: 24, alignItems: 'center' },
});