const admin = require("firebase-admin");

let firebaseApp;

const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    let credential;

    if (process.env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      });
    } else {
      const serviceAccount = require("../../firebase-service-account.json");
      credential = admin.credential.cert(serviceAccount);
    }

    firebaseApp = admin.initializeApp({ credential });
    console.log("✅ Firebase initialized successfully");
    return firebaseApp;
  } catch (err) {
    console.error("❌ Firebase initialization error:", err.message);
  }
};

module.exports = { admin, initializeFirebase };