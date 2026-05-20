import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Driver Copilot — AI Offer Analyzer for Gig Drivers',
  description:
    'Stop guessing which delivery offers to accept. Driver Copilot uses AI to analyze Uber Eats, DoorDash, Grubhub & Instacart offers in under 3 seconds.',
  keywords: ['delivery driver', 'uber eats', 'doordash', 'offer analyzer', 'gig worker', 'earnings tracker'],
  openGraph: {
    title: 'Driver Copilot — Earn Smarter',
    description: 'AI-powered offer analysis for delivery drivers. ACCEPT or DECLINE in 3 seconds.',
    url: 'https://drivercopilot.app',
    siteName: 'Driver Copilot',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Driver Copilot — AI Offer Analyzer',
    description: 'Stop guessing. Start earning smarter.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
