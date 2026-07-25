import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetServiceTypes,
  useGetAvailableDrivers,
  useRequestTrip,
} from '@workspace/api-client-react';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import CustomerMap from '@/components/CustomerMap';
import { useTrip } from '@/context/TripContext';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

const SERVICE_ICONS: Record<string, string> = {
  taxi: 'local-taxi',
  premium: 'airport-shuttle',
  xl: 'directions-car',
  moto: 'two-wheeler',
  delivery: 'local-shipping',
  default: 'local-taxi',
};

function getServiceIcon(name: string) {
  const key = name.toLowerCase();
  for (const [service, icon] of Object.entries(SERVICE_ICONS)) {
    if (key.includes(service)) return icon;
  }
  return SERVICE_ICONS.default;
}

export default function CustomerHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeTrip } = useTrip();

  const [pickup, setPickup] = useState('Mi Ubicación Actual');
  const [destination, setDestination] = useState('');
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [region, setRegion] = useState({
    latitude: -34.6037,
    longitude: -58.3816,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const { data: serviceTypes, isLoading: loadingServices } = useGetServiceTypes();
  const { data: availableDrivers } = useGetAvailableDrivers(undefined, {
    query: { refetchInterval: 10000 },
  } as any);

  const requestTrip = useRequestTrip();

  const selectedServiceData = useMemo(
    () => serviceTypes?.find((s) => s.id === selectedService),
    [serviceTypes, selectedService],
  );

  const nearbyDrivers = useMemo(
    () => availableDrivers?.filter((d) => d.lat && d.lng).length ?? 0,
    [availableDrivers],
  );

  useEffect(() => {
    if (activeTrip && activeTrip.status !== 'completed' && activeTrip.status !== 'cancelled') {
      router.push('/(customer)/trip');
    }
  }, [activeTrip, router]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) return;
      setLocationPermission(status === 'granted');
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      if (!isMounted) return;
      setLocation(loc);
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRecenter = async () => {
    if (locationPermission === false) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      if (status !== 'granted') return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
    setRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const canRequest = selectedService && destination.trim().length > 0;

  const handleRequest = () => {
    if (!canRequest) return;

    const baseLat = location?.coords.latitude ?? -34.6037;
    const baseLng = location?.coords.longitude ?? -58.3816;

    requestTrip.mutate(
      {
        data: {
          pickupAddress: pickup,
          pickupLat: baseLat,
          pickupLng: baseLng,
          destinationAddress: destination,
          destinationLat: baseLat + 0.01,
          destinationLng: baseLng + 0.01,
          serviceTypeId: selectedService,
          paymentMethod: 'cash',
        },
      },
      {
        onSuccess: () => {
          router.push('/(customer)/trip');
        },
      },
    );
  };

  const estimatedPrice = selectedServiceData?.basePrice
    ? `$${selectedServiceData.basePrice.toFixed(0)}`
    : null;

  const buttonContent = requestTrip.isPending ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <View style={styles.buttonRow}>
      <Text style={styles.buttonText}>Solicitar viaje</Text>
      {estimatedPrice && <Text style={styles.buttonPrice}>{estimatedPrice}</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomerMap
        style={styles.map}
        region={region}
        availableDrivers={availableDrivers}
        colors={colors}
      />

      <View
        style={[
          styles.header,
          {
            top: insets.top + 8,
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <MaterialIcons name="local-taxi" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>TransMóvil</Text>
        </View>
        {nearbyDrivers > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>
              {nearbyDrivers} cerca
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.recenterButton,
          {
            top: insets.top + 64,
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <MaterialIcons name="my-location" size={22} color={colors.primary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetContainer}
      >
        <KeyboardAwareScrollViewCompat
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.sheetScroll}
        >
          <View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(insets.bottom, 16),
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.locationInputs}>
              <View style={styles.inputLine}>
                <View style={styles.dotLine}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                  <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                </View>
                <View style={styles.inputsStack}>
                  <View
                    style={[
                      styles.inputField,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      value={pickup}
                      onChangeText={setPickup}
                      placeholder="Punto de partida"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    {locationPermission === false && (
                      <MaterialIcons name="location-off" size={18} color={colors.warning} />
                    )}
                  </View>
                  <View
                    style={[
                      styles.inputField,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      value={destination}
                      onChangeText={setDestination}
                      placeholder="¿A dónde vas?"
                      placeholderTextColor={colors.mutedForeground}
                    />
                    {destination.length === 0 && (
                      <MaterialIcons name="search" size={18} color={colors.mutedForeground} />
                    )}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Elige un servicio
              </Text>
              {selectedServiceData && (
                <Text style={[styles.estimate, { color: colors.mutedForeground }]}>
                  Estimado: {estimatedPrice}
                </Text>
              )}
            </View>

            {loadingServices ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.servicesScroll}
              >
                {serviceTypes?.map((service) => {
                  const isSelected = selectedService === service.id;
                  const iconName = getServiceIcon(service.name) as any;
                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.serviceCard,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedService(service.id)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.iconCircle,
                          {
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.primary + '15',
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={iconName}
                          size={28}
                          color={isSelected ? '#fff' : colors.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.serviceName,
                          { color: isSelected ? '#fff' : colors.foreground },
                        ]}
                      >
                        {service.name}
                      </Text>
                      <Text
                        style={[
                          styles.servicePrice,
                          { color: isSelected ? 'rgba(255,255,255,0.85)' : colors.mutedForeground },
                        ]}
                      >
                        Desde ${service.basePrice}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: canRequest ? colors.primary : colors.muted,
                  opacity: requestTrip.isPending ? 0.9 : 1,
                },
              ]}
              disabled={!canRequest || requestTrip.isPending}
              onPress={handleRequest}
              activeOpacity={0.85}
            >
              {buttonContent}
            </TouchableOpacity>

            {requestTrip.isError && (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                No se pudo solicitar el viaje. Intentá de nuevo.
              </Text>
            )}
          </View>
        </KeyboardAwareScrollViewCompat>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  header: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '58%',
  },
  sheetScroll: {
    justifyContent: 'flex-end',
    flexGrow: 1,
  },
  bottomSheet: {
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  locationInputs: {
    marginBottom: 20,
  },
  inputLine: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dotLine: {
    width: 18,
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  inputsStack: {
    flex: 1,
    gap: 10,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  estimate: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  servicesScroll: {
    gap: 12,
    paddingRight: 4,
    paddingBottom: 4,
  },
  serviceCard: {
    width: 116,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
  },
  servicePrice: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  button: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  buttonPrice: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
});
