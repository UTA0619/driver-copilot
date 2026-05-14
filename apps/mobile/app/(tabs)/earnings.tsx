import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function EarningsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
      </View>

      {/* Summary cards */}
      <View style={styles.cards}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today</Text>
          <Text style={styles.cardAmount}>—</Text>
          <Text style={styles.cardSub}>No deliveries logged</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This week</Text>
          <Text style={styles.cardAmount}>—</Text>
          <Text style={styles.cardSub}>No deliveries logged</Text>
        </View>
      </View>

      <View style={[styles.card, styles.rateCard]}>
        <Text style={styles.cardLabel}>Effective hourly rate</Text>
        <Text style={styles.rateAmount}>— /hr</Text>
        <Text style={styles.cardSub}>Log deliveries to see your rate</Text>
      </View>

      {/* Log delivery CTA */}
      <TouchableOpacity style={styles.logButton}>
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text style={styles.logButtonText}>Log a delivery</Text>
      </TouchableOpacity>

      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          Your delivery history will appear here
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 24 },
  header: { marginTop: 24, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  cards: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rateCard: { flex: 0, marginBottom: 24 },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardAmount: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  rateAmount: { fontSize: 36, fontWeight: '800', color: '#22c55e' },
  cardSub: { fontSize: 12, color: '#475569', marginTop: 4 },
  logButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#475569', fontSize: 14, textAlign: 'center' },
});
