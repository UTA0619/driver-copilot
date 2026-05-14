import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Heatmap</Text>
        <Text style={styles.subtitle}>High-value zones near you</Text>
      </View>

      {/* Mapbox map renders here in MAP-001 */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>🗺</Text>
        <Text style={styles.mapPlaceholderLabel}>Map loading in M4</Text>
        <Text style={styles.mapPlaceholderSub}>
          Mapbox integration tracked in{'\n'}issues MAP-001 through MAP-003
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 24, marginTop: 24, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 15, color: '#94a3b8', marginTop: 4 },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#0f1f35',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPlaceholderText: { fontSize: 48 },
  mapPlaceholderLabel: { fontSize: 18, fontWeight: '700', color: '#475569' },
  mapPlaceholderSub: { fontSize: 13, color: '#334155', textAlign: 'center' },
});
