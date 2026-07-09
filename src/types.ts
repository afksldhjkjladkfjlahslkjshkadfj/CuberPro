import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  streak: number;
  longestStreak: number;
  lastActive: string | Timestamp;
  currentGoal: string;
  accuracyRate: number;
  totalReviews: number;
  badges: string[];
  createdAt: string | Timestamp;
  learningQueue?: string[];
  dailyAlgState?: {
    caseId: string;
    assignedDate: string;
  };
}

export interface UserProgressDoc {
  id?: string;
  userId: string;
  caseId: string;
  puzzle: string;
  subset: string;
  status: 'unlearned' | 'learning' | 'mastered';
  preferredAlg?: string;
  notes?: string;
  isFavorite?: boolean;
  interval: number; // in days
  easeFactor: number; // SM-2 ease factor
  repetitions: number; // number of consecutive passes
  lastReviewed?: string | Timestamp;
  nextReview?: string | Timestamp;
  updatedAt: string | Timestamp;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'streak' | 'count' | 'mastery';
  conditionValue: number;
}

export const BADGES: AchievementBadge[] = [
  { id: 'streak-7', title: '7 Day Streak', description: 'Maintain active review streak for 7 consecutive days', iconName: 'Flame', category: 'streak', conditionValue: 7 },
  { id: 'streak-30', title: '30 Day Streak', description: 'Maintain active review streak for 30 consecutive days', iconName: 'Award', category: 'streak', conditionValue: 30 },
  { id: 'review-50', title: 'First Fifty', description: 'Complete 50 total algorithm reviews', iconName: 'CheckCircle', category: 'count', conditionValue: 50 },
  { id: 'review-500', title: 'Algorithm Knight', description: 'Complete 500 total algorithm reviews', iconName: 'Shield', category: 'count', conditionValue: 500 },
  { id: 'mastery-pll', title: 'PLL Grandmaster', description: 'Master all 21 Case Algorithms in the PLL subset', iconName: 'Zap', category: 'mastery', conditionValue: 21 },
  { id: 'mastery-oll', title: 'OLL Master', description: 'Master at least 30 OLL cases', iconName: 'Compass', category: 'mastery', conditionValue: 30 }
];
