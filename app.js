// ==========================================
// STUDY ENGINE
// ==========================================


// ==========================================
// LOCAL STORAGE
// ==========================================

function loadData(key, fallback = []) {

    const data =
        localStorage.getItem(key);


    if (!data) {
        return fallback;
    }


    try {

        return JSON.parse(data);

    } catch (error) {

        console.error(
            `Could not load ${key}:`,
            error
        );

        return fallback;
    }
}


function saveData(key, data) {

    localStorage.setItem(
        key,
        JSON.stringify(data)
    );
}


// ==========================================
// DATA
// ==========================================

let subjects =
    loadData("subjects");

let tests =
    loadData("tests");

let upcomingTests =
    loadData("upcomingTests");

let studyHistory =
    loadData("studyHistory");


// ==========================================
// ID GENERATOR
// ==========================================

function generateId() {

    return Date.now().toString() +
        Math.random()
            .toString(36)
            .substring(2, 8);
}


// ==========================================
// DATE HELPERS
// ==========================================

function todayString() {

    return new Date()
        .toISOString()
        .split("T")[0];
}


function daysBetween(date1, date2) {

    const first =
        new Date(date1);

    const second =
        new Date(date2);

    const difference =
        Math.abs(second - first);

    return Math.floor(
        difference /
        (1000 * 60 * 60 * 24)
    );
}


function daysUntil(date) {

    const today =
        new Date(todayString());

    const target =
        new Date(date);

    return Math.ceil(
        (target - today) /
        (1000 * 60 * 60 * 24)
    );
}


// ==========================================
// SUBJECTS
// ==========================================

function addSubject() {

    const input =
        document.getElementById(
            "subjectName"
        );

    const name =
        input.value.trim();

    if (!name) {

        alert(
            "Enter a subject name."
        );

        return;
    }

    subjects.push({

        id: generateId(),

        name: name,

        chapters: []

    });

    saveData(
        "subjects",
        subjects
    );

    input.value = "";

    renderEverything();
}


// ==========================================
// CHAPTERS
// ==========================================

function addChapter() {

    const subjectId =
        document.getElementById(
            "chapterSubject"
        ).value;

    const name =
        document.getElementById(
            "chapterName"
        ).value.trim();

    const strength =
        Number(
            document.getElementById(
                "chapterStrength"
            ).value
        );

    if (!subjectId) {

        alert(
            "Add a subject first."
        );

        return;
    }

    if (!name) {

        alert(
            "Enter a chapter name."
        );

        return;
    }

    const subject =
        subjects.find(
            s => s.id === subjectId
        );

    if (!subject) {
        return;
    }

    subject.chapters.push({

        id: generateId(),

        name: name,

        strength: strength,

        lastStudied: null,

        lastScore: null

    });

    saveData(
        "subjects",
        subjects
    );

    document.getElementById(
        "chapterName"
    ).value = "";

    renderEverything();
}


// ==========================================
// FIND CHAPTER
// ==========================================

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


// ==========================================
// SCHOOL TESTS
// ==========================================

function getUpcomingSchoolTests(chapterId) {

    return upcomingTests
        .filter(test =>

            test.chapterIds.includes(chapterId) &&

            daysUntil(test.date) >= 0

        )
        .sort(
            (a, b) =>
                new Date(a.date) -
                new Date(b.date)
        );
}


function getNearestSchoolTest(chapterId) {

    const upcoming =
        getUpcomingSchoolTests(chapterId);

    return upcoming[0] || null;
}



// ==========================================
// TEST PRIORITY BOOST
// ==========================================

function getUpcomingTestBoost(chapterId) {

    const test =
        getNearestSchoolTest(chapterId);

    if (!test) {
        return 0;
    }

    const days =
        daysUntil(test.date);

    if (days <= 1) {
        return 60;
    }

    if (days <= 3) {
        return 45;
    }

    if (days <= 7) {
        return 30;
    }

    if (days <= 14) {
        return 15;
    }

    return 5;
}


// ==========================================
// STUDY PRIORITY
// ==========================================

function calculatePriority(chapter) {

    let score = 0;


    // --------------------------------------
    // 1. WEAKNESS
    // --------------------------------------

    if (chapter.strength === 0) {

        score += 5;

    } else {

        score +=
            (6 - chapter.strength) * 10;

    }


    // --------------------------------------
    // 2. TIME SINCE LAST STUDY
    // --------------------------------------

    if (!chapter.lastStudied) {

        score += 20;

    } else {

        const days =
            daysBetween(
                chapter.lastStudied,
                todayString()
            );

        score +=
            Math.min(
                days * 3,
                30
            );
    }


    // --------------------------------------
    // 3. UPCOMING TEST
    // --------------------------------------

    score +=
        getUpcomingTestBoost(
            chapter.id
        );


    // --------------------------------------
    // 4. LOW TEST SCORE
    // --------------------------------------

    if (
        chapter.lastScore !== null &&
        chapter.lastScore !== undefined
    ) {

        if (chapter.lastScore < 50) {

            score += 30;

        } else if (chapter.lastScore < 70) {

            score += 20;

        } else if (chapter.lastScore < 85) {

            score += 10;

        }
    }


    return score;
}


// ==========================================
// TEST PRIORITY
// ==========================================

function calculateTestPriority(chapter) {

    let score = 0;


    const chapterTests =
        tests.filter(
            t => t.chapterId === chapter.id
        );


    // --------------------------------------
    // NEVER TESTED
    // --------------------------------------

    if (chapterTests.length === 0) {

        score += 30;

    } else {

        const lastTest =
            chapterTests
                .slice()
                .sort(
                    (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                )[0];


        const days =
            daysBetween(
                lastTest.date,
                todayString()
            );


        score +=
            Math.min(
                days * 3,
                30
            );


        // ----------------------------------
        // PREVIOUS SCORE
        // ----------------------------------

        if (
            lastTest.score !== null &&
            lastTest.score !== undefined
        ) {

            if (lastTest.score < 50) {

                score += 35;

            } else if (lastTest.score < 70) {

                score += 25;

            } else if (lastTest.score < 85) {

                score += 10;

            }
        }
    }


    // --------------------------------------
    // RECENTLY STUDIED
    // --------------------------------------

    if (chapter.lastStudied) {

        const daysSinceStudy =
            daysBetween(
                chapter.lastStudied,
                todayString()
            );


        if (daysSinceStudy <= 2) {

            score += 20;

        } else if (daysSinceStudy <= 5) {

            score += 10;

        }
    }


    // --------------------------------------
    // UPCOMING TEST
    // --------------------------------------

    score +=
        getUpcomingTestBoost(
            chapter.id
        );


    return score;
}


// ==========================================
// RANDOMIZED TIE BREAKING
// ==========================================

function sortByPriorityWithRandomTies(items) {

    // Give every item a random value ONCE.
    // This prevents entry order from deciding
    // equal-priority chapters.

    items.forEach(item => {

        item.randomTieBreaker =
            Math.random();

    });


    items.sort((a, b) => {

        if (b.score !== a.score) {

            return b.score - a.score;

        }

        return (
            b.randomTieBreaker -
            a.randomTieBreaker
        );

    });


    return items;
}


// ==========================================
// RANK CHAPTERS
// ==========================================

function rankChapters() {

    const allChapters = [];


    subjects.forEach(subject => {

        subject.chapters.forEach(chapter => {

            allChapters.push({

                subject: subject,

                chapter: chapter,

                score:
                    calculatePriority(
                        chapter
                    )

            });

        });

    });


    return sortByPriorityWithRandomTies(
        allChapters
    );
}


// ==========================================
// WHAT SHOULD I STUDY?
// ==========================================

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

    } else if (session === "tertiary") {

        index = 2;

    }


    if (index >= ranked.length) {

        index =
            ranked.length - 1;

    }


    const result =
        ranked[index];


    displayRecommendation(
        result,
        session
    );
}


// ==========================================
// WHAT SHOULD I TEST?
// ==========================================

function getTestRecommendation() {

    const ranked = [];


    subjects.forEach(subject => {

        subject.chapters.forEach(chapter => {

            ranked.push({

                subject: subject,

                chapter: chapter,

                score:
                    calculateTestPriority(
                        chapter
                    )

            });

        });

    });


    if (ranked.length === 0) {

        alert(
            "Add subjects and chapters first."
        );

        return;
    }


    sortByPriorityWithRandomTies(
        ranked
    );


    const result =
        ranked[0];


    displayTestRecommendation(
        result
    );
}


// ==========================================
// STUDY RECOMMENDATION DISPLAY
// ==========================================

function displayRecommendation(
    result,
    session
) {

    const box =
        document.getElementById(
            "recommendation"
        );


    const chapter =
        result.chapter;

    const subject =
        result.subject;


    const test =
    getNearestSchoolTest(
        chapter.id
    );


    let reasons = [];


    // --------------------------------------
    // WEAKNESS
    // --------------------------------------

    if (chapter.strength <= 2) {

        reasons.push(
            "This is one of your weaker chapters."
        );
    }


    // --------------------------------------
    // NEVER STUDIED
    // --------------------------------------

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


    // --------------------------------------
    // UPCOMING TEST
    // --------------------------------------

    if (test) {

        const days =
            daysUntil(test.date);

        let testText =
            test.name
                ? `"${test.name}"`
                : "an upcoming test";


        if (days === 0) {

            reasons.push(
                `You have ${testText} today.`
            );

        } else {

            reasons.push(
                `You have ${testText} in ${days} day${days === 1 ? "" : "s"}.`
            );
        }
    }


    // --------------------------------------
    // LAST SCORE
    // --------------------------------------

    if (
        chapter.lastScore !== null &&
        chapter.lastScore !== undefined
    ) {

        reasons.push(
            `Your last score was ${chapter.lastScore}%.`
        );
    }


    // --------------------------------------
    // DISPLAY
    // --------------------------------------

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

            ${
                reasons.length
                    ? reasons
                        .map(r => `• ${r}`)
                        .join("<br>")
                    : "This chapter currently has the highest priority."
            }

        </div>

        <br>

        <strong>
            Priority score: ${result.score}
        </strong>

    `;


    box.classList.remove(
        "hidden"
    );
}


// ==========================================
// TEST RECOMMENDATION DISPLAY
// ==========================================

function displayTestRecommendation(
    result
) {

    const box =
        document.getElementById(
            "testRecommendation"
        );


    const chapter =
        result.chapter;

    const subject =
        result.subject;


    const chapterTests =
        tests.filter(
            t => t.chapterId === chapter.id
        );


    let reasons = [];


    // --------------------------------------
    // TEST HISTORY
    // --------------------------------------

    if (chapterTests.length === 0) {

        reasons.push(
            "You haven't tested this chapter yet."
        );

    } else {

        const lastTest =
            chapterTests
                .slice()
                .sort(
                    (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                )[0];


        if (
            lastTest.score !== null &&
            lastTest.score !== undefined
        ) {

            reasons.push(
                `Your last score was ${lastTest.score}%.`
            );
        }
    }


    // --------------------------------------
    // RECENT STUDY
    // --------------------------------------

    if (chapter.lastStudied) {

        const days =
            daysBetween(
                chapter.lastStudied,
                todayString()
            );


        if (days <= 2) {

            reasons.push(
                "You studied this recently, so it's a good candidate for testing."
            );
        }
    }


    // --------------------------------------
    // UPCOMING TEST
    // --------------------------------------

    const upcoming =
    getNearestSchoolTest(
        chapter.id
    );


    if (upcoming) {

        const days =
            daysUntil(
                upcoming.date
            );


        if (days === 0) {

            reasons.push(
                "You have an upcoming test today."
            );

        } else {

            reasons.push(
                `You have an upcoming test in ${days} day${days === 1 ? "" : "s"}.`
            );
        }
    }


    box.innerHTML = `

        <h3>
            🧪 ${subject.name} — ${chapter.name}
        </h3>

        <p>
            This is your highest-priority
            chapter to test right now.
        </p>

        <div class="reason">

            ${
                reasons.length
                    ? reasons
                        .map(r => `• ${r}`)
                        .join("<br>")
                    : "This chapter is due for testing."
            }

        </div>

        <br>

        <strong>
            Test priority: ${result.score}
        </strong>

    `;


    box.classList.remove(
        "hidden"
    );
}


// ==========================================
// LOG STUDY
// ==========================================

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


    const result =
        findChapter(
            chapterId
        );


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


// ==========================================
// ADD TEST
// ==========================================

function addTest() {

    const testName =
        document.getElementById(
            "testName"
        ).value.trim();


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


    const mistakesInput =
        document.getElementById(
            "testMistakes"
        ).value;


    if (
        !subjectId ||
        !chapterId ||
        !date
    ) {

        alert(
            "Subject, chapter and date are required."
        );

        return;
    }


    const score =
        scoreInput === ""
            ? null
            : Number(scoreInput);


    const mistakes =
        mistakesInput === ""
            ? null
            : Number(mistakesInput);


    if (
        score !== null &&
        (score < 0 || score > 100)
    ) {

        alert(
            "Score must be between 0 and 100."
        );

        return;
    }


    if (
        mistakes !== null &&
        mistakes < 0
    ) {

        alert(
            "Mistakes cannot be negative."
        );

        return;
    }


    tests.push({

        id: generateId(),

        name: testName,

        subjectId: subjectId,

        chapterId: chapterId,

        date: date,

        score: score,

        mistakes: mistakes

    });


    // --------------------------------------
    // UPDATE LAST SCORE
    // --------------------------------------

    if (score !== null) {

        const result =
            findChapter(
                chapterId
            );


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
        "testName"
    ).value = "";


    document.getElementById(
        "testDate"
    ).value = "";


    document.getElementById(
        "testScore"
    ).value = "";


    document.getElementById(
        "testMistakes"
    ).value = "";


    renderEverything();


    alert(
        "Test saved!"
    );
}

// ==========================================
// ADD SCHOOL TEST
// ==========================================

function addUpcomingTest() {

    const name =
        document
            .getElementById("upcomingTestName")
            .value
            .trim();


    const date =
        document
            .getElementById("upcomingTestDate")
            .value;


    const subjectId =
        document
            .getElementById("upcomingTestSubject")
            .value;


    const checkedChapters =
        [
            ...document.querySelectorAll(
                "#upcomingChapterList input[type='checkbox']:checked"
            )
        ].map(
            input => input.value
        );


    if (
        !name ||
        !date ||
        !subjectId
    ) {

        alert(
            "Enter the school test name, date and subject."
        );

        return;
    }


    if (
        checkedChapters.length === 0
    ) {

        alert(
            "Select at least one chapter."
        );

        return;
    }


    upcomingTests.push({

        id: generateId(),

        name: name,

        date: date,

        subjectId: subjectId,

        chapterIds: checkedChapters

    });


    saveData(
        "upcomingTests",
        upcomingTests
    );


    document.getElementById(
        "upcomingTestName"
    ).value = "";


    document.getElementById(
        "upcomingTestDate"
    ).value = "";


    renderEverything();


    alert(
        "School test saved!"
    );
}
// ==========================================
// UPDATE SCHOOL TEST CHAPTER LIST
// ==========================================

function updateUpcomingChapterList() {

    const subjectId =
        document
            .getElementById(
                "upcomingTestSubject"
            )
            .value;


    const container =
        document.getElementById(
            "upcomingChapterList"
        );


    container.innerHTML = "";


    const subject =
        subjects.find(
            s => s.id === subjectId
        );


    if (!subject) {
        return;
    }


    subject.chapters.forEach(
        chapter => {

            const label =
                document.createElement(
                    "label"
                );


            label.style.display =
                "block";


            label.style.marginBottom =
                "8px";


            label.innerHTML = `

                <input
                    type="checkbox"
                    value="${chapter.id}"
                >

                ${chapter.name}

            `;


            container.appendChild(
                label
            );

        }
    );
}
// ==========================================
// DELETE SUBJECT
// ==========================================

function deleteSubject(
    subjectId
) {

    const subject =
        subjects.find(
            s => s.id === subjectId
        );


    if (!subject) {
        return;
    }


    const confirmed =
        confirm(
            `Delete "${subject.name}" and all its chapters?`
        );


    if (!confirmed) {
        return;
    }


    subjects =
        subjects.filter(
            s => s.id !== subjectId
        );


    tests =
        tests.filter(
            test =>
                test.subjectId !== subjectId
        );
    upcomingTests =
    upcomingTests.filter(
        test =>
            test.subjectId !== subjectId
    );


    studyHistory =
        studyHistory.filter(
            entry =>
                entry.subjectId !== subjectId
        );


    saveData(
        "subjects",
        subjects
    );

    saveData(
        "tests",
        tests
    );
    saveData(
    "upcomingTests",
    upcomingTests
);

    saveData(
        "studyHistory",
        studyHistory
    );


    renderEverything();
}


// ==========================================
// DELETE CHAPTER
// ==========================================

function deleteChapter(
    chapterId
) {

    const result =
        findChapter(
            chapterId
        );


    if (!result) {
        return;
    }


    const confirmed =
        confirm(
            `Delete "${result.chapter.name}"?`
        );


    if (!confirmed) {
        return;
    }


    result.subject.chapters =
        result.subject.chapters.filter(
            chapter =>
                chapter.id !== chapterId
        );


    tests =
        tests.filter(
            test =>
                test.chapterId !== chapterId
        );
    upcomingTests =
    upcomingTests
        .map(test => ({

            ...test,

            chapterIds:
                test.chapterIds.filter(
                    id => id !== chapterId
                )

        }))
        .filter(
            test =>
                test.chapterIds.length > 0
        );


    studyHistory =
        studyHistory.filter(
            entry =>
                entry.chapterId !== chapterId
        );


    saveData(
        "subjects",
        subjects
    );

    saveData(
        "tests",
        tests
    );
    saveData(
    "upcomingTests",
    upcomingTests
);

    saveData(
        "studyHistory",
        studyHistory
    );


    renderEverything();
}


// ==========================================
// DELETE TEST
// ==========================================

function deleteTest(
    testId
) {

    const test =
        tests.find(
            t => t.id === testId
        );


    if (!test) {
        return;
    }


    const confirmed =
        confirm(
            "Delete this test record?"
        );


    if (!confirmed) {
        return;
    }


    tests =
        tests.filter(
            t => t.id !== testId
        );


    // --------------------------------------
    // RECALCULATE LAST SCORE
    // --------------------------------------

    const chapterTests =
        tests
            .filter(
                t =>
                    t.chapterId ===
                    test.chapterId &&
                    t.score !== null &&
                    t.score !== undefined
            )
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


    const result =
        findChapter(
            test.chapterId
        );


    if (result) {

        result.chapter.lastScore =
            chapterTests.length > 0
                ? chapterTests[0].score
                : null;

    }


    saveData(
        "tests",
        tests
    );

    saveData(
        "subjects",
        subjects
    );


    renderEverything();
}


// ==========================================
// DELETE STUDY SESSION
// ==========================================

function deleteStudySession(
    entryId
) {

    const entry =
        studyHistory.find(
            e => e.id === entryId
        );


    if (!entry) {
        return;
    }


    const confirmed =
        confirm(
            "Delete this study session?"
        );


    if (!confirmed) {
        return;
    }


    studyHistory =
        studyHistory.filter(
            e => e.id !== entryId
        );


    // --------------------------------------
    // RECALCULATE LAST STUDIED
    // --------------------------------------

    const chapterHistory =
        studyHistory
            .filter(
                e =>
                    e.chapterId ===
                    entry.chapterId
            )
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


    const result =
        findChapter(
            entry.chapterId
        );


    if (result) {

        result.chapter.lastStudied =
            chapterHistory.length > 0
                ? chapterHistory[0].date
                : null;

    }


    saveData(
        "studyHistory",
        studyHistory
    );

    saveData(
        "subjects",
        subjects
    );


    renderEverything();
}


// ==========================================
// UPDATE CHAPTER DROPDOWN
// ==========================================

function updateChapterDropdown(
    subjectSelectId,
    chapterSelectId
) {

    const subjectSelect =
        document.getElementById(
            subjectSelectId
        );


    const chapterSelect =
        document.getElementById(
            chapterSelectId
        );


    if (!subjectSelect ||
        !chapterSelect) {

        return;
    }


    const subjectId =
        subjectSelect.value;


    const previous =
        chapterSelect.value;


    chapterSelect.innerHTML = "";


    const subject =
        subjects.find(
            s => s.id === subjectId
        );


    if (!subject) {
        return;
    }


    subject.chapters.forEach(
        chapter => {

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

        }
    );


    if (
        subject.chapters.some(
            c => c.id === previous
        )
    ) {

        chapterSelect.value =
            previous;

    }
}


// ==========================================
// UPDATE SUBJECT DROPDOWNS
// ==========================================

function updateSubjectDropdowns() {

    const selects = [

    "chapterSubject",

    "testSubject",

    "studySubject",

    "upcomingTestSubject"

];


    selects.forEach(id => {

        const select =
            document.getElementById(id);


        if (!select) {
            return;
        }


        const previous =
            select.value;


        select.innerHTML = "";


        subjects.forEach(
            subject => {

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

            }
        );


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
    updateUpcomingChapterList();
}


// ==========================================
// RENDER SUBJECTS
// ==========================================

function renderSubjects() {

    const container =
        document.getElementById(
            "subjectsList"
        );


    container.innerHTML = "";


    subjects.forEach(
        subject => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "item";


            div.innerHTML = `

                <strong>
                    ${subject.name}
                </strong>

                <span class="small">
                    ${subject.chapters.length}
                    chapter(s)
                </span>

                <br><br>

                <button
                    onclick="deleteSubject('${subject.id}')"
                    class="delete-btn">

                    Delete Subject

                </button>

            `;


            container.appendChild(
                div
            );

        }
    );
}


// ==========================================
// RENDER CHAPTERS
// ==========================================

function renderChapters() {

    const container =
        document.getElementById(
            "chaptersList"
        );


    container.innerHTML = "";


    subjects.forEach(
        (subject, subjectIndex) => {

            const group =
                document.createElement(
                    "div"
                );


            group.className =
                "subject-group";


            const header =
                document.createElement(
                    "button"
                );


            header.className =
                "subject-header";


            const chapterCount =
                subject.chapters.length;


            header.innerHTML = `

                <span class="subject-header-left">

                    <span class="arrow">
                        ▶
                    </span>

                    ${subject.name}

                </span>

                <span class="subject-header-right">

                    ${chapterCount}
                    chapter${chapterCount === 1 ? "" : "s"}

                </span>

            `;


            const chapterContainer =
                document.createElement(
                    "div"
                );


            chapterContainer.className =
                "subject-chapters hidden";


            // ----------------------------------
            // TOGGLE
            // ----------------------------------

            header.onclick = () => {

                const isHidden =
                    chapterContainer.classList.contains(
                        "hidden"
                    );


                chapterContainer.classList.toggle(
                    "hidden"
                );


                const arrow =
                    header.querySelector(
                        ".arrow"
                    );


                arrow.textContent =
                    isHidden
                        ? "▼"
                        : "▶";
            };


            // ----------------------------------
            // CHAPTERS
            // ----------------------------------

            if (
                subject.chapters.length === 0
            ) {

                chapterContainer.innerHTML = `

                    <div class="empty-message">

                        No chapters added yet.

                    </div>

                `;

            } else {

                subject.chapters.forEach(
                    chapter => {

                        const div =
                            document.createElement(
                                "div"
                            );


                        div.className =
                            "chapter-item";


                        const strengthText = {

                            0: "Not Started",

                            1: "Very Weak",

                            2: "Weak",

                            3: "Okay",

                            4: "Strong",

                            5: "Mastered"

                        }[chapter.strength];


                        const upcoming =
    getNearestSchoolTest(
        chapter.id
    );


                        let upcomingHTML = "";


                        if (upcoming) {

                            const days =
                                daysUntil(
                                    upcoming.date
                                );


                            const testName =
                                upcoming.name
                                    ? upcoming.name
                                    : "Upcoming Test";


                            upcomingHTML = `

                                <div class="upcoming-test">

                                    📅
                                    <strong>
                                        ${testName}
                                    </strong>

                                    ${
                                        days === 0
                                            ? " — Today"
                                            : ` — in ${days} day${days === 1 ? "" : "s"}`
                                    }

                                </div>

                            `;
                        }


                        div.innerHTML = `

                            <strong>
                                ${chapter.name}
                            </strong>

                            <span class="small">

                                Strength:
                                ${strengthText}

                                <br>

                                Last studied:
                                ${chapter.lastStudied || "Never"}

                                <br>

                                Last score:
                                ${
                                    chapter.lastScore !== null &&
                                    chapter.lastScore !== undefined
                                        ? chapter.lastScore + "%"
                                        : "None"
                                }

                            </span>

                            ${upcomingHTML}

                            <br>

                            <button
                                onclick="deleteChapter('${chapter.id}')"
                                class="delete-btn">

                                Delete Chapter

                            </button>

                        `;


                        chapterContainer.appendChild(
                            div
                        );

                    }
                );
            }


            group.appendChild(
                header
            );


            group.appendChild(
                chapterContainer
            );


            container.appendChild(
                group
            );

        }
    );
}


// ==========================================
// RENDER TESTS
// ==========================================

function renderTests() {

    const container =
        document.getElementById(
            "testsList"
        );


    container.innerHTML = "";


    tests
        .slice()
        .sort(
            (a, b) =>
                new Date(a.date) -
                new Date(b.date)
        )
        .forEach(
            test => {

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


                div.className =
                    "item";


                const testName =
                    test.name
                        ? test.name
                        : "Test";


                div.innerHTML = `

                    <strong>

                        ${testName}

                        <br>

                        ${result.subject.name}
                        —
                        ${result.chapter.name}

                    </strong>

                    <span class="small">

                        Date:
                        ${test.date}

                        <br>

                        Score:
                        ${
                            test.score !== null &&
                            test.score !== undefined
                                ? test.score + "%"
                                : "Not recorded"
                        }

                        <br>

                        Mistakes:
                        ${
                            test.mistakes !== null &&
                            test.mistakes !== undefined
                                ? test.mistakes
                                : "Not recorded"
                        }

                    </span>

                    <br><br>

                    <button
                        class="delete-btn"
                        onclick="deleteTest('${test.id}')">

                        Delete Test

                    </button>

                `;


                container.appendChild(
                    div
                );

            }
        );
}


// ==========================================
// RENDER HISTORY
// ==========================================

function renderHistory() {

    const container =
        document.getElementById(
            "historyList"
        );


    container.innerHTML = "";


    studyHistory
        .slice()
        .reverse()
        .slice(0, 20)
        .forEach(
            entry => {

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


                div.className =
                    "item";


                div.innerHTML = `

                    <strong>

                        ${result.subject.name}
                        —
                        ${result.chapter.name}

                    </strong>

                    <span class="small">

                        ${entry.date}

                        •
                        ${entry.duration}
                        minutes

                        •
                        ${capitalize(entry.session)}

                    </span>

                    <br><br>

                    <button
                        class="delete-btn"
                        onclick="deleteStudySession('${entry.id}')">

                        Delete Session

                    </button>

                `;


                container.appendChild(
                    div
                );

            }
        );
}


// ==========================================
// RENDER EVERYTHING
// ==========================================

function renderEverything() {

    updateSubjectDropdowns();

    renderSubjects();

    renderChapters();

    renderTests();

    renderHistory();
}


// ==========================================
// CAPITALIZE
// ==========================================

function capitalize(text) {

    return text.charAt(0).toUpperCase() +
        text.slice(1);
}


// ==========================================
// DROPDOWN EVENTS
// ==========================================

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
document
    .getElementById("upcomingTestSubject")
    .addEventListener(
        "change",
        updateUpcomingChapterList
    );


// ==========================================
// INITIAL LOAD
// ==========================================

renderEverything();
