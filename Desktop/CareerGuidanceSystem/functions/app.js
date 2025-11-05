const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
try {
  // Allow service account to be provided via environment variable (for platforms like Vercel/Railway)
  let serviceAccount;
  if (process.env.SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
    } catch (e) {
      console.error('❌ Failed to parse SERVICE_ACCOUNT env var:', e.message);
      throw e;
    }
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || "careerguidancesystem-1f1e4",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "careerguidancesystem-1f1e4.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "754744283759",
    appId: process.env.FIREBASE_APP_ID || "1:754744283759:web:0efe8e7728e8a073f4f39a"
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  // Do not exit on platforms where service account will be provided via environment later
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from public directory

// Initialize Firebase services
const db = admin.firestore();
const auth = admin.auth();

// Base routes
app.get('/', (req, res) => {
  res.send(' Career Guidance System API is running!');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    firebase: 'Connected'
  });
});

app.get('/test-db', async (req, res) => {
  try {
    const testRef = db.collection('test');
    await testRef.add({ test: true, timestamp: admin.firestore.Timestamp.now() });
    const snapshot = await testRef.get();
    res.json({
      success: true,
      message: 'Firestore connected successfully!',
      data: snapshot.docs.map(doc => doc.data())
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Firestore connection failed: ' + error.message
    });
  }
});

// Auth middleware
const checkRole = (roles) => async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided'
    });
  }

  try {
    const token = authorization.split(' ')[1];
    const decoded = await auth.verifyIdToken(token);
    if (roles.includes(decoded.role)) {
      req.user = decoded;
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Unauthorized role'
      });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
};

// Auth routes
app.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  
  if (!email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  try {
    const userRecord = await auth.createUser({ email, password });
    await auth.setCustomUserClaims(userRecord.uid, { role });
    
    await db.collection('users').doc(userRecord.uid).set({
      email,
      role,
      profileData: {},
      createdAt: admin.firestore.Timestamp.now()
    });

    await auth.generateEmailVerificationLink(email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      uid: userRecord.uid
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

app.post('/login', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: 'Missing idToken'
    });
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    
    if (!decoded.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified'
      });
    }

    const userDoc = await db.collection('users').doc(decoded.uid).get();

    res.json({
      success: true,
      uid: decoded.uid,
      role: decoded.role,
      profile: userDoc.data()?.profileData || {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Export for both local development and Firebase Functions
module.exports = { app, db, auth };
