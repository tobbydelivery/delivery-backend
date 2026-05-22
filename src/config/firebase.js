const admin = require("firebase-admin");

let firebaseApp;

const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Fix escaped newlines in private key
      const jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        .replace(/\\n/g, "\n")
        .replace(/\n/g, "\\n");
      
      serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON.replace(/\\n/g, "\n")
      );
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