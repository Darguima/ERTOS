// Firebase configuration
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  databaseURL: "https://erts-pr-default-rtdb.europe-west1.firebasedatabase.app/",
  // No API key required for read-only public access
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };