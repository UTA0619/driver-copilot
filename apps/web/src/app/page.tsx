import Link from 'next/link';

const FEATURES = [
  {
    icon: '📷',
    title: 'Live Camera Capture',
    desc: 'Point your camera at any offer screen — no screenshots, no app switching. Analysis starts instantly.',
  },
  {
    icon: '🤖',
    title: 'AI Recommendation',
    desc: 'Our AI calculates effective hourly rate, checks distance efficiency, and gives a clear ACCEPT or DECLINE in under 3 seconds.',
  },
  {
    icon: '🎯',
    title: 'Daily Goal Tracking',
    desc: 'Set a daily earnings target. Watch the progress bar fill as you log deliveries. Get motivated to hit your goal.',
  },
  {
    icon: '🔥',
    title: 'Streak & XP System',
    desc: 'Build daily streaks, earn XP, level up from Rookie to Legendary Driver. Unlock 13 achievement badges.',
  },
  {
    icon: '📍',
    title: 'Zone Heatmap',
    desc: 'See which neighborhoods pay the most at breakfast, lunch, dinner, and late night. Position yourself strategically.',
  },
  {
    icon: '📊',
    title: 'Earnings Dashboard',
    desc: 'Track every delivery. Built-in timer, platform breakdown, hourly rate trends — all in one place.',
  },
];

const PLATFORMS = [
  { name: 'Uber Eats', color: '#16a34a' },
  { name: 'DoorDash', color: '#dc2626' },
  { name: 'Grubhub', color: '#ea580c' },
  { name: 'Instacart', color: '#22c55e' },
];

const STEPS = [
  { num: '1', title: 'Open Driver Copilot', desc: 'Launch the app and see your daily goal progress at a glance.' },
  { num: '2', title: 'Scan the Offer', desc: 'Tap "Scan Offer" and point your camera at the offer screen in your delivery app.' },
  { num: '3', title: 'Get Your Answer', desc: 'In under 3 seconds: ACCEPT, DECLINE, or CONSIDER — with the exact hourly rate.' },
  { num: '4', title: 'Log & Level Up', desc: 'Log the delivery to track earnings, maintain your streak, and unlock achievements.' },
];

const TESTIMONIALS = [
  {
    name: 'Marcus T.',
    platform: 'DoorDash',
    text: 'My hourly rate went from $14/hr to $22/hr in two weeks. I stopped taking bad orders completely.',
    stars: 5,
  },
  {
    name: 'Priya R.',
    platform: 'Uber Eats',
    text: 'The camera scan is a game changer. I used to screenshot and switch apps — now I just point and go.',
    stars: 5,
  },
  {
    name: 'James K.',
    platform: 'Grubhub',
    text: 'Finally hit my $200 goal on a Saturday. The heatmap showed me exactly where to be for the dinner rush.',
    stars: 5,
  },
];

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#f8fafc' }}>Driver Copilot</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="#features" style={{ color: '#64748b', fontSize: 14 }}>Features</Link>
          <Link href="#how-it-works" style={{ color: '#64748b', fontSize: 14 }}>How It Works</Link>
          <Link href="#download" style={{
            background: '#3b82f6', color: '#fff',
            borderRadius: 20, padding: '8px 18px', fontSize: 14, fontWeight: 700,
          }}>Download</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: '80px 24px 60px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 70%)',
        maxWidth: 800, margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#1e293b', borderRadius: 20, padding: '6px 16px',
          fontSize: 13, color: '#94a3b8', marginBottom: 24, border: '1px solid #334155',
        }}>
          <span>🚀</span> Now available on iOS & Android
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900,
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 20,
        }}>
          Stop Guessing.<br />
          <span style={{ color: '#3b82f6' }}>Start Earning Smarter.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)', color: '#94a3b8',
          lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px',
        }}>
          AI-powered offer analysis for delivery drivers. Know in under 3 seconds
          whether to ACCEPT or DECLINE — with the exact hourly rate.
        </p>

        {/* Download buttons */}
        <div id="download" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://apps.apple.com/app/driver-copilot/id000000000"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#f8fafc', color: '#0f172a',
              borderRadius: 14, padding: '14px 24px',
              fontWeight: 700, fontSize: 15,
              transition: 'transform 0.15s',
            }}
            aria-label="Download on the App Store"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1 }}>Download on the</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>App Store</div>
            </div>
          </a>

          <a
            href="https://play.google.com/store/apps/details?id=com.drivercopilot.app"
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#1e293b', color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: 14, padding: '14px 24px',
              fontWeight: 700, fontSize: 15,
            }}
            aria-label="Get it on Google Play"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 20.5v-17c0-.83 1-.83 1.5-.5l15 8.5-15 8.5c-.5.33-1.5.33-1.5-.5z" opacity="0.2"/>
              <path d="M5.5 3.21V20.8l6.6-6.6-6.6-10.99zM18.24 12L14 9.65l-1.9 1.9 1.9 1.9L18.24 12zM5.5 3.21l8.74 4.91-1.9 1.9-6.84-6.81zM5.5 20.8l6.84-6.82 1.9 1.9L5.5 20.8z" fill="#34a853"/>
            </svg>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1 }}>Get it on</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Google Play</div>
            </div>
          </a>
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: '#475569' }}>
          Free to start · iOS 16+ · Android 8+
        </p>

        {/* Mock phone mockup */}
        <div style={{
          marginTop: 56, display: 'inline-block',
          background: '#1e293b', border: '2px solid #334155',
          borderRadius: 36, padding: '12px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            background: '#0f172a', borderRadius: 26, padding: '20px 16px',
            width: 260, textAlign: 'left',
          }}>
            {/* Mock screen content */}
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Good morning! ☀️</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc', marginBottom: 12 }}>Driver Copilot</div>

            {/* Goal bar */}
            <div style={{ background: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 8, border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#f8fafc', fontWeight: 700 }}>🎯 Daily Goal</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc' }}>$74<span style={{ fontSize: 11, color: '#475569' }}>/$100</span></span>
              </div>
              <div style={{ height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '74%', background: '#f59e0b', borderRadius: 3 }} />
              </div>
            </div>

            {/* Scan button */}
            <div style={{
              background: '#3b82f6', borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
            }}>
              <span style={{ fontSize: 22 }}>📷</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Scan Offer</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Point camera at offer</div>
              </div>
            </div>

            {/* Recent result */}
            <div style={{
              background: '#052e16', border: '1px solid #22c55e', borderRadius: 12, padding: 10,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#22c55e' }}>ACCEPT</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>$8.50 · $26/hr · Uber Eats</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform badges ── */}
      <section style={{ padding: '20px 24px 48px', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: 13, marginBottom: 16 }}>Works with all major platforms</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <span key={p.name} style={{
              background: '#1e293b', border: `1px solid ${p.color}44`,
              color: p.color, borderRadius: 20, padding: '6px 16px',
              fontSize: 13, fontWeight: 700,
            }}>
              {p.name}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, marginBottom: 8 }}>
          Everything you need to earn more
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 48 }}>Built by drivers, for drivers.</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <span style={{ fontSize: 32 }}>{f.icon}</span>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{
        padding: '60px 24px',
        background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.05), transparent)',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, marginBottom: 8 }}>
            From offer to answer in 3 seconds
          </h2>
          <p style={{ color: '#64748b', marginBottom: 48 }}>No more mental math at red lights.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map((s) => (
              <div key={s.num} style={{
                display: 'flex', gap: 20, alignItems: 'flex-start',
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: 16, padding: '20px 24px', textAlign: 'left',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: '#3b82f6', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 18, flexShrink: 0,
                }}>
                  {s.num}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ padding: '60px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, marginBottom: 40 }}>
          Drivers love it
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: 20, padding: 24,
            }}>
              <div style={{ color: '#f59e0b', fontSize: 16, marginBottom: 12 }}>
                {'★'.repeat(t.stars)}
              </div>
              <p style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 16 }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{t.name}</span>
                <span style={{ fontSize: 12, color: '#475569' }}>{t.platform} Driver</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding: '60px 24px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, marginBottom: 8 }}>Simple pricing</h2>
        <p style={{ color: '#64748b', marginBottom: 40 }}>Start free. Upgrade when you&apos;re ready.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {/* Free */}
          <div style={{
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 24, padding: 28, textAlign: 'left',
          }}>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Free</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#f8fafc', marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>Always free</div>
            {['10 offer analyses/month', 'Earnings tracking', 'Daily goal', 'Streak system'].map(f => (
              <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#22c55e' }}>✓</span>
                <span style={{ fontSize: 14, color: '#94a3b8' }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Pro */}
          <div style={{
            background: '#1c1000', border: '2px solid #f59e0b',
            borderRadius: 24, padding: 28, textAlign: 'left', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 16, right: 16,
              background: '#f59e0b', color: '#0f172a',
              borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 800,
            }}>
              MOST POPULAR
            </div>
            <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Pro</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#f8fafc', marginBottom: 4 }}>$6.99<span style={{ fontSize: 16, color: '#64748b' }}>/mo</span></div>
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>7-day free trial · Cancel anytime</div>
            {['Unlimited analyses', 'Full zone heatmap', 'AI coaching insights', 'Push notifications', 'Priority support'].map(f => (
              <div key={f} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#f59e0b' }}>✓</span>
                <span style={{ fontSize: 14, color: '#e2e8f0' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: '60px 24px 80px', textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)',
      }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, marginBottom: 12 }}>
          Ready to earn smarter?
        </h2>
        <p style={{ color: '#64748b', marginBottom: 32, fontSize: 17 }}>
          Join thousands of drivers who stopped leaving money on the table.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://apps.apple.com/app/driver-copilot/id000000000" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#f8fafc', color: '#0f172a',
            borderRadius: 14, padding: '14px 28px', fontWeight: 800, fontSize: 15,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            App Store
          </a>
          <a href="https://play.google.com/store/apps/details?id=com.drivercopilot.app" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#1e293b', color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: 14, padding: '14px 28px', fontWeight: 800, fontSize: 15,
          }}>
            Google Play
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid #1e293b', padding: '28px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>Driver Copilot</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/privacy" style={{ fontSize: 13, color: '#475569' }}>Privacy Policy</Link>
          <Link href="/support" style={{ fontSize: 13, color: '#475569' }}>Support</Link>
          <span style={{ fontSize: 13, color: '#334155' }}>© 2026 Driver Copilot</span>
        </div>
      </footer>
    </main>
  );
}
