import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export default function AdminLayout() {
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
        name="dashboard" 
        options={{
          title: 'Panel',
          tabBarIcon: ({ color }) => <MaterialIcons name="dashboard" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="users" 
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color }) => <MaterialIcons name="people" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="drivers" 
        options={{
          title: 'Conductores',
          tabBarIcon: ({ color }) => <MaterialIcons name="local-taxi" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="trips" 
        options={{
          title: 'Viajes',
          tabBarIcon: ({ color }) => <MaterialIcons name="map" size={24} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="config" 
        options={{
          title: 'Config',
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />
        }} 
      />
    </Tabs>
  );
}