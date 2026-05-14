import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function OffersScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Driver Copilot</Text>
        <Text style={styles.subtitle}>Ready to analyze your next offer?</Text>
      </View>

      {/* Primary CTA — large, thumb-friendly */}
      <TouchableOpacity style={styles.analyzeButton} activeOpacity={0.85}>
        <Ionicons name="flash" size={32} color="#fff" />
        <Text style={styles.analyzeButtonText}>Analyze Offer</Text>
        <Text style={styles.analyzeButtonSub}>Tap to scan a screenshot</Text>
      </TouchableOpacity>

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Recent recommendations will appear here
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 24,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 4,
  },
  analyzeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  analyzeButtonSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
  },
});
