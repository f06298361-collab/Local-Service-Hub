import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type CustomerMapProps = {
  style?: StyleProp<ViewStyle>;
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  availableDrivers?: Array<{
    id: number;
    lat?: number | null;
    lng?: number | null;
  }>;
  colors: {
    card: string;
    muted: string;
    mutedForeground: string;
  };
};

export default function CustomerMap({ style, colors }: CustomerMapProps) {
  return (
    <View style={[styles.map, style, { backgroundColor: colors.card }]}>
      <MaterialIcons name="map" size={48} color={colors.muted} />
      <Text style={{ color: colors.mutedForeground }}>Mapa no disponible en web</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});