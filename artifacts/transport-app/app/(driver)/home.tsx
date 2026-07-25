import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  ActivityIndicator, ScrollView, Animated,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import {
  useGetMyDriverProfile, useUpdateDriverAvailability,
  useUpdateTripStatus, TripStatusUpdateStatus,
} from '@workspace/api-client-react';
import { useTrip } from '@/context/TripContext';
import { useAppAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Haversine great-circle distance (km) */
function calcDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): string {
  const R = 6371;
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

function getInitials(first?: string, last?: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

// ─── Active-trip status config ────────────────────────────────────────────────

const ACTIVE_STATUS = {
  accepted: {
    label: 'Dirigiéndose al punto de recogida',
    actionLabel: 'Llegué al punto',
    nextStatus: 'arriving' as TripStatusUpdateStatus,
    icon: 'directions-car' as const,
    colorKey: 'primary' as const,
  },
  arriving: {
    label: 'Llegando al pasajero',
    actionLabel: 'Iniciar viaje',
    nextStatus: 'in_progress' as TripStatusUpdateStatus,
    icon: 'person-pin-circle' as const,
    colorKey: 'warning' as const,
  },
  in_progress: {
    label: 'En camino al destino',
    actionLabel: 'Finalizar viaje',
    nextStatus: 'completed' as TripStatusUpdateStatus,
    icon: 'navigation' as const,
    colorKey: 'accent' as const,
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function DriverHome() {
  const colors = useColors();
  const { profile } = useAppAuth();
  const { data: driverProfile, refetch: refetchDriver } = useGetMyDriverProfile();
  const updateAvailability = useUpdateDriverAvailability();
  const updateTripStatus = useUpdateTripStatus();
  const { activeTrip, isLoading: tripLoading } = useTrip();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  // Subtle pulse when there is an incoming trip request
  useEffect(() => {
    if (activeTrip?.status === 'searching') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.025, duration: 750, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [activeTrip?.status, pulseAnim]);

  // ─── Handlers (unchanged logic) ───────────────────────────────────────────

  const toggleAvailability = () => {
    const isAvailable = !driverProfile?.isAvailable;
    updateAvailability.mutate(
      { data: { isAvailable, lat: location?.coords.latitude, lng: location?.coords.longitude } },
      { onSuccess: () => refetchDriver() },
    );
  };

  const handleAction = (status: TripStatusUpdateStatus) => {
    updateTripStatus.mutate({ data: { status, driverId: driverProfile?.id } });
  };

  // ─── Loading gate ─────────────────────────────────────────────────────────

  if (!driverProfile) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ─── Derived values ───────────────────────────────────────────────────────

  const isAvailable = driverProfile.isAvailable;
  const actionPending = updateTripStatus.isPending;

  const passengerFirst = activeTrip?.customer?.firstName;
  const passengerLast = activeTrip?.customer?.lastName;
  const passengerName =
    [passengerFirst, passengerLast].filter(Boolean).join(' ') || 'Pasajero';
  const initials = getInitials(passengerFirst, passengerLast);

  const distance = activeTrip
    ? calcDistanceKm(
        activeTrip.pickupLat, activeTrip.pickupLng,
        activeTrip.destinationLat, activeTrip.destinationLng,
      )
    : null;

  const fareLabel =
    activeTrip?.estimatedPrice != null ? `$${activeTrip.estimatedPrice}` : '—';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Availability card ── */}
      <View style={[styles.availCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.availLeft}>
          <View style={[styles.statusDot, { backgroundColor: isAvailable ? colors.success : colors.danger }]} />
          <View>
            <Text style={[styles.availTitle, { color: colors.foreground }]}>
              {isAvailable ? 'En línea' : 'Desconectado'}
            </Text>
            <Text style={[styles.availSub, { color: colors.mutedForeground }]}>
              {isAvailable ? 'Recibiendo solicitudes' : 'Sin actividad'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { backgroundColor: isAvailable ? colors.danger : colors.success },
            updateAvailability.isPending && styles.opDisabled,
          ]}
          onPress={toggleAvailability}
          disabled={updateAvailability.isPending}
          activeOpacity={0.82}
        >
          {updateAvailability.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons
                name={isAvailable ? 'power-settings-new' : 'wifi-tethering'}
                size={16}
                color="#fff"
              />
              <Text style={styles.toggleBtnText}>
                {isAvailable ? 'Desconectarse' : 'Conectarse'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Trip area ── */}
      {activeTrip ? (

        activeTrip.status === 'searching' ? (

          /* ── Incoming trip notification ── */
          <Animated.View
            style={[
              styles.notifCard,
              { backgroundColor: colors.card, borderColor: colors.accent },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {/* Header badge */}
            <View style={[styles.notifHeader, { backgroundColor: colors.accent + '1A' }]}>
              <View style={[styles.notifDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.notifHeaderText, { color: colors.accent }]}>
                NUEVA SOLICITUD DE VIAJE
              </Text>
            </View>

            {/* Passenger */}
            <View style={styles.passengerRow}>
              <View style={[
                styles.avatar,
                { backgroundColor: colors.primary + '22', borderColor: colors.primary + '55' },
              ]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
              </View>
              <View style={styles.passengerInfo}>
                <Text style={[styles.passengerName, { color: colors.foreground }]}>
                  {passengerName}
                </Text>
                <View style={styles.verifiedRow}>
                  <MaterialIcons name="verified-user" size={12} color={colors.success} />
                  <Text style={[styles.verifiedText, { color: colors.mutedForeground }]}>
                    Pasajero verificado
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Route timeline */}
            <RouteTimeline
              pickupAddress={activeTrip.pickupAddress}
              destinationAddress={activeTrip.destinationAddress}
              colors={colors}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatChip
                icon="attach-money"
                value={fareLabel}
                label="tarifa est."
                chipBg={colors.success + '18'}
                chipBorder={colors.success + '44'}
                valueColor={colors.success}
                labelColor={colors.mutedForeground}
              />
              <StatChip
                icon="straighten"
                value={`${distance} km`}
                label="distancia"
                chipBg={colors.accent + '18'}
                chipBorder={colors.accent + '44'}
                valueColor={colors.accent}
                labelColor={colors.mutedForeground}
              />
            </View>

            {/* Accept / Reject */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.rejectBtn,
                  { borderColor: colors.danger },
                  actionPending && styles.opDisabled,
                ]}
                onPress={() => handleAction('cancelled')}
                disabled={actionPending}
                activeOpacity={0.8}
              >
                {actionPending ? (
                  <ActivityIndicator color={colors.danger} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="close" size={20} color={colors.danger} />
                    <Text style={[styles.rejectBtnText, { color: colors.danger }]}>Rechazar</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.acceptBtn,
                  { backgroundColor: colors.success },
                  actionPending && styles.opDisabled,
                ]}
                onPress={() => handleAction('accepted')}
                disabled={actionPending}
                activeOpacity={0.82}
              >
                {actionPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.acceptBtnText}>Aceptar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

        ) : (

          /* ── Active trip card ── */
          (() => {
            const cfg = ACTIVE_STATUS[activeTrip.status as keyof typeof ACTIVE_STATUS];
            const cfgColor = cfg ? colors[cfg.colorKey] : colors.mutedForeground;
            return (
              <View style={[
                styles.activeCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}>
                {/* Status badge */}
                {cfg && (
                  <View style={[styles.activeBadge, { backgroundColor: cfgColor + '1A' }]}>
                    <MaterialIcons name={cfg.icon} size={15} color={cfgColor} />
                    <Text style={[styles.activeBadgeText, { color: cfgColor }]}>{cfg.label}</Text>
                  </View>
                )}

                {/* Passenger */}
                <View style={styles.passengerRow}>
                  <View style={[
                    styles.avatar,
                    { backgroundColor: colors.primary + '22', borderColor: colors.primary + '55' },
                  ]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                  </View>
                  <View style={styles.passengerInfo}>
                    <Text style={[styles.passengerName, { color: colors.foreground }]}>
                      {passengerName}
                    </Text>
                    <View style={styles.verifiedRow}>
                      <MaterialIcons name="verified-user" size={12} color={colors.success} />
                      <Text style={[styles.verifiedText, { color: colors.mutedForeground }]}>
                        Pasajero verificado
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <RouteTimeline
                  pickupAddress={activeTrip.pickupAddress}
                  destinationAddress={activeTrip.destinationAddress}
                  colors={colors}
                />

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.statsRow}>
                  <StatChip
                    icon="attach-money"
                    value={fareLabel}
                    label="tarifa est."
                    chipBg={colors.success + '18'}
                    chipBorder={colors.success + '44'}
                    valueColor={colors.success}
                    labelColor={colors.mutedForeground}
                  />
                  <StatChip
                    icon="straighten"
                    value={`${distance} km`}
                    label="distancia"
                    chipBg={colors.accent + '18'}
                    chipBorder={colors.accent + '44'}
                    valueColor={colors.accent}
                    labelColor={colors.mutedForeground}
                  />
                </View>

                {/* Contextual action button */}
                {cfg && (
                  <TouchableOpacity
                    style={[
                      styles.fullBtn,
                      { backgroundColor: cfgColor },
                      actionPending && styles.opDisabled,
                    ]}
                    onPress={() => handleAction(cfg.nextStatus)}
                    disabled={actionPending}
                    activeOpacity={0.82}
                  >
                    {actionPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name={cfg.icon} size={18} color="#fff" />
                        <Text style={styles.fullBtnText}>{cfg.actionLabel}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })()
        )

      ) : (

        /* ── Empty state ── */
        <View style={styles.emptyState}>
          <View style={[
            styles.emptyIconWrap,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}>
            <MaterialIcons
              name={isAvailable ? 'radar' : 'wifi-off'}
              size={52}
              color={isAvailable ? colors.primary : colors.mutedForeground}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {isAvailable ? 'Buscando viajes' : 'Sin conexión'}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {isAvailable
              ? 'Estás en línea y listo para recibir solicitudes de pasajeros cercanos'
              : 'Conéctate para empezar a recibir solicitudes de viaje'}
          </Text>
        </View>

      )}
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Colors = ReturnType<typeof import('@/hooks/useColors').useColors>;

function RouteTimeline({
  pickupAddress,
  destinationAddress,
  colors,
}: {
  pickupAddress: string;
  destinationAddress: string;
  colors: Colors;
}) {
  return (
    <View style={styles.routeWrap}>
      {/* Vertical timeline */}
      <View style={styles.timeline}>
        <View style={[styles.tlDotOrigin, { borderColor: colors.primary }]} />
        <View style={[styles.tlConnector, { backgroundColor: colors.border }]} />
        <View style={[styles.tlDotDest, { backgroundColor: colors.accent }]} />
      </View>

      {/* Addresses */}
      <View style={styles.routeAddresses}>
        <View>
          <Text style={[styles.addrLabel, { color: colors.mutedForeground }]}>ORIGEN</Text>
          <Text style={[styles.addrText, { color: colors.foreground }]} numberOfLines={2}>
            {pickupAddress}
          </Text>
        </View>
        <View style={styles.addrSpacer} />
        <View>
          <Text style={[styles.addrLabel, { color: colors.mutedForeground }]}>DESTINO</Text>
          <Text style={[styles.addrText, { color: colors.foreground }]} numberOfLines={2}>
            {destinationAddress}
          </Text>
        </View>
      </View>
    </View>
  );
}

function StatChip({
  icon, value, label, chipBg, chipBorder, valueColor, labelColor,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  value: string;
  label: string;
  chipBg: string;
  chipBorder: string;
  valueColor: string;
  labelColor: string;
}) {
  return (
    <View style={[styles.statChip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
      <MaterialIcons name={icon} size={15} color={valueColor} />
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },

  /* Availability card */
  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  availLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  availTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  availSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 130,
    justifyContent: 'center',
  },
  toggleBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  /* Incoming trip notification card */
  notifCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  notifDot: { width: 8, height: 8, borderRadius: 4 },
  notifHeaderText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },

  /* Passenger row */
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  passengerInfo: { flex: 1 },
  passengerName: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  verifiedText: { fontFamily: 'Inter_400Regular', fontSize: 12 },

  /* Divider */
  divider: { height: 1, marginHorizontal: 20 },

  /* Route timeline */
  routeWrap: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  timeline: { width: 16, alignItems: 'center', paddingTop: 3 },
  tlDotOrigin: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  tlConnector: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  tlDotDest: { width: 13, height: 13, borderRadius: 7 },
  routeAddresses: { flex: 1, gap: 0 },
  addrSpacer: { height: 18 },
  addrLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  addrText: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },

  /* Action buttons */
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  rejectBtn: {
    flex: 1,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  rejectBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  acceptBtn: {
    flex: 1,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
  },
  acceptBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 },

  /* Active trip card */
  activeCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  activeBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  /* Full-width action button (active trip) */
  fullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    height: 54,
    borderRadius: 14,
  },
  fullBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 },

  /* Empty state */
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, textAlign: 'center' },
  emptySub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* Shared */
  opDisabled: { opacity: 0.55 },
});
