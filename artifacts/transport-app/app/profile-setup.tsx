import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUpdateMe } from '@workspace/api-client-react';
import { useAppAuth } from '@/context/AuthContext';

export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refetchProfile } = useAppAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  const updateMe = useUpdateMe();

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    
    updateMe.mutate({ data: { firstName, lastName, phone } }, {
      onSuccess: () => {
        refetchProfile();
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 34) }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Completa tu perfil</Text>
      
      <View style={styles.form}>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="Nombre"
          placeholderTextColor={colors.mutedForeground}
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="Apellido"
          placeholderTextColor={colors.mutedForeground}
          value={lastName}
          onChangeText={setLastName}
        />
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="Teléfono (opcional)"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: (!firstName || !lastName) ? colors.muted : colors.primary }]}
        onPress={handleSave}
        disabled={!firstName || !lastName || updateMe.isPending}
      >
        {updateMe.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Guardar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 32,
    marginTop: 24,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});