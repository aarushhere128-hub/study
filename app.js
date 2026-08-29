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

    if (!input) {
        return;
    }

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

    const subjectSelect =
        document.getElementById(
            "chapterSubject"
        );

    const nameInput =
        document.getElementById(
            "chapterName"
        );

    const strengthInput =
        document.getElementById(
            "chapterStrength"
        );

    if (
        !subjectSelect ||
        !nameInput ||
        !strengthInput
    ) {
        return;
    }

    const subjectId =
        subjectSelect.value;

    const name =
        nameInput.value.trim();

    const strength =
        Number(
            strengthInput.value
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

    nameInput.value = "";

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
//
// IMPORTANT:
//
// upcomingTests = School Tests / Exams
//
// tests = Home Tests
//
// These are intentionally separate.
// ==========================================

function getUpcomingTests(chapterId) {

    return upcomingTests
        .filter(test =>

            test.chapterIds &&
            test.chapterIds.includes(chapterId) &&

            daysUntil(test.date) >= 0

        )
        .sort(
            (a, b) =>
                new Date(a.date) -
                new Date(b.date)
        );
}


function getNearestUpcomingTest(chapterId) {

    const upcoming =
        getUpcomingTests(
            chapterId
        );

    return upcoming[0] || null;
}


// ==========================================
// SCHOOL TEST PRIORITY BOOST
// ==========================================

function getUpcomingTestBoost(chapterId) {

    const test =
        getNearestUpcomingTest(
            chapterId
        );

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
    // 3. SCHOOL TEST
    // --------------------------------------

    score +=
        getUpcomingTestBoost(
            chapter.id
        );


    // --------------------------------------
    // 4. LOW HOME TEST SCORE
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
// HOME TEST PRIORITY
// ==========================================

function calculateTestPriority(chapter) {

    let score = 0;


    const chapterTests =
        tests.filter(
            t => t.chapterId === chapter.id
        );


    // --------------------------------------
    // NEVER TESTED AT HOME
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
        // PREVIOUS HOME TEST SCORE
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
    // SCHOOL TEST
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

            // --------------------------------------
            // ONLY CONSIDER STUDIED CHAPTERS
            // --------------------------------------

            const hasStudySession =
                studyHistory.some(
                    entry =>
                        entry.chapterId === chapter.id
                );


            if (!hasStudySession) {
                return;
            }


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


    // --------------------------------------
    // NO TESTS RECOMMENDED
    // --------------------------------------

    if (ranked.length === 0) {

        alert(
            "No tests recommended. Study some chapters first!"
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

    if (!box) {
        return;
    }


    const chapter =
        result.chapter;

    const subject =
        result.subject;


    const test =
        getNearestUpcomingTest(
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
    // SCHOOL TEST
    // --------------------------------------

    if (test) {

        const days =
            daysUntil(test.date);

        const testText =
            test.name
                ? `"${test.name}"`
                : "an upcoming school test";


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
    // LAST HOME TEST SCORE
    // --------------------------------------

    if (
        chapter.lastScore !== null &&
        chapter.lastScore !== undefined
    ) {

        reasons.push(
            `Your last home test score was ${chapter.lastScore}%.`
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
// HOME TEST RECOMMENDATION DISPLAY
// ==========================================

function displayTestRecommendation(
    result
) {

    const box =
        document.getElementById(
            "testRecommendation"
        );

    if (!box) {
        return;
    }


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
    // HOME TEST HISTORY
    // --------------------------------------

    if (chapterTests.length === 0) {

        reasons.push(
            "You haven't tested this chapter at home yet."
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
                `Your last home test score was ${lastTest.score}%.`
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
    // SCHOOL TEST
    // --------------------------------------

    const upcoming =
        getNearestUpcomingTest(
            chapter.id
        );


    if (upcoming) {

        const days =
            daysUntil(
                upcoming.date
            );


        if (days === 0) {

            reasons.push(
                "You have a school test today."
            );

        } else {

            reasons.push(
                `You have a school test in ${days} day${days === 1 ? "" : "s"}.`
            );
        }
    }


    // --------------------------------------
    // DISPLAY
    // --------------------------------------

    box.innerHTML = `

        <h3>
            🧪 ${subject.name} — ${chapter.name}
        </h3>

        <p>
            This is your highest-priority
            chapter to test at home right now.
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
            Home test priority: ${result.score}
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

    const subjectElement =
        document.getElementById(
            "studySubject"
        );

    const chapterElement =
        document.getElementById(
            "studyChapter"
        );

    const durationElement =
        document.getElementById(
            "studyDuration"
        );

    const sessionElement =
        document.getElementById(
            "studySession"
        );


    if (
        !subjectElement ||
        !chapterElement ||
        !durationElement ||
        !sessionElement
    ) {
        return;
    }


    const subjectId =
        subjectElement.value;

    const chapterId =
        chapterElement.value;

    const duration =
        Number(
            durationElement.value
        );

    const session =
        sessionElement.value;


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


    durationElement.value = "";


    renderEverything();


    alert(
        "Study session saved!"
    );
}


// ==========================================
// ADD HOME TEST
// ==========================================

function addTest() {

    const nameElement =
        document.getElementById(
            "testName"
        );

    const subjectElement =
        document.getElementById(
            "testSubject"
        );

    const chapterElement =
        document.getElementById(
            "testChapter"
        );

    const dateElement =
        document.getElementById(
            "testDate"
        );

    const scoreElement =
        document.getElementById(
            "testScore"
        );

    const mistakesElement =
        document.getElementById(
            "testMistakes"
        );


    if (
        !nameElement ||
        !subjectElement ||
        !chapterElement ||
        !dateElement ||
        !scoreElement ||
        !mistakesElement
    ) {
        return;
    }


    const testName =
        nameElement.value.trim();

    const subjectId =
        subjectElement.value;

    const chapterId =
        chapterElement.value;

    const date =
        dateElement.value;

    const scoreInput =
        scoreElement.value;

    const mistakesInput =
        mistakesElement.value;


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
        (
            Number.isNaN(score) ||
            score < 0 ||
            score > 100
        )
    ) {

        alert(
            "Score must be between 0 and 100."
        );

        return;
    }


    if (
        mistakes !== null &&
        (
            Number.isNaN(mistakes) ||
            mistakes < 0
        )
    ) {

        alert(
            "Mistakes cannot be negative."
        );

        return;
    }


    // --------------------------------------
    // HOME TEST
    // --------------------------------------

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
    // UPDATE CHAPTER LAST HOME TEST SCORE
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


    nameElement.value = "";

    dateElement.value = "";

    scoreElement.value = "";

    mistakesElement.value = "";


    renderEverything();


    alert(
        "Home test saved!"
    );
            }

// ==========================================
// ADD SCHOOL TEST
// ==========================================

function addUpcomingTest() {

    const nameElement =
        document.getElementById(
            "upcomingTestName"
        );

    const dateElement =
        document.getElementById(
            "upcomingTestDate"
        );

    const subjectElement =
        document.getElementById(
            "upcomingTestSubject"
        );

    const chapterContainer =
        document.getElementById(
            "upcomingChapterList"
        );


    if (
        !nameElement ||
        !dateElement ||
        !subjectElement ||
        !chapterContainer
    ) {
        return;
    }


    const name =
        nameElement.value.trim();

    const date =
        dateElement.value;

    const subjectId =
        subjectElement.value;


    const checkedChapters =
        [
            ...chapterContainer.querySelectorAll(
                "input[type='checkbox']:checked"
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
            "Enter the test name, date and subject."
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


    nameElement.value = "";

    dateElement.value = "";


    renderEverything();


    alert(
        "School test saved!"
    );
}


// ==========================================
// UPDATE SCHOOL TEST CHAPTER LIST
// ==========================================

function updateUpcomingChapterList() {

    const subjectElement =
        document.getElementById(
            "upcomingTestSubject"
        );

    const container =
        document.getElementById(
            "upcomingChapterList"
        );


    if (
        !subjectElement ||
        !container
    ) {
        return;
    }


    const subjectId =
        subjectElement.value;


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
                        id =>
                            id !== chapterId
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
// DELETE HOME TEST
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
            "Delete this home test record?"
        );


    if (!confirmed) {
        return;
    }


    tests =
        tests.filter(
            t => t.id !== testId
        );


    // --------------------------------------
    // RECALCULATE LAST HOME TEST SCORE
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
// DELETE SCHOOL TEST
// ==========================================

function deleteUpcomingTest(
    testId
) {

    const test =
        upcomingTests.find(
            t => t.id === testId
        );


    if (!test) {
        return;
    }


    const confirmed =
        confirm(
            "Delete this school test?"
        );


    if (!confirmed) {
        return;
    }


    upcomingTests =
        upcomingTests.filter(
            t => t.id !== testId
        );


    saveData(
        "upcomingTests",
        upcomingTests
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


    if (
        !subjectSelect ||
        !chapterSelect
    ) {

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


    if (!container) {
        return;
    }


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


    if (!container) {
        return;
    }


    container.innerHTML = "";


    subjects.forEach(
        subject => {

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
                            getNearestUpcomingTest(
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
                                    : "School Test";


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

                                Last home test score:
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
// RENDER HOME TESTS
// ==========================================
//
// Compact dropdown format:
//
// Maths ▼
//
// Test Name
// Date
// Score
// Mistakes
//
// ==========================================

function renderTests() {

    const container =
        document.getElementById(
            "testsList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (tests.length === 0) {

        container.innerHTML = `

            <div class="empty-message">
                No home tests recorded yet.
            </div>

        `;

        return;
    }


    // Group tests by subject
    subjects.forEach(subject => {

        const subjectTests =
            tests.filter(
                test =>
                    test.subjectId ===
                    subject.id
            );


        if (subjectTests.length === 0) {
            return;
        }


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


        header.innerHTML = `

            <span class="subject-header-left">

                <span class="arrow">
                    ▶
                </span>

                ${subject.name}

            </span>

            <span class="subject-header-right">

                ${subjectTests.length}
                test${subjectTests.length === 1 ? "" : "s"}

            </span>

        `;


        const testContainer =
            document.createElement(
                "div"
            );


        testContainer.className =
            "subject-chapters hidden";


        header.onclick = () => {

            const isHidden =
                testContainer.classList.contains(
                    "hidden"
                );


            testContainer.classList.toggle(
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


        subjectTests
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
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


                div.className =
                    "item";


                const testName =
                    test.name
                        ? test.name
                        : "Home Test";


                div.innerHTML = `

                    <strong>
                        ${testName}
                    </strong>

                    <span class="small">

                        ${result.chapter.name}

                        <br>

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

                        Delete Home Test

                    </button>

                `;


                testContainer.appendChild(
                    div
                );

            });


        group.appendChild(
            header
        );

        group.appendChild(
            testContainer
        );


        container.appendChild(
            group
        );

    });
}


// ==========================================
// RENDER SCHOOL TESTS
// ==========================================
//
// Separate from Home Tests.
//
// Compact dropdown:
//
// Maths ▼
//
// Science Exam
// 5 January 2026
// Chapters: ...
//
// ==========================================

function renderUpcomingTests() {

    const container =
        document.getElementById(
            "upcomingTestsList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (upcomingTests.length === 0) {

        container.innerHTML = `

            <div class="empty-message">
                No upcoming school tests.
            </div>

        `;

        return;
    }


    subjects.forEach(subject => {

        const subjectTests =
            upcomingTests
                .filter(
                    test =>
                        test.subjectId ===
                        subject.id
                )
                .sort(
                    (a, b) =>
                        new Date(a.date) -
                        new Date(b.date)
                );


        if (subjectTests.length === 0) {
            return;
        }


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


        header.innerHTML = `

            <span class="subject-header-left">

                <span class="arrow">
                    ▶
                </span>

                ${subject.name}

            </span>

            <span class="subject-header-right">

                ${subjectTests.length}
                school test${subjectTests.length === 1 ? "" : "s"}

            </span>

        `;


        const testContainer =
            document.createElement(
                "div"
            );


        testContainer.className =
            "subject-chapters hidden";


        header.onclick = () => {

            const isHidden =
                testContainer.classList.contains(
                    "hidden"
                );


            testContainer.classList.toggle(
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


        subjectTests.forEach(test => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "item";


            const chapterNames =
                test.chapterIds
                    .map(id => {

                        const result =
                            findChapter(id);

                        return result
                            ? result.chapter.name
                            : null;

                    })
                    .filter(Boolean);


            const days =
                daysUntil(
                    test.date
                );


            let dateText =
                test.date;


            if (days === 0) {

                dateText +=
                    " — Today";

            } else if (days > 0) {

                dateText +=
                    ` — in ${days} day${days === 1 ? "" : "s"}`;

            } else {

                dateText +=
                    " — Past";

            }


            div.innerHTML = `

                <strong>
                    ${test.name}
                </strong>

                <span class="small">

                    ${dateText}

                    <br>

                    Chapters:
                    ${
                        chapterNames.length
                            ? chapterNames.join(", ")
                            : "None"
                    }

                </span>

                <br><br>

                <button
                    class="delete-btn"
                    onclick="deleteUpcomingTest('${test.id}')">

                    Delete School Test

                </button>

            `;


            testContainer.appendChild(
                div
            );

        });


        group.appendChild(
            header
        );

        group.appendChild(
            testContainer
        );


        container.appendChild(
            group
        );

    });
}


// ==========================================
// RENDER STUDY HISTORY
// ==========================================
//
// Compact dropdown:
//
// Maths ▼
//
// 5 January 2026
// Duration: 30 min
// Tertiary
//
// ==========================================

function renderHistory() {

    const container =
        document.getElementById(
            "historyList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (studyHistory.length === 0) {

        container.innerHTML = `

            <div class="empty-message">
                No study sessions recorded yet.
            </div>

        `;

        return;
    }


    // --------------------------------------
    // Group by subject
    // --------------------------------------

    subjects.forEach(subject => {

        const subjectHistory =
            studyHistory
                .filter(
                    entry =>
                        entry.subjectId ===
                        subject.id
                )
                .slice()
                .sort(
                    (a, b) =>
                        new Date(b.date) -
                        new Date(a.date)
                )
                .slice(0, 20);


        if (subjectHistory.length === 0) {
            return;
        }


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


        header.innerHTML = `

            <span class="subject-header-left">

                <span class="arrow">
                    ▶
                </span>

                ${subject.name}

            </span>

            <span class="subject-header-right">

                ${subjectHistory.length}
                session${subjectHistory.length === 1 ? "" : "s"}

            </span>

        `;


        const historyContainer =
            document.createElement(
                "div"
            );


        historyContainer.className =
            "subject-chapters hidden";


        header.onclick = () => {

            const isHidden =
                historyContainer.classList.contains(
                    "hidden"
                );


            historyContainer.classList.toggle(
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


        subjectHistory.forEach(entry => {

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

                    ${result.chapter.name}

                </strong>

                <span class="small">

                    ${entry.date}

                    <br>

                    Duration:
                    ${entry.duration}
                    min

                    <br>

                    Session:
                    ${capitalize(entry.session)}

                </span>

                <br><br>

                <button
                    class="delete-btn"
                    onclick="deleteStudySession('${entry.id}')">

                    Delete Session

                </button>

            `;


            historyContainer.appendChild(
                div
            );

        });


        group.appendChild(
            header
        );

        group.appendChild(
            historyContainer
        );


        container.appendChild(
            group
        );

    });
}


// ==========================================
// RENDER EVERYTHING
// ==========================================

function renderEverything() {

    updateSubjectDropdowns();

    renderSubjects();

    renderChapters();

    renderTests();

    renderUpcomingTests();

    renderHistory();
}


// ==========================================
// CAPITALIZE
// ==========================================

function capitalize(text) {

    if (!text) {
        return "";
    }

    return text.charAt(0).toUpperCase() +
        text.slice(1);
}


// ==========================================
// DROPDOWN EVENTS
// ==========================================

const testSubject =
    document.getElementById(
        "testSubject"
    );


if (testSubject) {

    testSubject.addEventListener(
        "change",
        () => {

            updateChapterDropdown(
                "testSubject",
                "testChapter"
            );

        }
    );

}


const studySubject =
    document.getElementById(
        "studySubject"
    );


if (studySubject) {

    studySubject.addEventListener(
        "change",
        () => {

            updateChapterDropdown(
                "studySubject",
                "studyChapter"
            );

        }
    );

}


const upcomingTestSubject =
    document.getElementById(
        "upcomingTestSubject"
    );


if (upcomingTestSubject) {

    upcomingTestSubject.addEventListener(
        "change",
        updateUpcomingChapterList
    );

}


// ==========================================
// INITIAL LOAD
// ==========================================

renderEverything();
