export default function SupportPage() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px' }}>
      <a href="/" style={{ color: '#3b82f6', fontSize: 14, display: 'block', marginBottom: 32 }}>← Back to Home</a>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Support</h1>
      <p style={{ color: '#64748b', marginBottom: 40 }}>We&apos;re here to help.</p>

      {[
        {
          q: 'Why does the camera capture require a development build?',
          a: 'The live camera feature uses expo-camera, a native module that cannot run in Expo Go. To use it, you need to install the app via TestFlight (iOS) or an APK link (Android) from the App Store links above.',
        },
        {
          q: 'Is my offer screenshot saved anywhere?',
          a: 'No. Screenshots are sent to our AI for processing and immediately discarded. We only store the extracted numbers (payout, distance, estimated time) — never the image itself.',
        },
        {
          q: 'How accurate is the AI recommendation?',
          a: 'Our AI uses GPT-4o Vision to extract offer details and applies a rules-based decision engine (ACCEPT ≥ $18/hr, DECLINE < $12/hr). Accuracy depends on screenshot quality. Ensure the offer details are clearly visible.',
        },
        {
          q: 'How do I cancel my Pro subscription?',
          a: 'On iOS: Go to Settings → Apple ID → Subscriptions → Driver Copilot → Cancel. On Android: Go to Google Play → Subscriptions → Driver Copilot → Cancel.',
        },
        {
          q: 'I found a bug or have a feature request.',
          a: 'Please email support@drivercopilot.app with your device model, OS version, and a description of the issue. We typically respond within 24 hours.',
        },
      ].map(item => (
        <div key={item.q} style={{
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: 16, padding: 24, marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>{item.q}</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: 14 }}>{item.a}</p>
        </div>
      ))}

      <div style={{
        background: '#172554', border: '1px solid #3b82f6',
        borderRadius: 16, padding: 24, marginTop: 32, textAlign: 'center',
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>Still need help?</p>
        <a href="mailto:support@drivercopilot.app" style={{
          color: '#3b82f6', fontSize: 15, fontWeight: 600,
        }}>support@drivercopilot.app</a>
      </div>
    </main>
  );
}
