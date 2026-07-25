import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';

type TripMapProps = {
  style?: StyleProp<ViewStyle>;
  activeTrip: {
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
    primary: string;
    danger: string;
    accent: string;
  };
};

export default function TripMap({ style, activeTrip, colors }: TripMapProps) {
  return (
    <MapView
      style={style}
      provider={PROVIDER_DEFAULT}
      initialRegion={{
        latitude: activeTrip.pickupLat,
        longitude: activeTrip.pickupLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      <Marker coordinate={{ latitude: activeTrip.pickupLat, longitude: activeTrip.pickupLng }}>
        <MaterialIcons name="person-pin-circle" size={40} color={colors.primary} />
      </Marker>
      <Marker coordinate={{ latitude: activeTrip.destinationLat, longitude: activeTrip.destinationLng }}>
        <MaterialIcons name="location-on" size={40} color={colors.danger} />
      </Marker>
      {activeTrip.driver?.lat && activeTrip.driver?.lng && (
        <Marker coordinate={{ latitude: activeTrip.driver.lat, longitude: activeTrip.driver.lng }}>
          <MaterialIcons name="local-taxi" size={32} color={colors.accent} />
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});