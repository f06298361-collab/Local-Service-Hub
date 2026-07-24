import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAppAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo-vector-icons';
import { useAuth } from '@clerk/expo';

export default function CustomerProfile() {
  const colors = useColors();
  const { profile } = useAppAuth();
  const { signOut } = useAuth();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryDark }]}>
          <Text style={styles.avatarText}>{profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{profile?.firstName} {profile?.lastName}</Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{profile?.email}</Text>
        <Text style={[styles.phone, { color: colors.mutedForeground }]}>{profile?.phone || 'Sin teléfono'}</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="person" size={24} color={colors.foreground} />
          <Text style={[styles.menuText, { color: colors.foreground }]}>Editar Perfil</Text>
          <MaterialIcons name="chevron-right" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="favorite" size={24} color={colors.foreground} />
          <Text style={[styles.menuText, { color: colors.foreground }]}>Lugares Guardados</Text>
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
    marginBottom: 4,
  },
  phone: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
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
    marginLeft: 52,
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