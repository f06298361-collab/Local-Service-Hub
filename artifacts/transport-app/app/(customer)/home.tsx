import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetServiceTypes, useGetAvailableDrivers, useRequestTrip } from '@workspace/api-client-react';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import CustomerMap from '@/components/CustomerMap';
import { useTrip } from '@/context/TripContext';

export default function CustomerHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeTrip } = useTrip();
  
  const [pickup, setPickup] = useState('Mi Ubicación Actual');
  const [destination, setDestination] = useState('');
  const [selectedService, setSelectedService] = useState<number | null>(null);
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState({
    latitude: -34.6037,
    longitude: -58.3816,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const { data: serviceTypes, isLoading: loadingServices } = useGetServiceTypes();
  const { data: availableDrivers } = useGetAvailableDrivers({ 
    query: { refetchInterval: 10000 } 
  });
  
  const requestTrip = useRequestTrip();

  useEffect(() => {
    if (activeTrip && activeTrip.status !== 'completed' && activeTrip.status !== 'cancelled') {
      router.push('/(customer)/trip');
    }
  }, [activeTrip, router]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  const handleRequest = () => {
    if (!selectedService || !destination) return;
    
    requestTrip.mutate({
      data: {
        pickupAddress: pickup,
        pickupLat: location?.coords.latitude || -34.6037,
        pickupLng: location?.coords.longitude || -58.3816,
        destinationAddress: destination,
        destinationLat: (location?.coords.latitude || -34.6037) + 0.01,
        destinationLng: (location?.coords.longitude || -58.3816) + 0.01,
        serviceTypeId: selectedService,
        paymentMethod: 'cash'
      }
    }, {
      onSuccess: () => {
        router.push('/(customer)/trip');
      }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomerMap style={styles.map} region={region} availableDrivers={availableDrivers} colors={colors} />

      <View style={[styles.bottomSheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.inputs}>
          <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
            <MaterialIcons name="my-location" size={20} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={pickup}
              onChangeText={setPickup}
              placeholder="Punto de partida"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
            <MaterialIcons name="location-on" size={20} color={colors.accent} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={destination}
              onChangeText={setDestination}
              placeholder="¿A dónde vas?"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Elige un servicio</Text>
        
        {loadingServices ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScroll}>
            {serviceTypes?.map(service => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard, 
                  { 
                    backgroundColor: selectedService === service.id ? colors.primaryDark : colors.background,
                    borderColor: selectedService === service.id ? colors.primary : colors.border
                  }
                ]}
                onPress={() => setSelectedService(service.id)}
              >
                <MaterialIcons name="local-taxi" size={32} color={selectedService === service.id ? '#fff' : colors.primary} />
                <Text style={[styles.serviceName, { color: selectedService === service.id ? '#fff' : colors.foreground }]}>{service.name}</Text>
                <Text style={[styles.servicePrice, { color: selectedService === service.id ? '#ddd' : colors.mutedForeground }]}>
                  Desde ${service.basePrice}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: (!selectedService || !destination) ? colors.muted : colors.primary }]}
          disabled={!selectedService || !destination || requestTrip.isPending}
          onPress={handleRequest}
        >
          {requestTrip.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Solicitar viaje</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  bottomSheet: {
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputs: { gap: 12, marginBottom: 16 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 8,
    gap: 8,
  },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16 },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginBottom: 12,
  },
  servicesScroll: { gap: 12, paddingRight: 16, marginBottom: 16 },
  serviceCard: {
    width: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  serviceName: { fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center' },
  servicePrice: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 16 }
});