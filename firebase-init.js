// Configuration Firebase
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY_PLACEHOLDER",
  authDomain: "FIREBASE_AUTH_DOMAIN_PLACEHOLDER",
  databaseURL: "FIREBASE_DATABASE_URL_PLACEHOLDER",
  projectId: "FIREBASE_PROJECT_ID_PLACEHOLDER",
  storageBucket: "FIREBASE_STORAGE_BUCKET_PLACEHOLDER",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER",
  appId: "FIREBASE_APP_ID_PLACEHOLDER",
  measurementId: "FIREBASE_MEASUREMENT_ID_PLACEHOLDER"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Authentification anonyme
firebase.auth().signInAnonymously().catch(function(error) {
  console.error('Anonymous sign-in failed:', error);
});
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    console.log('Signed in anonymously as:', user.uid);
    initApp();
  } else {
    console.log('User signed out');
  }
});