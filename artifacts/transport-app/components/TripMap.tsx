import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type TripMapProps = {
  style?: StyleProp<ViewStyle>;
  activeTrip?: {
    pickupLat: number;
    pickupLng: number;
    destinationLat: number;
    destinationLng: number;
    driver?: {
      lat?: number | null;
      lng?: number | null;
    } | null;
  };
  colors: {
    card: string;
    muted: string;
    mutedForeground: string;
  };
};

export default function TripMap({ style, colors }: TripMapProps) {
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