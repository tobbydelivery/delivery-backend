const admin = require("firebase-admin");
const path = require("path");

let firebaseApp;

const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = require(path.resolve(
      process.env.FIREBASE_SERVICE_ACCOUNT || "./firebase-service-account.json"
    ));

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    console.log("✅ Firebase initialized successfully");
    return firebaseApp;
  } catch (err) {
    console.error("❌ Firebase initialization error:", err.message);
  }
};

module.exports = { admin, initializeFirebase };
