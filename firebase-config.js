// Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "AIzaSyAEV9VCbQOFA763ULbg2H9N7YPONHFo9ys",
  authDomain: "pneu-ee1d6.firebaseapp.com",
  projectId: "pneu-ee1d6",
  storageBucket: "pneu-ee1d6.firebasestorage.app",
  messagingSenderId: "703642287813",
  appId: "1:703642287813:web:e5a25fe039e09883cb7aac",
  measurementId: "G-5Z9VW7RB1F"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
// Initialize Firestore and Auth for use in other scripts
window.db = firebase.firestore();
window.auth = firebase.auth();
