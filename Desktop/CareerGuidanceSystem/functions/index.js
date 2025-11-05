const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  admin.initializeApp();
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
}

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize Firebase services
const db = admin.firestore();
const auth = admin.auth();

// Base routes
app.get('/', (req, res) => {
  res.send('Career Guidance System API is running!');
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

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
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

// Export the Express app as a Cloud Function
exports.api = functions.https.onRequest(app);
