import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { capture } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';
import { SkeletonCard } from '@/components/SkeletonCard';
import type { ZonePerformance, TimeOfDay } from '@drivercopilot/types';

// Mapbox is loaded lazily so missing token doesn't crash the app on startup
let MapboxGL: typeof import('@rnmapbox/maps') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MapboxGL = require('@rnmapbox/maps');
} catch {
  // Native module not linked — expected in Expo Go; works in development builds
}

const mapboxToken = Constants.expoConfig?.extra?.mapboxToken as string | undefined;

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 6 && h < 11) return 'morning';
  if (h >= 11 && h < 14) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'late_night';
}

function payoutColor(avgPayout: number): string {
  if (avgPayout >= 14) return '#22c55e';  // green — high payout
  if (avgPayout >= 10) return '#f59e0b';  // amber — medium
  return '#ef4444';                        // red — low
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning (6–11am)',
  lunch: 'Lunch (11am–2pm)',
  dinner: 'Dinner (5–10pm)',
  late_night: 'Late Night (10pm+)',
};

export default function MapScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [zones, setZones] = useState<ZonePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());
  const hasCaptured = useRef(false);

  // Request location permission and get current position
  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError(true);
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setLocationError(false);
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { source: 'MapScreen.location' });
      setLocationError(true);
    }
  }, []);

  // Fetch zone performance data for the selected time of day
  const fetchZones = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('zone_performance')
      .select('h3_index, time_of_day, avg_payout, avg_wait_minutes, sample_count, updated_at')
      .eq('time_of_day', timeOfDay)
      .order('avg_payout', { ascending: false })
      .limit(50);

    if (error) {
      captureError(new Error(error.message), { source: 'MapScreen.fetchZones' });
    } else {
      setZones(
        (data ?? []).map((z: Record<string, unknown>) => ({
          h3Index: z.h3_index as string,
          timeOfDay: z.time_of_day as TimeOfDay,
          avgPayout: Number(z.avg_payout ?? 0),
          avgWaitMinutes: Number(z.avg_wait_minutes ?? 0),
          sampleCount: Number(z.sample_count ?? 0),
          updatedAt: z.updated_at as string,
        }))
      );
    }
    setLoading(false);
  }, [user, timeOfDay]);

  useEffect(() => {
    requestLocation();
    fetchZones();
  }, [requestLocation, fetchZones]);

  useEffect(() => {
    if (!hasCaptured.current && !loading) {
      hasCaptured.current = true;
      capture('map_heatmap_viewed', { time_of_day: timeOfDay, zone_count: zones.length });
    }
  }, [loading, zones.length, timeOfDay]);

  // Initialize Mapbox token
  useEffect(() => {
    if (MapboxGL && mapboxToken) {
      MapboxGL.default.setAccessToken(mapboxToken);
    }
  }, []);

  const noMapboxToken = !mapboxToken;
  const noNativeModule = !MapboxGL;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Zone Heatmap</Text>
        <Text style={styles.subtitle}>High-value zones near you</Text>
      </View>

      {/* Time of day selector */}
      <View style={styles.timeRow}>
        {(Object.keys(TIME_LABELS) as TimeOfDay[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.timeChip, timeOfDay === t && styles.timeChipActive]}
            onPress={() => setTimeOfDay(t)}
            accessibilityRole="button"
            accessibilityLabel={TIME_LABELS[t]}
            accessibilityState={{ selected: timeOfDay === t }}
          >
            <Text style={[styles.timeChipText, timeOfDay === t && styles.timeChipTextActive]}>
              {t === 'morning' ? '☀️' : t === 'lunch' ? '🍽' : t === 'dinner' ? '🌙' : '🌃'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map area */}
      <View style={styles.mapContainer}>
        {noNativeModule || noMapboxToken ? (
          // Graceful fallback when Mapbox is not available (Expo Go or missing token)
          <MapFallback
            hasToken={!noMapboxToken}
            hasModule={!noNativeModule}
            locationError={locationError}
            onRetryLocation={requestLocation}
          />
        ) : locationError ? (
          <LocationErrorView onRetry={requestLocation} />
        ) : !location ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#3b82f6" size="large" />
            <Text style={styles.loadingText}>Getting your location…</Text>
          </View>
        ) : (
          <MapboxGL.default.MapView style={styles.map} styleURL={MapboxGL.default.StyleURL.Dark}>
            <MapboxGL.default.Camera
              centerCoordinate={[location.longitude, location.latitude]}
              zoomLevel={12}
              animationDuration={500}
            />
            {/* User location dot */}
            <MapboxGL.default.UserLocation visible />

            {/* Zone circles */}
            {zones.map(zone => (
              <MapboxGL.default.PointAnnotation
                key={zone.h3Index}
                id={zone.h3Index}
                coordinate={[location.longitude + 0, location.latitude + 0]} // h3 → coords would need h3-js
              >
                <View style={[styles.zoneMarker, { backgroundColor: payoutColor(zone.avgPayout) + 'cc' }]}>
                  <Text style={styles.zoneMarkerText}>${zone.avgPayout.toFixed(0)}</Text>
                </View>
              </MapboxGL.default.PointAnnotation>
            ))}
          </MapboxGL.default.MapView>
        )}
      </View>

      {/* Zone list — top zones ranked by avg payout */}
      <View style={styles.zoneListContainer}>
        <Text style={styles.zoneListTitle}>
          Top Zones — {TIME_LABELS[timeOfDay]}
        </Text>
        {loading ? (
          <View style={{ gap: 8 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} height={52} borderRadius={10} />)}
          </View>
        ) : zones.length === 0 ? (
          <Text style={styles.noZonesText}>
            No zone data yet — log deliveries to build your heatmap.
          </Text>
        ) : (
          zones.slice(0, 5).map((zone, i) => (
            <View key={zone.h3Index} style={styles.zoneRow}>
              <Text style={styles.zoneRank}>#{i + 1}</Text>
              <View style={[styles.zoneColorDot, { backgroundColor: payoutColor(zone.avgPayout) }]} />
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneLabel}>{zone.h3Index.slice(0, 8)}…</Text>
                <Text style={styles.zoneMeta}>{zone.sampleCount} deliveries avg</Text>
              </View>
              <Text style={[styles.zoneAvgPayout, { color: payoutColor(zone.avgPayout) }]}>
                ${zone.avgPayout.toFixed(2)} avg
              </Text>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Fallback when Mapbox not available ─────────────────────────

function MapFallback({
  hasToken, hasModule, locationError, onRetryLocation,
}: {
  hasToken: boolean;
  hasModule: boolean;
  locationError: boolean;
  onRetryLocation: () => void;
}) {
  return (
    <View style={styles.fallback}>
      <Ionicons name="map-outline" size={48} color="#334155" />
      {!hasModule ? (
        <>
          <Text style={styles.fallbackTitle}>Map requires a development build</Text>
          <Text style={styles.fallbackText}>
            Run <Text style={styles.code}>eas build --profile development</Text> to enable the interactive map.{'\n\n'}
            Zone rankings below still show your best areas.
          </Text>
        </>
      ) : !hasToken ? (
        <>
          <Text style={styles.fallbackTitle}>Mapbox token not configured</Text>
          <Text style={styles.fallbackText}>
            Add <Text style={styles.code}>EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN</Text> to your .env.local to enable the map.
          </Text>
        </>
      ) : locationError ? (
        <>
          <Text style={styles.fallbackTitle}>Location access needed</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRetryLocation} accessibilityRole="button">
            <Text style={styles.retryBtnText}>Grant Location Access</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

function LocationErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.fallback}>
      <Ionicons name="location-outline" size={48} color="#334155" />
      <Text style={styles.fallbackTitle}>Location access needed</Text>
      <Text style={styles.fallbackText}>
        Driver Copilot uses your location to center the heatmap on your current area.
      </Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.retryBtnText}>Enable Location</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 20, marginTop: 20, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 2 },

  timeRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  timeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  timeChipActive: { borderColor: '#3b82f6', backgroundColor: '#172554' },
  timeChipText: { fontSize: 18 },
  timeChipTextActive: { opacity: 1 },

  mapContainer: { flex: 1, marginHorizontal: 0, backgroundColor: '#0f1f35' },
  map: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#94a3b8', fontSize: 14 },

  zoneMarker: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  zoneMarkerText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  fallbackTitle: { fontSize: 18, fontWeight: '700', color: '#475569', textAlign: 'center' },
  fallbackText: { fontSize: 13, color: '#334155', textAlign: 'center', lineHeight: 20 },
  code: { fontFamily: 'monospace', backgroundColor: '#1e293b', color: '#60a5fa' },
  retryBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  zoneListContainer: { padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b', gap: 8, maxHeight: 220 },
  zoneListTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  noZonesText: { color: '#334155', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  zoneRank: { fontSize: 13, color: '#475569', fontWeight: '700', width: 24 },
  zoneColorDot: { width: 10, height: 10, borderRadius: 5 },
  zoneInfo: { flex: 1 },
  zoneLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  zoneMeta: { fontSize: 11, color: '#475569' },
  zoneAvgPayout: { fontSize: 14, fontWeight: '700' },
});
