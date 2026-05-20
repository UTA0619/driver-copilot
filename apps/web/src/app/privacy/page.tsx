export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px' }}>
      <a href="/" style={{ color: '#3b82f6', fontSize: 14, display: 'block', marginBottom: 32 }}>← Back to Home</a>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Last updated: May 20, 2026</p>

      {[
        {
          title: 'What We Collect',
          body: 'Driver Copilot collects: (1) Account information (email address) for authentication. (2) Delivery data you log (payout amount, distance, duration, platform) — this is stored securely and only visible to you. (3) Anonymous analytics events (offer analyzed, recommendation given) to improve the product. We do NOT collect or store offer screenshots. Images are processed in real-time by our AI and immediately discarded.',
        },
        {
          title: 'How We Use Your Data',
          body: 'Your delivery data is used solely to: calculate your earnings summaries, generate personalized coaching insights, and power the zone heatmap. We never sell your data to third parties. We never share individual driver data with delivery platforms.',
        },
        {
          title: 'Data Storage',
          body: 'Your data is stored in Supabase (PostgreSQL) with row-level security — only you can access your own records. Data is encrypted at rest and in transit.',
        },
        {
          title: 'Third-Party Services',
          body: 'We use: Supabase (database & auth), OpenAI (offer image analysis — images are not stored by OpenAI per their API terms), Expo/EAS (app distribution), PostHog (anonymous analytics).',
        },
        {
          title: 'Your Rights',
          body: 'You can delete your account and all associated data at any time from the app settings. You can export your delivery data in CSV format. You can opt out of analytics by contacting support.',
        },
        {
          title: 'Contact',
          body: 'Questions about privacy? Email us at privacy@drivercopilot.app',
        },
      ].map(s => (
        <div key={s.title} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 10 }}>{s.title}</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: 15 }}>{s.body}</p>
        </div>
      ))}
    </main>
  );
}
