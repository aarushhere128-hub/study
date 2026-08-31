// ==========================================
// STUDY ENGINE FIREBASE
// ==========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// ==========================================
// FIREBASE CONFIG
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyBIDPgCrrPPv99x9wXM6U8m12HmqaX6cS4",
    authDomain: "mistake-db.firebaseapp.com",
    projectId: "mistake-db",
    storageBucket: "mistake-db.firebasestorage.app",
    messagingSenderId: "151729819129",
    appId: "1:151729819129:web:7a375ed88aa8b28e240128"
};


// ==========================================
// INITIALIZE
// ==========================================

const app =
    initializeApp(firebaseConfig);

const db =
    getFirestore(app);


// ==========================================
// MISTAKES
// ==========================================

export async function getMistakesFromDB() {

    const mistakesCollection =
        collection(
            db,
            "mistakes"
        );

    const snapshot =
        await getDocs(
            mistakesCollection
        );

    return snapshot.docs.map(
        document => ({

            id: document.id,

            ...document.data()

        })
    );

}
