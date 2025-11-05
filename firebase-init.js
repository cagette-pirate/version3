// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD8L0rRQqlBMTTMlrvWYmu8xWbn1szMl0Y",
  authDomain: "cagette-pas-officielle.firebaseapp.com",
  databaseURL: "https://cagette-pas-officielle-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cagette-pas-officielle",
  storageBucket: "cagette-pas-officielle.appspot.com",
  messagingSenderId: "57232007409",
  appId: "1:57232007409:web:d6ae6f6ebfd91634a90950",
  measurementId: "G-MMLSJFZTMN"
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