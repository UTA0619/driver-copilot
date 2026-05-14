import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function CoachingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Coaching</Text>
        <Text style={styles.subtitle}>Personalized insights to earn more</Text>
      </View>

      <View style={styles.emptyCard}>
        <Ionicons name="bulb-outline" size={48} color="#334155" />
        <Text style={styles.emptyTitle}>No insights yet</Text>
        <Text style={styles.emptyText}>
          Log at least 5 deliveries to unlock your first weekly coaching insight.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 24 },
  header: { marginTop: 24, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 15, color: '#94a3b8', marginTop: 4 },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#64748b' },
  emptyText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
});
