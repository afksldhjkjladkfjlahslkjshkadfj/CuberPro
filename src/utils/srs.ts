import { Timestamp } from 'firebase/firestore';

export interface SrsState {
  interval: number; // in days
  easeFactor: number;
  repetitions: number;
  lastReviewed: Date;
  nextReview: Date;
}

/**
 * Calculates updated SuperMemo-2 Spaced Repetition parameters.
 * @param quality User rating from 0 (forgot completely) to 5 (perfect execution)
 * @param prevInterval Previous interval in days
 * @param prevEaseFactor Previous ease factor (default 2.5)
 * @param prevRepetitions Previous consecutive correct reviews count
 * @returns Updated SRS parameter state
 */
export function calculateSM2(
  quality: number,
  prevInterval: number,
  prevEaseFactor: number,
  prevRepetitions: number
): SrsState {
  let interval = 1;
  let repetitions = prevRepetitions;
  let easeFactor = prevEaseFactor;

  // Enforce score constraints
  const q = Math.max(0, Math.min(5, quality));

  if (q >= 3) {
    // Success review
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 4; // Use 4 days instead of 6 for tighter early review of speedcubing moves
    } else {
      interval = Math.round(prevInterval * easeFactor);
    }
    repetitions++;
  } else {
    // Failure review
    repetitions = 0;
    interval = 1; // back to review tomorrow
  }

  // Adjust Ease Factor (SM-2 formula)
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3; // minimum ease factor
  }

  const lastReviewed = new Date();
  const nextReview = new Date();
  nextReview.setDate(lastReviewed.getDate() + interval);

  return {
    interval,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    repetitions,
    lastReviewed,
    nextReview
  };
}

/**
 * Normalizes Firestore dates to Javascript Date objects.
 */
export function parseFirestoreDate(field: any): Date {
  if (!field) return new Date();
  if (typeof field.toDate === 'function') {
    return field.toDate();
  }
  return new Date(field);
}

export interface SpeedCubeDBTarget {
  id: string;
  subset: string;
  puzzle: string;
}

export function getSpeedCubeDBUrl(item: SpeedCubeDBTarget): string {
  if (item.puzzle === 'Megaminx') {
    if (item.subset === 'PLL') {
      const cleanId = item.id.replace('Mega-PLL-', '');
      const letter = cleanId.charAt(0).toUpperCase();
      return `https://www.speedcubedb.com/a/Megaminx/MegaminxPLL${letter}/${cleanId}`;
    } else if (item.subset === 'OLL') {
      const cleanId = item.id.replace('Mega-OLL-', '');
      return `https://www.speedcubedb.com/a/Megaminx/MegaminxOLL/${cleanId}`;
    }
    return 'https://www.speedcubedb.com/a/Megaminx';
  } else if (item.puzzle === '3x3') {
    if (item.subset === 'PLL') {
      const cleanId = item.id.replace('3x3-PLL-', '').replace('-Perm', '');
      return `https://www.speedcubedb.com/a/3x3/PLL/${cleanId}`;
    } else if (item.subset.startsWith('ZBLL-')) {
      const set = item.subset.replace('ZBLL-', '');
      return `https://www.speedcubedb.com/a/3x3/ZBLL/${set}`;
    }
    return 'https://www.speedcubedb.com/a/3x3';
  } else if (item.puzzle === '2x2') {
    const cleanSubset = item.subset.replace('-', '');
    return `https://www.speedcubedb.com/a/2x2/${cleanSubset}`;
  }
  return 'https://www.speedcubedb.com';
}

