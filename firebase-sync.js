// ==========================================
// STUDY ENGINE → MISTAKE DB SYNC
// ==========================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    setDoc,
    doc
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
// SYNC SUBJECTS + CHAPTERS
// ==========================================

export async function syncStudyEngineData(
    subjects
) {

    for (const subject of subjects) {

        await setDoc(

            doc(
                db,
                "studyEngineSubjects",
                subject.id
            ),

            {

                name: subject.name,

                chapters:
                    subject.chapters.map(
                        chapter => ({

                            id: chapter.id,

                            name: chapter.name

                        })
                    )

            }

        );

    }

}
