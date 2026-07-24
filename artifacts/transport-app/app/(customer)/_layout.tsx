import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo-vector-icons';
import { useColors } from '@/hooks/useColors';

export default function CustomerLayout() {
  const colors = useColors();
  
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedForeground,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
      },
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerTintColor: colors.foreground,
    }}>
      <Tabs.Screen 
        name="home" 
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="history" 
        options={{
          title: 'Viajes',
          tabBarIcon: ({ color }) => <MaterialIcons name="history" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="notifications" 
        options={{
          title: 'Notificaciones',
          tabBarIcon: ({ color }) => <MaterialIcons name="notifications" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="trip" 
        options={{
          title: 'Viaje Activo',
          href: null,
          headerShown: false,
        }} 
      />
    </Tabs>
  );
}