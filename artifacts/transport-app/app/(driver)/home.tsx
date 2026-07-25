import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetMyDriverProfile, useUpdateDriverAvailability, useUpdateTripStatus, TripStatusUpdateStatus } from '@workspace/api-client-react';
import { useTrip } from '@/context/TripContext';
import { useAppAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function DriverHome() {
  const colors = useColors();
  const { profile } = useAppAuth();
  const { data: driverProfile, refetch: refetchDriver } = useGetMyDriverProfile();
  const updateAvailability = useUpdateDriverAvailability();
  const updateTripStatus = useUpdateTripStatus();
  const { activeTrip, isLoading: tripLoading } = useTrip();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  const toggleAvailability = () => {
    const isAvailable = !driverProfile?.isAvailable;
    updateAvailability.mutate({
      data: {
        isAvailable,
        lat: location?.coords.latitude,
        lng: location?.coords.longitude,
      }
    }, {
      onSuccess: () => refetchDriver()
    });
  };

  const handleAction = (status: TripStatusUpdateStatus) => {
    updateTripStatus.mutate({ data: { status, driverId: driverProfile?.id } });
  };

  if (!driverProfile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.availabilitySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: driverProfile.isAvailable ? colors.success : colors.danger }]} />
          <Text style={[styles.statusText, { color: colors.foreground }]}>
            {driverProfile.isAvailable ? 'En línea' : 'Desconectado'}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.toggleButton, { backgroundColor: driverProfile.isAvailable ? colors.danger : colors.success }]}
          onPress={toggleAvailability}
          disabled={updateAvailability.isPending}
        >
          {updateAvailability.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.toggleButtonText}>
              {driverProfile.isAvailable ? 'Desconectarse' : 'Conectarse'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tripContainer}>
        {activeTrip ? (
          <View style={[styles.tripCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.tripHeader}>
              <Text style={[styles.tripStatus, { color: colors.primary }]}>
                {activeTrip.status === 'searching' ? '¡Nueva solicitud!' : 
                 activeTrip.status === 'accepted' ? 'Debes dirigirte al punto' :
                 activeTrip.status === 'arriving' ? 'Llegando al pasajero' : 'En viaje'}
              </Text>
            </View>

            <View style={styles.route}>
              <View style={styles.routeRow}>
                <MaterialIcons name="my-location" size={16} color={colors.primary} />
                <Text style={[styles.address, { color: colors.foreground }]} numberOfLines={1}>{activeTrip.pickupAddress}</Text>
              </View>
              <View style={styles.routeRow}>
                <MaterialIcons name="location-on" size={16} color={colors.accent} />
                <Text style={[styles.address, { color: colors.foreground }]} numberOfLines={1}>{activeTrip.destinationAddress}</Text>
              </View>
            </View>

            <Text style={[styles.priceText, { color: colors.foreground }]}>Precio estimado: ${activeTrip.estimatedPrice}</Text>

            <View style={styles.actions}>
              {activeTrip.status === 'searching' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={() => handleAction('accepted')}>
                  <Text style={styles.actionBtnText}>Aceptar Viaje</Text>
                </TouchableOpacity>
              )}
              {activeTrip.status === 'accepted' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => handleAction('arriving')}>
                  <Text style={styles.actionBtnText}>Llegué al punto</Text>
                </TouchableOpacity>
              )}
              {activeTrip.status === 'arriving' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]} onPress={() => handleAction('in_progress')}>
                  <Text style={styles.actionBtnText}>Iniciar Viaje</Text>
                </TouchableOpacity>
              )}
              {activeTrip.status === 'in_progress' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={() => handleAction('completed')}>
                  <Text style={styles.actionBtnText}>Finalizar Viaje</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.empty}>
            <MaterialIcons name="radar" size={80} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {driverProfile.isAvailable ? 'Buscando viajes cercanos...' : 'Conéctate para recibir viajes'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  availabilitySection: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  toggleButton: {
    height: 56,
    width: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  tripContainer: { flex: 1 },
  tripCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  tripHeader: { marginBottom: 16 },
  tripStatus: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  route: { gap: 12, marginBottom: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  address: { fontFamily: 'Inter_500Medium', fontSize: 16, flex: 1 },
  priceText: { fontFamily: 'Inter_600SemiBold', fontSize: 18, marginBottom: 20 },
  actions: { gap: 12 },
  actionBtn: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { fontFamily: 'Inter_500Medium', fontSize: 18, textAlign: 'center' }
});