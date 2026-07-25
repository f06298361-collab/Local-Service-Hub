import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetAdminStats } from '@workspace/api-client-react';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';

export default function AdminDashboard() {
  const colors = useColors();
  const { data: stats, isLoading } = useGetAdminStats();
  const { signOut } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const cards = [
    { label: 'Usuarios', value: stats?.totalUsers || 0, icon: 'people', color: colors.primary },
    { label: 'Conductores', value: stats?.totalDrivers || 0, icon: 'local-taxi', color: colors.accent },
    { label: 'Viajes Totales', value: stats?.totalTrips || 0, icon: 'map', color: colors.success },
    { label: 'Viajes Activos', value: stats?.activeTrips || 0, icon: 'radar', color: colors.warning },
    { label: 'Ingresos Hoy', value: `$${stats?.earningsToday?.toFixed(2) || '0.00'}`, icon: 'attach-money', color: colors.primaryDark },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.grid}>
        {cards.map((c, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: c.color + '20' }]}>
              <MaterialIcons name={c.icon as any} size={24} color={c.color} />
            </View>
            <Text style={[styles.value, { color: colors.foreground }]}>{c.value}</Text>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{c.label}</Text>
          </View>
        ))}
      </View>

      {stats?.pendingDrivers && stats.pendingDrivers > 0 ? (
        <View style={[styles.alertCard, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
          <MaterialIcons name="warning" size={24} color={colors.warning} />
          <Text style={[styles.alertText, { color: colors.warning }]}>
            Tienes {stats.pendingDrivers} conductores pendientes de aprobación
          </Text>
        </View>
      ) : null}

      <TouchableOpacity 
        style={[styles.signOutButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => signOut()}
      >
        <MaterialIcons name="logout" size={24} color={colors.danger} />
        <Text style={[styles.signOutText, { color: colors.danger }]}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  alertText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  signOutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  }
});