// ==========================================
// STUDY ENGINE
// ==========================================


// ---------- LOCAL STORAGE ----------

function loadData(key, fallback = []) {
    const data = localStorage.getItem(key);

    if (!data) {
        return fallback;
    }

    return JSON.parse(data);
}


function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}


// ---------- DATA ----------

let subjects = loadData("subjects");
let tests = loadData("tests");
let studyHistory = loadData("studyHistory");


// ---------- ID GENERATOR ----------

function generateId() {
    return Date.now().toString() +
        Math.random().toString(36).substring(2, 8);
}


// ---------- DATE HELPERS ----------

function todayString() {
    return new Date().toISOString().split("T")[0];
}


function daysBetween(date1, date2) {

    const first = new Date(date1);
    const second = new Date(date2);

    const difference =
        Math.abs(second - first);

    return Math.floor(
        difference / (1000 * 60 * 60 * 24)
    );
}


function daysUntil(date) {

    const today = new Date(todayString());
    const target = new Date(date);

    return Math.ceil(
        (target - today) /
        (1000 * 60 * 60 * 24)
    );
}


// ---------- SUBJECTS ----------

function addSubject() {

    const input =
        document.getElementById("subjectName");

    const name = input.value.trim();

    if (!name) {
        alert("Enter a subject name.");
        return;
    }

    subjects.push({
        id: generateId(),
        name: name,
        chapters: []
    });

    saveData("subjects", subjects);

    input.value = "";

    renderEverything();
}


// ---------- CHAPTERS ----------

function addChapter() {

    const subjectId =
        document.getElementById("chapterSubject").value;

    const name =
        document.getElementById("chapterName").value.trim();

    const strength =
        Number(
            document.getElementById("chapterStrength").value
        );

    if (!subjectId) {
        alert("Add a subject first.");
        return;
    }

    if (!name) {
        alert("Enter a chapter name.");
        return;
    }

    const subject =
        subjects.find(s => s.id === subjectId);

    subject.chapters.push({
        id: generateId(),
        name: name,
        strength: strength,
        lastStudied: null,
        lastScore: null
    });

    saveData("subjects", subjects);

    document.getElementById("chapterName").value = "";

    renderEverything();
}


// ---------- FIND CHAPTER ----------

function findChapter(chapterId) {

    for (const subject of subjects) {

        const chapter =
            subject.chapters.find(
                c => c.id === chapterId
            );

        if (chapter) {
            return {
                subject: subject,
                chapter: chapter
            };
        }
    }

    return null;
}


// ---------- FIND UPCOMING TEST ----------

function getNearestTest(chapterId) {

    const upcoming =
        tests
            .filter(test =>
                test.chapterId === chapterId &&
                daysUntil(test.date) >= 0
            )
            .sort(
                (a, b) =>
                    new Date(a.date) -
                    new Date(b.date)
            );

    return upcoming[0] || null;
}


// ---------- PRIORITY ENGINE ----------

function calculatePriority(chapter) {

    let score = 0;

    // --------------------------------
    // 1. WEAKNESS
    // --------------------------------

    score += (6 - chapter.strength) * 10;


    // --------------------------------
    // 2. TIME SINCE LAST STUDY
    // --------------------------------

    if (!chapter.lastStudied) {

        score += 20;

    } else {

        const days =
            daysBetween(
                chapter.lastStudied,
                todayString()
            );

        score += Math.min(days * 3, 30);
    }


    // --------------------------------
    // 3. UPCOMING TEST
    // --------------------------------

    const test =
        getNearestTest(chapter.id);

    if (test) {

        const days =
            daysUntil(test.date);

        if (days <= 1) {
            score += 60;
        }

        else if (days <= 3) {
            score += 45;
        }

        else if (days <= 7) {
            score += 30;
        }

        else if (days <= 14) {
            score += 15;
        }
    }


    // --------------------------------
    // 4. LOW TEST SCORE
    // --------------------------------

    if (
        chapter.lastScore !== null &&
        chapter.lastScore !== undefined
    ) {

        if (chapter.lastScore < 50) {
            score += 30;
        }

        else if (chapter.lastScore < 70) {
            score += 20;
        }

        else if (chapter.lastScore < 85) {
            score += 10;
        }
    }


    return score;
}


// ---------- RANK ALL CHAPTERS ----------

function rankChapters() {

    const allChapters = [];

    subjects.forEach(subject => {

        subject.chapters.forEach(chapter => {

            allChapters.push({

                subject: subject,
                chapter: chapter,

                score:
                    calculatePriority(chapter)

            });

        });

    });

    allChapters.sort(
        (a, b) =>
            b.score - a.score
    );

    return allChapters;
}


// ---------- RECOMMENDATION ----------

function getRecommendation(session) {

    const ranked =
        rankChapters();

    if (ranked.length === 0) {

        alert(
            "Add subjects and chapters first."
        );

        return;
    }


    let index = 0;

    if (session === "secondary") {
        index = 1;
    }

    if (session === "tertiary") {
        index = 2;
    }


    // If there aren't enough chapters,
    // use the last available one.

    if (index >= ranked.length) {
        index = ranked.length - 1;
    }


    const result =
        ranked[index];


    displayRecommendation(
        result,
        session
    );
}


// ---------- RECOMMENDATION DISPLAY ----------

function displayRecommendation(result, session) {

    const box =
        document.getElementById(
            "recommendation"
        );

    const chapter =
        result.chapter;

    const subject =
        result.subject;

    const test =
        getNearestTest(
            chapter.id
        );


    let reasons = [];


    // Weakness

    if (chapter.strength <= 2) {
        reasons.push(
            "This is one of your weaker chapters."
        );
    }


    // Never studied

    if (!chapter.lastStudied) {

        reasons.push(
            "You haven't logged studying this chapter yet."
        );

    } else {

        const days =
            daysBetween(
                chapter.lastStudied,
                todayString()
            );

        if (days >= 4) {

            reasons.push(
                `You haven't studied it for ${days} days.`
            );
        }
    }


    // Test

    if (test) {

        const days =
            daysUntil(test.date);

        reasons.push(
            `You have a test in ${days} day${days === 1 ? "" : "s"}.`
        );
    }


    // Score

    if (
        chapter.lastScore !== null &&
        chapter.lastScore !== undefined
    ) {

        reasons.push(
            `Your last score was ${chapter.lastScore}%.`
        );
    }


    box.innerHTML = `

        <h3>
            🎯 ${subject.name} — ${chapter.name}
        </h3>

        <p>
            <strong>
                ${capitalize(session)} session
            </strong>
        </p>

        <div class="reason">

            ${reasons.length
                ? reasons.map(r => `• ${r}`).join("<br>")
                : "This chapter currently has the highest priority."
            }

        </div>

        <br>

        <strong>
            Priority score: ${result.score}
        </strong>

    `;

    box.classList.remove("hidden");
}


// ---------- LOG STUDY ----------

function logStudy() {

    const subjectId =
        document.getElementById(
            "studySubject"
        ).value;

    const chapterId =
        document.getElementById(
            "studyChapter"
        ).value;

    const duration =
        Number(
            document.getElementById(
                "studyDuration"
            ).value
        );

    const session =
        document.getElementById(
            "studySession"
        ).value;


    if (!subjectId || !chapterId) {

        alert(
            "Choose a subject and chapter."
        );

        return;
    }


    if (!duration || duration <= 0) {

        alert(
            "Enter a valid duration."
        );

        return;
    }


    studyHistory.push({

        id: generateId(),

        subjectId: subjectId,

        chapterId: chapterId,

        date: todayString(),

        duration: duration,

        session: session

    });


    // Update chapter's last studied date

    const result =
        findChapter(chapterId);

    if (result) {

        result.chapter.lastStudied =
            todayString();
    }


    saveData(
        "studyHistory",
        studyHistory
    );

    saveData(
        "subjects",
        subjects
    );


    document.getElementById(
        "studyDuration"
    ).value = "";


    renderEverything();

    alert(
        "Study session saved!"
    );
}


// ---------- ADD TEST ----------

function addTest() {

    const subjectId =
        document.getElementById(
            "testSubject"
        ).value;

    const chapterId =
        document.getElementById(
            "testChapter"
        ).value;

    const date =
        document.getElementById(
            "testDate"
        ).value;

    const scoreInput =
        document.getElementById(
            "testScore"
        ).value;


    if (!subjectId || !chapterId || !date) {

        alert(
            "Subject, chapter and date are required."
        );

        return;
    }


    const score =
        scoreInput === ""
            ? null
            : Number(scoreInput);


    tests.push({

        id: generateId(),

        subjectId: subjectId,

        chapterId: chapterId,

        date: date,

        score: score

    });


    // If score was entered,
    // update chapter score.

    if (score !== null) {

        const result =
            findChapter(chapterId);

        if (result) {
            result.chapter.lastScore =
                score;
        }

    }


    saveData(
        "tests",
        tests
    );

    saveData(
        "subjects",
        subjects
    );


    document.getElementById(
        "testDate"
    ).value = "";

    document.getElementById(
        "testScore"
    ).value = "";


    renderEverything();

    alert(
        "Test saved!"
    );
}


// ---------- UPDATE CHAPTER DROPDOWNS ----------

function updateChapterDropdown(
    subjectSelectId,
    chapterSelectId
) {

    const subjectId =
        document.getElementById(
            subjectSelectId
        ).value;

    const chapterSelect =
        document.getElementById(
            chapterSelectId
        );


    chapterSelect.innerHTML = "";


    const subject =
        subjects.find(
            s => s.id === subjectId
        );


    if (!subject) {
        return;
    }


    subject.chapters.forEach(chapter => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            chapter.id;

        option.textContent =
            chapter.name;

        chapterSelect.appendChild(
            option
        );

    });
}


// ---------- UPDATE SUBJECT DROPDOWNS ----------

function updateSubjectDropdowns() {

    const selects = [

        "chapterSubject",
        "testSubject",
        "studySubject"

    ];


    selects.forEach(id => {

        const select =
            document.getElementById(id);

        const previous =
            select.value;


        select.innerHTML = "";


        subjects.forEach(subject => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                subject.id;

            option.textContent =
                subject.name;

            select.appendChild(
                option
            );

        });


        if (
            subjects.some(
                s => s.id === previous
            )
        ) {

            select.value =
                previous;
        }

    });


    updateChapterDropdown(
        "testSubject",
        "testChapter"
    );

    updateChapterDropdown(
        "studySubject",
        "studyChapter"
    );
}


// ---------- RENDER SUBJECTS ----------

function renderSubjects() {

    const container =
        document.getElementById(
            "subjectsList"
        );

    container.innerHTML = "";


    subjects.forEach(subject => {

        const div =
            document.createElement(
                "div"
            );

        div.className = "item";

        div.innerHTML = `

            <strong>
                ${subject.name}
            </strong>

            <span class="small">
                ${subject.chapters.length}
                chapter(s)
            </span>

        `;

        container.appendChild(div);

    });
}


// ---------- RENDER CHAPTERS ----------

function renderChapters() {

    const container =
        document.getElementById(
            "chaptersList"
        );

    container.innerHTML = "";


    subjects.forEach(subject => {

        subject.chapters.forEach(chapter => {

            const div =
                document.createElement(
                    "div"
                );

            div.className = "item";


            const strengthText = {

                1: "Very Weak",

                2: "Weak",

                3: "Okay",

                4: "Strong",

                5: "Mastered"

            }[chapter.strength];


            div.innerHTML = `

                <strong>
                    ${subject.name}
                    — ${chapter.name}
                </strong>

                <span class="small">

                    Strength:
                    ${strengthText}

                    <br>

                    Last studied:
                    ${chapter.lastStudied || "Never"}

                    <br>

                    Last score:
                    ${chapter.lastScore !== null
                        ? chapter.lastScore + "%"
                        : "None"}

                </span>

            `;

            container.appendChild(
                div
            );

        });

    });
}


// ---------- RENDER TESTS ----------

function renderTests() {

    const container =
        document.getElementById(
            "testsList"
        );

    container.innerHTML = "";


    tests
        .sort(
            (a, b) =>
                new Date(a.date) -
                new Date(b.date)
        )
        .forEach(test => {

            const result =
                findChapter(
                    test.chapterId
                );

            if (!result) {
                return;
            }


            const div =
                document.createElement(
                    "div"
                );

            div.className = "item";


            div.innerHTML = `

                <strong>
                    ${result.subject.name}
                    —
                    ${result.chapter.name}
                </strong>

                <span class="small">

                    Date:
                    ${test.date}

                    <br>

                    Score:
                    ${test.score !== null
                        ? test.score + "%"
                        : "Not taken yet"}

                </span>

            `;

            container.appendChild(
                div
            );

        });
}


// ---------- RENDER HISTORY ----------

function renderHistory() {

    const container =
        document.getElementById(
            "historyList"
        );

    container.innerHTML = "";


    studyHistory
        .slice()
        .reverse()
        .slice(0, 10)
        .forEach(entry => {

            const result =
                findChapter(
                    entry.chapterId
                );

            if (!result) {
                return;
            }


            const div =
                document.createElement(
                    "div"
                );

            div.className = "item";


            div.innerHTML = `

                <strong>
                    ${result.subject.name}
                    —
                    ${result.chapter.name}
                </strong>

                <span class="small">

                    ${entry.date}
                    •
                    ${entry.duration} minutes
                    •
                    ${capitalize(entry.session)}

                </span>

            `;

            container.appendChild(
                div
            );

        });
}


// ---------- RENDER EVERYTHING ----------

function renderEverything() {

    updateSubjectDropdowns();

    renderSubjects();

    renderChapters();

    renderTests();

    renderHistory();
}


// ---------- CAPITALIZE ----------

function capitalize(text) {

    return text.charAt(0).toUpperCase()
        + text.slice(1);
}


// ---------- DROPDOWN EVENTS ----------

document
    .getElementById("testSubject")
    .addEventListener(
        "change",
        () => {

            updateChapterDropdown(
                "testSubject",
                "testChapter"
            );

        }
    );


document
    .getElementById("studySubject")
    .addEventListener(
        "change",
        () => {

            updateChapterDropdown(
                "studySubject",
                "studyChapter"
            );

        }
    );


// ---------- INITIAL LOAD ----------

renderEverything();
