import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAppAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useGetMyDriverProfile } from '@workspace/api-client-react';

export default function DriverProfile() {
  const colors = useColors();
  const { profile } = useAppAuth();
  const { signOut } = useAuth();
  const { data: driverProfile, isLoading } = useGetMyDriverProfile();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryDark }]}>
          <Text style={styles.avatarText}>{profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{profile?.firstName} {profile?.lastName}</Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{profile?.email}</Text>
        
        <View style={[styles.statusBadge, { backgroundColor: driverProfile?.status === 'approved' ? colors.success + '20' : colors.warning + '20' }]}>
          <Text style={[styles.statusText, { color: driverProfile?.status === 'approved' ? colors.success : colors.warning }]}>
            {driverProfile?.status === 'approved' ? 'Aprobado' : 'Pendiente'}
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="directions-car" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tu Vehículo</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Marca / Modelo</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{driverProfile?.vehicle?.make} {driverProfile?.vehicle?.model}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Patente</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{driverProfile?.vehicle?.plate}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Color</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{driverProfile?.vehicle?.color}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="settings" size={24} color={colors.foreground} />
          <Text style={[styles.menuText, { color: colors.foreground }]}>Configuración de la cuenta</Text>
          <MaterialIcons name="chevron-right" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

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
  content: { padding: 16, gap: 16 },
  header: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  email: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  infoLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  infoValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  signOutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  }
});