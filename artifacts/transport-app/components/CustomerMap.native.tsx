import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';

type CustomerMapProps = {
  style?: StyleProp<ViewStyle>;
  region: {
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
    primary: string;
  };
};

export default function CustomerMap({ style, region, availableDrivers, colors }: CustomerMapProps) {
  return (
    <MapView style={[styles.map, style]} provider={PROVIDER_DEFAULT} region={region} showsUserLocation>
      {availableDrivers?.map(
        (driver) =>
          driver.lat &&
          driver.lng && (
            <Marker key={driver.id} coordinate={{ latitude: driver.lat, longitude: driver.lng }}>
              <View style={[styles.marker, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="local-taxi" size={16} color="#fff" />
              </View>
            </Marker>
          ),
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});