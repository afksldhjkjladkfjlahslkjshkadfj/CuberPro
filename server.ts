import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const currentFilename = typeof import.meta !== 'undefined' && import.meta.url
  ? fileURLToPath(import.meta.url)
  : (typeof __filename !== 'undefined' ? __filename : '');
const currentDirname = typeof import.meta !== 'undefined' && import.meta.url
  ? path.dirname(currentFilename)
  : (typeof __dirname !== 'undefined' ? __dirname : path.resolve());

// Import the algorithm library (since we need it server-side too)
import { ALGORITHM_LIBRARY } from './src/data/algorithms.ts';

// Initialize Firebase Admin for server-side operations (bypasses security rules securely)
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId
  });
}
const db = getFirestore(firebaseConfig.firestoreDatabaseId);

const app = express();
app.use(express.json());

const PORT = 3000;

// Date-based deterministic hash function for the "Daily Algorithm"
function getDailyAlgorithm() {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ALGORITHM_LIBRARY.length;
  return ALGORITHM_LIBRARY[index];
}

// --- WIDGET & GLOBAL API ENDPOINTS ---

// GET /api/daily-algorithm - Returns the daily challenge algorithm
app.get('/api/daily-algorithm', async (req, res) => {
  const { userId } = req.query;
  try {
    let daily = getDailyAlgorithm();
    if (userId && typeof userId === 'string') {
      const userDocRef = db.collection('users').doc(userId);
      const userDocSnap = await userDocRef.get();
      if (userDocSnap.exists) {
        const userData = userDocSnap.data();
        if (userData && userData.dailyAlgState?.caseId) {
          const found = ALGORITHM_LIBRARY.find(a => a.id === userData.dailyAlgState.caseId);
          if (found) {
            daily = found;
          }
        }
      }
    }
    res.json({ success: true, daily });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/widget - Dedicated API for iOS Scriptable Widget
app.get('/api/widget', async (req, res) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required query parameter: userId' 
    });
  }

  try {
    const userDocRef = db.collection('users').doc(userId);
    const userDocSnap = await userDocRef.get();

    let streak = 0;
    let longestStreak = 0;
    let displayName = 'Cuber';
    let currentGoal = 'PLL';
    let progressPercentage = 0;

    if (userDocSnap.exists) {
      const userData = userDocSnap.data();
      if (userData) {
        streak = userData.streak || 0;
        longestStreak = userData.longestStreak || 0;
        displayName = userData.displayName || 'Cuber';
        currentGoal = userData.currentGoal || 'PLL';
      }
    }

    // Retrieve user progress to count due reviews and compute subset percentages
    const progressSnap = await db.collection('user_progress')
      .where('userId', '==', userId)
      .get();

    let masteredCount = 0;
    let dueReviewsCount = 0;
    const now = new Date();

    progressSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === 'mastered') {
        masteredCount++;
      }
      
      if (data.status === 'learning' && data.nextReview) {
        const nextReviewDate = data.nextReview.toDate ? data.nextReview.toDate() : new Date(data.nextReview);
        if (nextReviewDate <= now) {
          dueReviewsCount++;
        }
      }
    });

    // Compute progress percentage based on our current goal's library count
    const goalAlgorithms = ALGORITHM_LIBRARY.filter(alg => alg.subset === currentGoal);
    const totalInGoal = goalAlgorithms.length || 1;
    const masteredInGoal = progressSnap.docs.filter(docSnap => {
      const data = docSnap.data();
      return data.subset === currentGoal && data.status === 'mastered';
    }).length;

    progressPercentage = Math.round((masteredInGoal / totalInGoal) * 100);

    let dailyAlg = getDailyAlgorithm();
    if (userDocSnap.exists) {
      const userData = userDocSnap.data();
      if (userData && userData.dailyAlgState?.caseId) {
        const found = ALGORITHM_LIBRARY.find(a => a.id === userData.dailyAlgState.caseId);
        if (found) {
          dailyAlg = found;
        }
      }
    }

    res.json({
      success: true,
      displayName,
      currentGoal,
      streak,
      longestStreak,
      dueReviewsCount,
      progressPercentage,
      todayAlgorithm: {
        id: dailyAlg.id,
        name: dailyAlg.name,
        subset: dailyAlg.subset,
        recommended: dailyAlg.recommended
      }
    });
  } catch (err: any) {
    console.error('Widget API Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/library - Returns the full static library of algorithms
app.get('/api/library', (req, res) => {
  res.json({ success: true, library: ALGORITHM_LIBRARY });
});

// --- VITE MIDDLEWARE SETUP ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CuberPro Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
