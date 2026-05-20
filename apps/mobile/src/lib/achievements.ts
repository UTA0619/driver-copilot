import type { Achievement, AchievementKey } from '@drivercopilot/types';

export const ACHIEVEMENTS: Record<AchievementKey, Achievement> = {
  first_delivery: {
    key: 'first_delivery',
    title: 'First Delivery',
    description: 'Log your first delivery',
    icon: '🚀',
    xpReward: 50,
  },
  first_analysis: {
    key: 'first_analysis',
    title: 'Copilot Activated',
    description: 'Analyze your first offer',
    icon: '🤖',
    xpReward: 25,
  },
  ten_deliveries: {
    key: 'ten_deliveries',
    title: 'Getting Started',
    description: 'Complete 10 deliveries',
    icon: '⭐',
    xpReward: 100,
  },
  fifty_deliveries: {
    key: 'fifty_deliveries',
    title: 'Road Warrior',
    description: 'Complete 50 deliveries',
    icon: '🏆',
    xpReward: 300,
  },
  first_hundred_day: {
    key: 'first_hundred_day',
    title: 'Century Club',
    description: 'Earn $100+ in a single day',
    icon: '💯',
    xpReward: 200,
  },
  seven_day_streak: {
    key: 'seven_day_streak',
    title: 'On Fire',
    description: '7-day delivery streak',
    icon: '🔥',
    xpReward: 150,
  },
  thirty_day_streak: {
    key: 'thirty_day_streak',
    title: 'Unstoppable',
    description: '30-day delivery streak',
    icon: '⚡',
    xpReward: 500,
  },
  first_accept: {
    key: 'first_accept',
    title: 'Smart Picker',
    description: 'Accept an AI-recommended offer',
    icon: '🎯',
    xpReward: 30,
  },
  rate_chaser: {
    key: 'rate_chaser',
    title: 'Rate Chaser',
    description: 'Score an offer at $25+/hr',
    icon: '💨',
    xpReward: 75,
  },
  consistent_earner: {
    key: 'consistent_earner',
    title: 'Consistent Earner',
    description: 'Hit your daily goal 3 days in a row',
    icon: '📈',
    xpReward: 120,
  },
  early_bird: {
    key: 'early_bird',
    title: 'Early Bird',
    description: 'Log a delivery before 8am',
    icon: '🌅',
    xpReward: 40,
  },
  night_owl: {
    key: 'night_owl',
    title: 'Night Owl',
    description: 'Log a delivery after 10pm',
    icon: '🦉',
    xpReward: 40,
  },
  platform_explorer: {
    key: 'platform_explorer',
    title: 'Platform Explorer',
    description: 'Use all 4 delivery platforms',
    icon: '🗺️',
    xpReward: 80,
  },
};

export function getLevelTitle(level: number): string {
  if (level >= 20) return 'Legendary Driver';
  if (level >= 15) return 'Elite Earner';
  if (level >= 10) return 'Pro Driver';
  if (level >= 7) return 'Experienced';
  if (level >= 4) return 'Rising Star';
  if (level >= 2) return 'Getting Started';
  return 'Rookie';
}

export function xpForNextLevel(level: number): number {
  return Math.pow(level, 2) * 50;
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 50;
}
