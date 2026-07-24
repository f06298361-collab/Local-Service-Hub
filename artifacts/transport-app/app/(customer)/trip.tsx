import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCancelTrip } from '@workspace/api-client-react';
import { MaterialIcons } from '@expo-vector-icons';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTrip } from '@/context/TripContext';

export default function CustomerTrip() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeTrip, isLoading } = useTrip();
  const cancelTrip = useCancelTrip();

  if (isLoading || !activeTrip) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleCancel = () => {
    cancelTrip.mutate({ data: { reason: 'Customer requested cancellation' } }, {
      onSuccess: () => {
        router.back();
      }
    });
  };

  const statusMap: Record<string, string> = {
    searching: 'Buscando conductor',
    accepted: 'Conductor asignado',
    arriving: 'Conductor llegando',
    in_progress: 'En viaje',
    completed: 'Viaje completado',
    cancelled: 'Viaje cancelado'
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Platform.OS !== 'web' ? (
        <MapView 
          style={styles.map} 
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
      ) : (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card }]}>
          <MaterialIcons name="map" size={48} color={colors.muted} />
          <Text style={{ color: colors.mutedForeground }}>Mapa no disponible en web</Text>
        </View>
      )}

      <View style={[styles.bottomSheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.statusHeader}>
          <Text style={[styles.statusText, { color: colors.foreground }]}>{statusMap[activeTrip.status]}</Text>
          {activeTrip.status === 'searching' && <ActivityIndicator color={colors.primary} />}
        </View>

        {activeTrip.driver && (
          <View style={[styles.driverCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryDark }]}>
              <MaterialIcons name="person" size={24} color="#fff" />
            </View>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: colors.foreground }]}>{activeTrip.driver.firstName} {activeTrip.driver.lastName}</Text>
              <Text style={[styles.vehicleInfo, { color: colors.mutedForeground }]}>
                {activeTrip.driver.vehicleMake} {activeTrip.driver.vehicleModel} • {activeTrip.driver.vehiclePlate}
              </Text>
            </View>
            <View style={styles.rating}>
              <MaterialIcons name="star" size={16} color={colors.warning} />
              <Text style={[styles.ratingText, { color: colors.foreground }]}>{activeTrip.driver.rating.toFixed(1)}</Text>
            </View>
          </View>
        )}

        <View style={styles.routeInfo}>
          <View style={styles.routeRow}>
            <MaterialIcons name="my-location" size={16} color={colors.primary} />
            <Text style={[styles.addressText, { color: colors.foreground }]} numberOfLines={1}>{activeTrip.pickupAddress}</Text>
          </View>
          <View style={styles.routeRow}>
            <MaterialIcons name="location-on" size={16} color={colors.accent} />
            <Text style={[styles.addressText, { color: colors.foreground }]} numberOfLines={1}>{activeTrip.destinationAddress}</Text>
          </View>
        </View>

        {(activeTrip.status === 'searching' || activeTrip.status === 'accepted') && (
          <TouchableOpacity 
            style={[styles.cancelButton, { borderColor: colors.danger }]}
            onPress={handleCancel}
            disabled={cancelTrip.isPending}
          >
            {cancelTrip.isPending ? <ActivityIndicator color={colors.danger} /> : <Text style={[styles.cancelText, { color: colors.danger }]}>Cancelar Viaje</Text>}
          </TouchableOpacity>
        )}
        
        {activeTrip.status === 'completed' && (
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Volver al inicio</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  bottomSheet: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  vehicleInfo: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  routeInfo: {
    gap: 8,
    marginBottom: 20,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    flex: 1,
  },
  cancelButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  }
});