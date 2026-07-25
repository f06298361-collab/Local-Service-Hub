import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCancelTrip } from '@workspace/api-client-react';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import TripMap from '@/components/TripMap';
import { useTrip } from '@/context/TripContext';

// ---------------------------------------------------------------------------
// Searching animation — 3 pulsing rings emanating from a central icon
// ---------------------------------------------------------------------------
function PulsingRing({
  animValue,
  color,
  size,
}: {
  animValue: Animated.Value;
  color: string;
  size: number;
}) {
  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1.6],
  });
  const opacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 0.35, 0],
  });

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          transform: [{ scale }],
          opacity,
          position: 'absolute',
        },
      ]}
    />
  );
}

function SearchingAnimation({ color }: { color: string }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  const DURATION = 2100;
  const STAGGER = 700;

  useEffect(() => {
    const makeLoop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: DURATION,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = makeLoop(ring1, 0);
    const a2 = makeLoop(ring2, STAGGER);
    const a3 = makeLoop(ring3, STAGGER * 2);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [ring1, ring2, ring3]);

  const RING_SIZE = 160;

  return (
    <View style={styles.animContainer}>
      <PulsingRing animValue={ring1} color={color} size={RING_SIZE} />
      <PulsingRing animValue={ring2} color={color} size={RING_SIZE} />
      <PulsingRing animValue={ring3} color={color} size={RING_SIZE} />
      {/* Central icon */}
      <View style={[styles.centerIcon, { backgroundColor: color }]}>
        <MaterialIcons name="local-taxi" size={32} color="#fff" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Elapsed-time hook — counts seconds while the searching state is active
// ---------------------------------------------------------------------------
function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `${secs}s`;
}

// ---------------------------------------------------------------------------
// Searching state bottom-sheet content
// ---------------------------------------------------------------------------
function SearchingSheet({
  pickupAddress,
  destinationAddress,
  onCancel,
  isCancelling,
  colors,
  insets,
}: {
  pickupAddress: string;
  destinationAddress: string;
  onCancel: () => void;
  isCancelling: boolean;
  colors: ReturnType<typeof useColors>;
  insets: { bottom: number };
}) {
  const elapsed = useElapsedSeconds();

  // Animated dots for the label
  const dotsAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(dotsAnim, {
        toValue: 3,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [dotsAnim]);

  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const id = setInterval(
      () => setDotCount((d) => (d >= 3 ? 1 : d + 1)),
      400,
    );
    return () => clearInterval(id);
  }, []);
  const dots = '.'.repeat(dotCount);

  return (
    <View
      style={[
        styles.bottomSheet,
        {
          backgroundColor: colors.card,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      {/* Animation + headline */}
      <View style={styles.searchingHeader}>
        <SearchingAnimation color={colors.primary} />

        <Text style={[styles.searchingTitle, { color: colors.foreground }]}>
          Buscando conductor{dots}
        </Text>
        <Text style={[styles.searchingTimer, { color: colors.mutedForeground }]}>
          Tiempo de búsqueda:{' '}
          <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
            {elapsed}
          </Text>
        </Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Route summary */}
      <View style={styles.routeInfo}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.primary }]} />
          <Text
            style={[styles.addressText, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {pickupAddress}
          </Text>
        </View>
        <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.accent }]} />
          <Text
            style={[styles.addressText, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {destinationAddress}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Cancel button */}
      <TouchableOpacity
        style={[styles.cancelButton, { borderColor: colors.danger }]}
        onPress={onCancel}
        disabled={isCancelling}
        activeOpacity={0.75}
      >
        {isCancelling ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <MaterialIcons name="close" size={18} color={colors.danger} />
            <Text style={[styles.cancelText, { color: colors.danger }]}>
              Cancelar solicitud
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function CustomerTrip() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeTrip, isLoading } = useTrip();
  const cancelTrip = useCancelTrip();

  if (isLoading || !activeTrip) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
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
    cancelled: 'Viaje cancelado',
  };

  // ── Searching state: dedicated animated view ──────────────────────────────
  if (activeTrip.status === 'searching') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TripMap style={styles.map} activeTrip={activeTrip} colors={colors} />
        <SearchingSheet
          pickupAddress={activeTrip.pickupAddress}
          destinationAddress={activeTrip.destinationAddress}
          onCancel={handleCancel}
          isCancelling={cancelTrip.isPending}
          colors={colors}
          insets={insets}
        />
      </View>
    );
  }

  // ── All other states: existing layout ────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TripMap style={styles.map} activeTrip={activeTrip} colors={colors} />

      <View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View style={styles.statusHeader}>
          <Text style={[styles.statusText, { color: colors.foreground }]}>
            {statusMap[activeTrip.status]}
          </Text>
        </View>

        {activeTrip.driver && (
          <View
            style={[
              styles.driverCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.avatar, { backgroundColor: colors.primaryDark }]}
            >
              <MaterialIcons name="person" size={24} color="#fff" />
            </View>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: colors.foreground }]}>
                {activeTrip.driver.firstName} {activeTrip.driver.lastName}
              </Text>
              <Text
                style={[styles.vehicleInfo, { color: colors.mutedForeground }]}
              >
                {activeTrip.driver.vehicleMake} {activeTrip.driver.vehicleModel}{' '}
                • {activeTrip.driver.vehiclePlate}
              </Text>
            </View>
            <View style={styles.rating}>
              <MaterialIcons name="star" size={16} color={colors.warning} />
              <Text style={[styles.ratingText, { color: colors.foreground }]}>
                {activeTrip.driver.rating.toFixed(1)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.routeInfo}>
          <View style={styles.routeRow}>
            <MaterialIcons name="my-location" size={16} color={colors.primary} />
            <Text
              style={[styles.addressText, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {activeTrip.pickupAddress}
            </Text>
          </View>
          <View style={styles.routeRow}>
            <MaterialIcons name="location-on" size={16} color={colors.accent} />
            <Text
              style={[styles.addressText, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {activeTrip.destinationAddress}
            </Text>
          </View>
        </View>

        {(activeTrip.status === 'accepted') && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.danger }]}
            onPress={handleCancel}
            disabled={cancelTrip.isPending}
          >
            {cancelTrip.isPending ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <Text style={[styles.cancelText, { color: colors.danger }]}>
                Cancelar Viaje
              </Text>
            )}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Bottom sheet (shared)
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

  // ── Searching state ──────────────────────────────────────────────────────
  searchingHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  animContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ring: {
    borderWidth: 2,
  },
  centerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  searchingTimer: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },

  // Route rows (searching sheet + fallback sheet)
  routeInfo: {
    marginBottom: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  routeLine: {
    width: 2,
    height: 16,
    marginLeft: 4,
  },
  addressText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    flex: 1,
  },

  // Cancel button
  cancelButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  cancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },

  // ── Other states ─────────────────────────────────────────────────────────
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
  },
});
