import { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  FirebaseUser,
  handleFirestoreError,
  OperationType
} from './lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { LearningQueue } from './components/LearningQueue';
import { AlgLibrary } from './components/AlgLibrary';
import { PracticeModes } from './components/PracticeModes';
import { StatsDashboard } from './components/StatsDashboard';
import { Settings } from './components/Settings';
import { Roadmap } from './components/Roadmap';
import { SrsActiveReview } from './components/SrsActiveReview';
import { LoginModal } from './components/LoginModal';
import { ALGORITHM_LIBRARY, AlgorithmCase } from './data/algorithms';
import { UserProfile, UserProgressDoc } from './types';
import { calculateSM2, parseFirestoreDate } from './utils/srs';

export default function App() {
  const [currentView, setView] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userProgress, setUserProgress] = useState<{ [key: string]: UserProgressDoc }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setLoginModalOpen] = useState<boolean>(false);

  // Active recall review session modal state
  const [activeReviewDeck, setActiveReviewDeck] = useState<{ alg: AlgorithmCase; progress: UserProgressDoc | null }[] | null>(null);

  // Dynamically compute queue ids where status is 'learning' in userProgress
  const dynamicLearningQueue = useMemo(() => {
    const learningIds = Object.keys(userProgress).filter(
      id => userProgress[id]?.status === 'learning'
    );
    const profileQueue = userProfile?.learningQueue || [];
    const validProfileIds = profileQueue.filter(id => learningIds.includes(id));
    const newIds = learningIds.filter(id => !profileQueue.includes(id));
    return [...validProfileIds, ...newIds];
  }, [userProfile?.learningQueue, userProgress]);

  // Sync dynamicLearningQueue to userProfile.learningQueue
  useEffect(() => {
    if (!userProfile) return;
    const currentQueue = userProfile.learningQueue || [];
    const queueKey = JSON.stringify(dynamicLearningQueue);
    
    if (JSON.stringify(currentQueue) !== queueKey) {
      setUserProfile(prev => {
        if (!prev) return null;
        const nextProfile = { ...prev, learningQueue: dynamicLearningQueue };
        if (!currentUser) {
          localStorage.setItem('guest_user_profile', JSON.stringify(nextProfile));
        }
        return nextProfile;
      });

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        updateDoc(userRef, { learningQueue: dynamicLearningQueue }).catch(err => {
          console.error('Failed to sync learningQueue to Firestore:', err);
        });
      }
    }
  }, [dynamicLearningQueue, currentUser, userProfile]);

  // Sync dailyAlgState to point to the active learning queue if valid
  useEffect(() => {
    if (!userProfile) return;
    
    const todayStr = getLocalDateString();
    const currentDailyId = userProfile.dailyAlgState?.caseId;
    
    if (dynamicLearningQueue.length > 0) {
      // If daily alg is not in the active queue, or is empty, or has been mastered, assign the top of the queue
      const isCurrentInQueue = currentDailyId && dynamicLearningQueue.includes(currentDailyId);
      const isCurrentMastered = currentDailyId && userProgress[currentDailyId]?.status === 'mastered';
      
      if (!isCurrentInQueue || isCurrentMastered) {
        const nextCaseId = dynamicLearningQueue[0];
        
        setUserProfile(prev => {
          if (!prev) return null;
          const nextProfile = {
            ...prev,
            dailyAlgState: {
              caseId: nextCaseId,
              assignedDate: todayStr
            }
          };
          if (!currentUser) {
            localStorage.setItem('guest_user_profile', JSON.stringify(nextProfile));
          }
          return nextProfile;
        });

        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          updateDoc(userRef, {
            dailyAlgState: {
              caseId: nextCaseId,
              assignedDate: todayStr
            }
          }).catch(err => {
            console.error('Failed to sync new daily algorithm to Firestore:', err);
          });
        }
      }
    }
  }, [dynamicLearningQueue, userProfile, userProgress, currentUser]);

  // Helper to get local date string YYYY-MM-DD
  const getLocalDateString = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  };

  // Seed deterministic Daily Algorithm on startup as fallback
  const getDailyAlgorithmDefault = (): AlgorithmCase => {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % ALGORITHM_LIBRARY.length;
    return ALGORITHM_LIBRARY[index];
  };

  const dailyAlgorithm = userProfile?.dailyAlgState?.caseId
    ? (ALGORITHM_LIBRARY.find(a => a.id === userProfile.dailyAlgState?.caseId) || getDailyAlgorithmDefault())
    : getDailyAlgorithmDefault();

  // Transition daily algorithm on date change or if unassigned
  const transitionDailyAlgorithmIfNeeded = (
    profile: UserProfile, 
    progress: { [key: string]: UserProgressDoc }
  ): { nextProfile: UserProfile; nextProgress: { [key: string]: UserProgressDoc } } | null => {
    const todayStr = getLocalDateString();
    const dailyState = profile.dailyAlgState;
    const learningIds = Object.keys(progress).filter(id => progress[id]?.status === 'learning');
    const profileQueue = profile.learningQueue || [];
    const validProfileIds = profileQueue.filter(id => learningIds.includes(id));
    const newIds = learningIds.filter(id => !profileQueue.includes(id));
    const queue = [...validProfileIds, ...newIds];

    // If there is no daily alg assigned yet, assign the top of the queue or fallback
    if (!dailyState) {
      let initialCaseId = '';
      if (queue.length > 0) {
        initialCaseId = queue[0];
      } else {
        // Find first unlearned case in currentGoal, or just first case in ALGORITHM_LIBRARY
        const unlearnedInGoal = ALGORITHM_LIBRARY.find(
          a => a.subset === profile.currentGoal && (!progress[a.id] || progress[a.id].status === 'unlearned')
        );
        initialCaseId = unlearnedInGoal ? unlearnedInGoal.id : ALGORITHM_LIBRARY[0].id;
      }

      const nextProfile: UserProfile = {
        ...profile,
        dailyAlgState: {
          caseId: initialCaseId,
          assignedDate: todayStr
        }
      };
      return { nextProfile, nextProgress: progress };
    }

    // Same day: no transition needed
    if (dailyState.assignedDate === todayStr) {
      return null;
    }

    // New day! Let's evaluate if the previous daily algorithm was learned (mastered)
    const prevCaseId = dailyState.caseId;
    const wasLearned = progress[prevCaseId]?.status === 'mastered';

    let nextStreak = profile.streak;
    let nextLongestStreak = profile.longestStreak;
    let nextCaseId = prevCaseId;
    let nextQueue = [...queue];

    if (wasLearned) {
      // 1. User gets a streak increment!
      nextStreak = nextStreak + 1;
      if (nextStreak > nextLongestStreak) {
        nextLongestStreak = nextStreak;
      }

      // 2. Remove the mastered case from the queue
      nextQueue = nextQueue.filter(id => id !== prevCaseId);

      // 3. Pull the next algorithm from the top of the queue
      if (nextQueue.length > 0) {
        nextCaseId = nextQueue[0];
      } else {
        // Fallback to next unlearned case in goal or library
        const unlearnedInGoal = ALGORITHM_LIBRARY.find(
          a => a.subset === profile.currentGoal && (!progress[a.id] || progress[a.id].status === 'unlearned')
        );
        nextCaseId = unlearnedInGoal ? unlearnedInGoal.id : ALGORITHM_LIBRARY[0].id;
      }
    } else {
      // They didn't learn it on time: streak is lost, case stays the same
      nextStreak = 0;
    }

    const nextProfile: UserProfile = {
      ...profile,
      streak: nextStreak,
      longestStreak: nextLongestStreak,
      learningQueue: nextQueue,
      dailyAlgState: {
        caseId: nextCaseId,
        assignedDate: todayStr
      }
    };

    return { nextProfile, nextProgress: progress };
  };

  const [hasCheckedTransition, setHasCheckedTransition] = useState<boolean>(false);

  useEffect(() => {
    setHasCheckedTransition(false);
  }, [currentUser]);

  useEffect(() => {
    if (loading || !userProfile || hasCheckedTransition) return;

    setHasCheckedTransition(true);
    const result = transitionDailyAlgorithmIfNeeded(userProfile, userProgress);
    if (result) {
      const { nextProfile } = result;
      setUserProfile(nextProfile);
      if (!currentUser) {
        localStorage.setItem('guest_user_profile', JSON.stringify(nextProfile));
      }
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        updateDoc(userRef, {
          streak: nextProfile.streak,
          longestStreak: nextProfile.longestStreak,
          learningQueue: nextProfile.learningQueue || [],
          dailyAlgState: nextProfile.dailyAlgState
        }).catch(err => {
          console.error('Failed to sync transitioned profile:', err);
        });
      }
    }
  }, [loading, userProfile, hasCheckedTransition, userProgress]);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Authenticated: initialize or load profile
        await syncUserProfile(user);
      } else {
        // Logged out: fallback to guest progress & profile from localStorage
        const savedProfile = localStorage.getItem('guest_user_profile');
        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile);
            parsed.uid = 'guest'; // Safely force local guest profile to have guest uid!
            setUserProfile(parsed);
          } catch (e) {
            console.error('Failed to parse guest user profile:', e);
            setUserProfile({
              uid: 'guest',
              displayName: 'Guest Cuber',
              email: '',
              streak: 0,
              longestStreak: 0,
              lastActive: new Date().toISOString() as any,
              currentGoal: 'ZBLL',
              accuracyRate: 100,
              totalReviews: 0,
              badges: [],
              createdAt: new Date().toISOString() as any,
              learningQueue: [],
              dailyAlgState: undefined
            });
          }
        } else {
          setUserProfile({
            uid: 'guest',
            displayName: 'Guest Cuber',
            email: '',
            streak: 0,
            longestStreak: 0,
            lastActive: new Date().toISOString() as any,
            currentGoal: 'ZBLL',
            accuracyRate: 100,
            totalReviews: 0,
            badges: [],
            createdAt: new Date().toISOString() as any,
            learningQueue: [],
            dailyAlgState: undefined
          });
        }
        const saved = localStorage.getItem('guest_user_progress');
        if (saved) {
          try {
            setUserProgress(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse guest progress:', e);
            setUserProgress({});
          }
        } else {
          setUserProgress({});
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to User Profile & Progress Live Updates
  useEffect(() => {
    if (!currentUser) return;

    // 1. Live profile listener
    const profileRef = doc(db, 'users', currentUser.uid);
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      }
    }, (err) => {
      console.error('Failed to listen to profile updates:', err);
    });

    // 2. Live progress listener
    const progressRef = collection(db, 'user_progress');
    const progressQuery = query(progressRef, where('userId', '==', currentUser.uid));
    const unsubProgress = onSnapshot(progressQuery, (snapshot) => {
      const progressMap: { [key: string]: UserProgressDoc } = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProgressDoc;
        progressMap[data.caseId] = { ...data, id: docSnap.id };
      });
      setUserProgress(progressMap);
      setLoading(false);
    }, (err) => {
      console.error('Failed to listen to progress updates:', err);
    });

    return () => {
      unsubProfile();
      unsubProgress();
    };
  }, [currentUser]);

  // Sync / Provision first-time user profiles
  const syncUserProfile = async (user: FirebaseUser) => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        const savedGuestName = localStorage.getItem(`guest_display_name_${user.uid}`);
        if (savedGuestName) {
          localStorage.removeItem(`guest_display_name_${user.uid}`);
        }
        const newProfile: UserProfile = {
          uid: user.uid,
          displayName: savedGuestName || user.displayName || 'Speedcuber',
          email: user.email || '',
          streak: 0,
          longestStreak: 0,
          lastActive: serverTimestamp() as any,
          currentGoal: 'PLL',
          accuracyRate: 94,
          totalReviews: 0,
          badges: [],
          createdAt: serverTimestamp() as any
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
      } else {
        const data = docSnap.data() as UserProfile;
        setUserProfile({
          ...data,
          uid: data.uid || user.uid
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleLogin = () => {
    setLoginModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      // Disconnect live snapshot listeners immediately by nullifying currentUser in local state
      setCurrentUser(null);

      // Clean up local storage guest profiles to avoid stale uid values
      const savedProfile = localStorage.getItem('guest_user_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          parsed.uid = 'guest';
          localStorage.setItem('guest_user_profile', JSON.stringify(parsed));
        } catch (e) {}
      }
      
      // Update local state immediately to guest to avoid flashing
      setUserProfile({
        uid: 'guest',
        displayName: 'Guest Cuber',
        email: '',
        streak: 0,
        longestStreak: 0,
        lastActive: new Date().toISOString() as any,
        currentGoal: 'ZBLL',
        accuracyRate: 100,
        totalReviews: 0,
        badges: [],
        createdAt: new Date().toISOString() as any,
        learningQueue: [],
        dailyAlgState: undefined
      });
      setUserProgress({});
      
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Trigger interactive Spaced Repetition queue review
  const handleTriggerReview = () => {
    const dueDeck = ALGORITHM_LIBRARY.map(alg => {
      const progressDoc = userProgress[alg.id] || null;
      return { alg, progress: progressDoc };
    }).filter(item => {
      // Due if status is learning and nextReview is now or in past
      if (!item.progress) return false;
      if (item.progress.status !== 'learning') return false;
      const nextReviewDate = parseFirestoreDate(item.progress.nextReview);
      return nextReviewDate <= new Date();
    });

    if (dueDeck.length === 0) {
      alert('Your review queue is currently empty! Try practicing other modes.');
      return;
    }

    setActiveReviewDeck(dueDeck);
  };

  // Learn Daily Challenge instantly
  const handleTriggerLearnDaily = () => {
    const dailyProgress = userProgress[dailyAlgorithm.id] || null;
    setActiveReviewDeck([{ alg: dailyAlgorithm, progress: dailyProgress }]);
  };

  // Skip daily algorithm (mark as mastered because they already know it, then assign next)
  const handleSkipDailyAlgorithm = async () => {
    // 1. Save progress of current daily algorithm as mastered
    await handleSaveProgress(dailyAlgorithm.id, {
      status: 'mastered',
      puzzle: dailyAlgorithm.puzzle,
      subset: dailyAlgorithm.subset
    });

    // 2. Select next daily algorithm
    const queue = userProfile?.learningQueue || [];
    const remainingQueue = queue.filter(id => id !== dailyAlgorithm.id);
    const currentGoal = userProfile?.currentGoal || 'PLL';
    let nextCaseId = '';

    if (remainingQueue.length > 0) {
      nextCaseId = remainingQueue[0];
    } else {
      const unlearnedInGoal = ALGORITHM_LIBRARY.find(
        a => a.subset === currentGoal && a.id !== dailyAlgorithm.id && userProgress[a.id]?.status !== 'mastered'
      );
      if (unlearnedInGoal) {
        nextCaseId = unlearnedInGoal.id;
      } else {
        const anyUnlearned = ALGORITHM_LIBRARY.find(
          a => a.id !== dailyAlgorithm.id && userProgress[a.id]?.status !== 'mastered'
        );
        nextCaseId = anyUnlearned ? anyUnlearned.id : ALGORITHM_LIBRARY[0].id;
      }
    }

    const todayStr = getLocalDateString();
    await handleSaveProfile({
      dailyAlgState: {
        caseId: nextCaseId,
        assignedDate: todayStr
      }
    });
  };

  // Save/Override multiple general progress adjustments at once
  const handleSaveProgressBulk = async (updates: { caseId: string; updates: Partial<UserProgressDoc> }[]) => {
    if (updates.length === 0) return;

    // Calculate all updated documents locally first based on current userProgress
    const localUpdatesToSave: { [caseId: string]: UserProgressDoc } = {};
    
    updates.forEach(({ caseId, updates: u }) => {
      const currentDoc = userProgress[caseId];
      const defaultNextReview = (u.status === 'learning' || currentDoc?.status === 'learning') && !currentDoc?.nextReview
        ? new Date().toISOString()
        : undefined;

      const updatedDoc: UserProgressDoc = {
        userId: currentUser?.uid || 'guest',
        caseId,
        puzzle: u.puzzle || currentDoc?.puzzle || '3x3',
        subset: u.subset || currentDoc?.subset || 'ZBLL-T',
        status: u.status || currentDoc?.status || 'unlearned',
        preferredAlg: u.preferredAlg !== undefined ? u.preferredAlg : (currentDoc?.preferredAlg || ''),
        notes: u.notes !== undefined ? u.notes : (currentDoc?.notes || ''),
        isFavorite: u.isFavorite !== undefined ? u.isFavorite : (currentDoc?.isFavorite || false),
        interval: u.interval !== undefined ? u.interval : (currentDoc?.interval || 0),
        easeFactor: u.easeFactor !== undefined ? u.easeFactor : (currentDoc?.easeFactor || 2.5),
        repetitions: u.repetitions !== undefined ? u.repetitions : (currentDoc?.repetitions || 0),
        lastReviewed: u.lastReviewed !== undefined ? u.lastReviewed : (currentDoc?.lastReviewed || null as any),
        nextReview: u.nextReview !== undefined ? u.nextReview : (currentDoc?.nextReview || defaultNextReview || null as any),
        updatedAt: new Date().toISOString() as any
      };
      
      localUpdatesToSave[caseId] = updatedDoc;
    });

    // 1. Update progress state
    setUserProgress(prev => {
      const next = { ...prev, ...localUpdatesToSave };
      if (!currentUser) {
        localStorage.setItem('guest_user_progress', JSON.stringify(next));
      }
      return next;
    });

    // 2. Gather and update queue state synchronously to avoid stale state and async update race conditions
    const currentQueue = userProfile?.learningQueue || [];
    let nextQueue = [...currentQueue];
    
    updates.forEach(({ caseId, updates: u }) => {
      const newStatus = u.status;
      if (newStatus === 'learning') {
        if (!nextQueue.includes(caseId)) {
          nextQueue.push(caseId);
        }
      } else if (newStatus === 'mastered' || newStatus === 'unlearned') {
        nextQueue = nextQueue.filter(id => id !== caseId);
      }
    });

    setUserProfile(prev => {
      if (!prev) return null;
      const nextProfile = { ...prev, learningQueue: nextQueue };
      if (!currentUser) {
        localStorage.setItem('guest_user_profile', JSON.stringify(nextProfile));
      }
      return nextProfile;
    });

    if (!currentUser) return;

    // 3. Save to Firestore (Batch update to keep it performant and atomic!)
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, { learningQueue: nextQueue });
    } catch (err) {
      console.error('Failed to update learning queue in Firestore:', err);
    }

    try {
      // Chunk operations to not exceed Firestore batch limit of 500
      const chunkSize = 200;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(({ caseId }) => {
          const updatedDoc = localUpdatesToSave[caseId];
          const currentDoc = userProgress[caseId];
          const progressDocId = currentDoc?.id || `${currentUser.uid}_${caseId}`;
          const progressRef = doc(db, 'user_progress', progressDocId);

          const cleanDocForFirestore = Object.entries(updatedDoc).reduce((acc, [key, val]) => {
            if (key === 'nextReview' || key === 'lastReviewed') {
              if (val === undefined || val === null) {
                acc[key] = null;
              } else {
                acc[key] = parseFirestoreDate(val);
              }
            } else {
              acc[key] = val !== undefined ? val : null;
            }
            return acc;
          }, {} as any);

          batch.set(progressRef, {
            ...cleanDocForFirestore,
            userId: currentUser.uid,
            updatedAt: serverTimestamp()
          }, { merge: true });
        });

        await batch.commit();
      }
    } catch (err) {
      console.error('Failed to commit bulk progress updates in Firestore:', err);
    }
  };

  // Save/Override general progress adjustments
  const handleSaveProgress = async (caseId: string, updates: Partial<UserProgressDoc>) => {
    await handleSaveProgressBulk([{ caseId, updates }]);
  };

  // Update profile metrics (display name, current goal)
  const handleSaveProfile = async (updates: Partial<UserProfile>) => {
    setUserProfile(prev => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      if (!currentUser) {
        localStorage.setItem('guest_user_profile', JSON.stringify(next));
      }
      return next;
    });

    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  // Update learning queue order and list
  const handleUpdateQueue = async (newQueue: string[]) => {
    setUserProfile(prev => {
      if (!prev) return null;
      const next = { ...prev, learningQueue: newQueue };
      if (!currentUser) {
        localStorage.setItem('guest_user_profile', JSON.stringify(next));
      }
      return next;
    });

    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, { learningQueue: newQueue });
    } catch (err) {
      console.error('Failed to update learning queue in Firestore:', err);
    }
  };

  // Submit Spaced-Repetition SM-2 Rating Score
  const handleCompleteReview = async (caseId: string, rating: number) => {
    const progressDoc = userProgress[caseId];
    const prevInterval = progressDoc?.interval || 0;
    const prevEaseFactor = progressDoc?.easeFactor || 2.5;
    const prevRepetitions = progressDoc?.repetitions || 0;

    // Calculate new SM-2 values
    const srsUpdate = calculateSM2(rating, prevInterval, prevEaseFactor, prevRepetitions);

    // Determine new status: if repetitions is high, transition to 'mastered'
    let finalStatus: 'unlearned' | 'learning' | 'mastered' = progressDoc?.status || 'learning';
    if (srsUpdate.repetitions >= 4) {
      finalStatus = 'mastered';
    } else if (rating < 3) {
      finalStatus = 'learning'; // Failed reviews must be learned again
    }

    // Maintain learning queue based on status changes
    const oldStatus = progressDoc?.status || 'unlearned';
    if (oldStatus !== finalStatus) {
      const currentQueue = userProfile?.learningQueue || [];
      let nextQueue = [...currentQueue];
      if (finalStatus === 'learning') {
        if (!nextQueue.includes(caseId)) {
          nextQueue.push(caseId);
        }
      } else {
        nextQueue = nextQueue.filter(id => id !== caseId);
      }
      handleUpdateQueue(nextQueue);
    }

    const updatedDoc: UserProgressDoc = {
      userId: currentUser?.uid || 'guest',
      caseId,
      puzzle: progressDoc?.puzzle || '3x3',
      subset: progressDoc?.subset || 'ZBLL-T',
      status: finalStatus,
      preferredAlg: progressDoc?.preferredAlg || '',
      notes: progressDoc?.notes || '',
      isFavorite: progressDoc?.isFavorite || false,
      interval: srsUpdate.interval,
      easeFactor: srsUpdate.easeFactor,
      repetitions: srsUpdate.repetitions,
      lastReviewed: srsUpdate.lastReviewed as any,
      nextReview: srsUpdate.nextReview as any,
      updatedAt: new Date().toISOString() as any
    };

    // Update local state immediately
    setUserProgress(prev => {
      const next = { ...prev, [caseId]: updatedDoc };
      if (!currentUser) {
        localStorage.setItem('guest_user_progress', JSON.stringify(next));
      }
      return next;
    });

    // Handle stats updates for Guest users locally
    if (!currentUser) {
      if (userProfile) {
        setUserProfile(prev => {
          if (!prev) return null;
          return {
            ...prev,
            totalReviews: prev.totalReviews + 1,
            lastActive: new Date().toISOString() as any,
            streak: prev.streak === 0 ? 1 : prev.streak
          };
        });
      }
      return;
    }

    const progressDocId = progressDoc?.id || `${currentUser.uid}_${caseId}`;
    const progressRef = doc(db, 'user_progress', progressDocId);

    // Prepare updated document using exact same robust clean function to pass Firestore rules
    const targetAlg = ALGORITHM_LIBRARY.find(a => a.id === caseId) || ALGORITHM_LIBRARY[0];
    const dbDoc: UserProgressDoc = {
      userId: currentUser.uid,
      caseId,
      puzzle: progressDoc?.puzzle || targetAlg.puzzle,
      subset: progressDoc?.subset || targetAlg.subset,
      status: finalStatus,
      preferredAlg: progressDoc?.preferredAlg || '',
      notes: progressDoc?.notes || '',
      isFavorite: progressDoc?.isFavorite || false,
      interval: srsUpdate.interval,
      easeFactor: srsUpdate.easeFactor,
      repetitions: srsUpdate.repetitions,
      lastReviewed: srsUpdate.lastReviewed as any,
      nextReview: srsUpdate.nextReview as any,
      updatedAt: new Date().toISOString() as any
    };

    const cleanDocForFirestore = Object.entries(dbDoc).reduce((acc, [key, val]) => {
      if (key === 'nextReview' || key === 'lastReviewed') {
        if (val === undefined || val === null) {
          acc[key] = null;
        } else {
          acc[key] = parseFirestoreDate(val);
        }
      } else {
        acc[key] = val !== undefined ? val : null;
      }
      return acc;
    }, {} as any);

    try {
      await setDoc(progressRef, {
        ...cleanDocForFirestore,
        userId: currentUser.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update global user profile statistics atomically
      const userRef = doc(db, 'users', currentUser.uid);
      const isReviewPassed = rating >= 3;
      
      // Compute updated streak
      let streakIncrement = 0;
      if (userProfile) {
        const lastActiveDate = parseFirestoreDate(userProfile.lastActive);
        const today = new Date();
        const differenceInTime = today.getTime() - lastActiveDate.getTime();
        const differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24));
        
        if (differenceInDays === 1) {
          streakIncrement = 1;
        } else if (differenceInDays > 1 || userProfile.streak === 0) {
          // Restart streak
          await updateDoc(userRef, { streak: 1 });
        }
      }

      await updateDoc(userRef, {
        totalReviews: increment(1),
        lastActive: serverTimestamp(),
        ...(streakIncrement > 0 ? { streak: increment(1) } : {}),
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_progress/${progressDocId}`);
    }
  };

  const getDueCases = () => {
    return ALGORITHM_LIBRARY.map(alg => {
      const progressDoc = userProgress[alg.id] || null;
      return { alg, progress: progressDoc };
    }).filter(item => {
      if (!item.progress) return false;
      if (item.progress.status !== 'learning') return false;
      const nextReviewDate = parseFirestoreDate(item.progress.nextReview);
      return nextReviewDate <= new Date();
    });
  };

  const dueCases = getDueCases();

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-slate-200 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        userProfile={userProfile} 
        onLogout={handleLogout} 
        onLogin={handleLogin} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header bar */}
        <Header 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          userProfile={userProfile} 
          onLogin={handleLogin} 
          setView={setView}
        />

        {/* View Routing */}
        <div className="flex-1 overflow-hidden relative">
          {currentView === 'dashboard' && (
            <Dashboard 
              userProfile={userProfile}
              userProgress={userProgress}
              dailyAlgorithm={dailyAlgorithm}
              dueCases={dueCases}
              onTriggerReview={handleTriggerReview}
              onTriggerLearnDaily={handleTriggerLearnDaily}
              onSkipDailyAlgorithm={handleSkipDailyAlgorithm}
              setView={setView}
              onLoginPrompt={handleLogin}
              onSaveProgress={handleSaveProgress}
            />
          )}

          {currentView === 'queue' && (
            <LearningQueue 
              userProfile={userProfile}
              userProgress={userProgress}
              onUpdateQueue={handleUpdateQueue}
              onSaveProgress={handleSaveProgress}
            />
          )}

          {currentView === 'roadmap' && (
            <Roadmap 
              userProgress={userProgress}
              onSaveProgress={handleSaveProgress}
              onSaveProgressBulk={handleSaveProgressBulk}
              onLoginPrompt={handleLogin}
              isAuthenticated={!!currentUser}
            />
          )}

          {currentView === 'library' && (
            <AlgLibrary 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              userProgress={userProgress}
              onSaveProgress={handleSaveProgress}
              onLoginPrompt={handleLogin}
              isAuthenticated={!!currentUser}
            />
          )}

          {currentView === 'practice' && (
            <PracticeModes 
              userProgress={userProgress}
              onSaveProgress={handleSaveProgress}
              onCompleteReview={handleCompleteReview}
              isAuthenticated={!!currentUser}
              onLoginPrompt={handleLogin}
            />
          )}

          {currentView === 'statistics' && (
            <StatsDashboard 
              userProfile={userProfile}
              userProgressList={Object.values(userProgress)}
            />
          )}

          {currentView === 'settings' && (
            <Settings 
              userProfile={userProfile}
              onSaveProfile={handleSaveProfile}
              onLoginPrompt={handleLogin}
            />
          )}
        </div>
      </main>

      {/* Active Spaced-Repetition Interactive Reviewer overlay */}
      {activeReviewDeck && (
        <SrsActiveReview 
          dueCases={activeReviewDeck}
          onCompleteReview={handleCompleteReview}
          onClose={() => setActiveReviewDeck(null)}
        />
      )}

      {/* Profile connection modal for iframe and social sign in */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
      />

    </div>
  );
}
