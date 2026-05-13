const admin = require("firebase-admin");

let firebaseApp;

const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } else {
      serviceAccount = require("../../firebase-service-account.json");
    }

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