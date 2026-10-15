const IremeGame = {
    state: {
        phase: 'idle',
        subject: null,
        level: null,
        language: 'en',
        duration: 10,
        opponent: null,
        currentRound: 0,
        totalRounds: 5,
        playerScore: 0,
        opponentScore: 0,
        playerTurn: true,
        timer: 30,
        timerInterval: null,
        currentQuestion: null,
        questions: [],
        matchHistory: [],
        subscriptionActive: true,
    },

    subjects: [
        { id: 'math', key: 'game.subject.math' },
        { id: 'science', key: 'game.subject.science' },
        { id: 'english', key: 'game.subject.english' },
        { id: 'kinyarwanda', key: 'game.subject.kinyarwanda' },
        { id: 'social', key: 'game.subject.social' },
    ],

    levels: [
        { id: 'p1-p3', key: 'game.level.primary_low' },
        { id: 'p4-p6', key: 'game.level.primary_high' },
        { id: 's1-s3', key: 'game.level.secondary_low' },
        { id: 's4-s6', key: 'game.level.secondary_high' },
    ],

    durations: [5, 10, 15, 20],

    sampleQuestions: {
        math: [
            { id: 1, topic: 'Addition', difficulty: 'easy', text_en: 'What is 25 + 37?', text_rw: '25 + 37 ni iki?', options_en: ['52', '62', '72', '42'], options_rw: ['52', '62', '72', '42'], correct: 1, explanation_en: '25 + 37 = 62. Add the ones: 5+7=12, carry 1. Add the tens: 2+3+1=6.', explanation_rw: '25 + 37 = 62. Tera ibice: 5+7=12, twikubite 1. Tera ibice by\'ikumi: 2+3+1=6.' },
            { id: 2, topic: 'Multiplication', difficulty: 'medium', text_en: 'What is 12 × 8?', text_rw: '12 × 8 ni iki?', options_en: ['86', '96', '106', '88'], options_rw: ['86', '96', '106', '88'], correct: 1, explanation_en: '12 × 8 = 96. Break it down: 10×8=80, 2×8=16, 80+16=96.', explanation_rw: '12 × 8 = 96. Gabanya: 10×8=80, 2×8=16, 80+16=96.' },
            { id: 3, topic: 'Fractions', difficulty: 'hard', text_en: 'What is 3/4 + 1/2?', text_rw: '3/4 + 1/2 ni iki?', options_en: ['5/4', '4/6', '1', '7/4'], options_rw: ['5/4', '4/6', '1', '7/4'], correct: 0, explanation_en: '3/4 + 1/2 = 3/4 + 2/4 = 5/4. Find common denominator first.', explanation_rw: '3/4 + 1/2 = 3/4 + 2/4 = 5/4. Shaka umubare w\'ibanze umwe.' },
        ],
        science: [
            { id: 4, topic: 'Photosynthesis', difficulty: 'medium', text_en: 'What gas do plants absorb during photosynthesis?', text_rw: 'Ni ikihe gazi ibimera binywa muri fotosinteze?', options_en: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], options_rw: ['Ogizijeni', 'Karuboni Diyokisayidi', 'Nitirojeni', 'Hidrojeni'], correct: 1, explanation_en: 'Plants absorb Carbon Dioxide (CO2) and release Oxygen during photosynthesis.', explanation_rw: 'Ibimera binywa Karuboni Diyokisayidi (CO2) bigasohora Ogizijeni muri fotosinteze.' },
            { id: 5, topic: 'Solar System', difficulty: 'easy', text_en: 'How many planets are in our solar system?', text_rw: 'Planete zingahe ziri mu sisitemu y\'izuba?', options_en: ['6', '7', '8', '9'], options_rw: ['6', '7', '8', '9'], correct: 2, explanation_en: 'There are 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.', explanation_rw: 'Hari planete 8: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.' },
        ],
        english: [
            { id: 6, topic: 'Grammar', difficulty: 'easy', text_en: 'Which is a noun?', text_rw: 'Ni ikihe ari izina?', options_en: ['Run', 'Beautiful', 'Book', 'Quickly'], options_rw: ['Gukora', 'Kwiza', 'Igitabo', 'Vuba'], correct: 2, explanation_en: '"Book" is a noun — it names a thing. "Run" is a verb, "Beautiful" is an adjective.', explanation_rw: '"Igitabo" ni izina — rivuga ikintu. "Gukora" ni umugozo, "Kwiza" ni umuvugo.' },
        ],
        kinyarwanda: [
            { id: 7, topic: 'Imibare', difficulty: 'easy', text_en: 'Ishyiramo ijambo ribereye: "Umwana ___ amazi."', text_rw: 'Ishyiramo ijambo ribereye: "Umwana ___ amazi."', options_en: ['Anywa', 'Arya', 'Asoma', 'Akorana'], options_rw: ['Anywa', 'Arya', 'Asoma', 'Akorana'], correct: 0, explanation_en: '"Anywa" means drinks. "Umwana anywa amazi" = The child drinks water.', explanation_rw: '"Anywa" bivuga kunywa. "Umwana anywa amazi" = umwana aranywa.' },
        ],
        social: [
            { id: 8, topic: 'Rwanda Geography', difficulty: 'easy', text_en: 'What is the capital city of Rwanda?', text_rw: 'Umujyi mukuru w\'u Rwanda ni uwuhe?', options_en: ['Butare', 'Gisenyi', 'Kigali', 'Ruhengeri'], options_rw: ['Butare', 'Gisenyi', 'Kigali', 'Ruhengeri'], correct: 2, explanation_en: 'Kigali is the capital city of Rwanda, located in the center of the country.', explanation_rw: 'Kigali ni wo mujyi mukuru w\'u Rwanda, uherereye hagati mu gihugu.' },
        ],
    },

    getQuestions(subject) {
        return this.sampleQuestions[subject] || this.sampleQuestions.math;
    },

    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    setPhase(phase) {
        this.state.phase = phase;
        const el = document.getElementById('game-phase');
        if (el) {
            el.textContent = this.getPhaseText(phase);
        }
    },

    getPhaseText(phase) {
        const lang = localStorage.getItem('ireme-lang') || 'en';
        const texts = {
            idle: { en: 'Idle', rw: 'Biteguye' },
            checking: { en: 'Checking eligibility...', rw: 'Kugenzura uburenganzira...' },
            searching: { en: 'Searching for an opponent...', rw: 'Gushaka umukinnyi...' },
            found: { en: 'Opponent found!', rw: 'Umukinnyi yabonetse!' },
            preparing: { en: 'Preparing the match...', rw: 'Gutegura umukino...' },
            ready: { en: 'Match ready!', rw: 'Umukino witeguye!' },
            playing: { en: 'Playing...', rw: 'Birakinwa...' },
            completed: { en: 'Match completed!', rw: 'Umukino urangiye!' },
            disconnected: { en: 'Opponent disconnected', rw: 'Umukinnyi yavuyemo' },
        };
        return texts[phase]?.[lang] || phase;
    },

    startMatchmaking(subject, level, language, duration) {
        this.state.subject = subject;
        this.state.level = level;
        this.state.language = language;
        this.state.duration = duration;
        this.state.totalRounds = Math.min(duration, 10);
        this.state.playerScore = 0;
        this.state.opponentScore = 0;
        this.state.currentRound = 0;

        this.setPhase('checking');
        setTimeout(() => {
            if (!this.state.subscriptionActive) {
                this.setPhase('idle');
                this.showSubscriptionRequired();
                return;
            }
            this.setPhase('searching');
            setTimeout(() => {
                this.state.opponent = { name: 'Student_' + Math.floor(Math.random() * 9000 + 1000), level: level };
                this.setPhase('found');
                setTimeout(() => {
                    this.setPhase('preparing');
                    setTimeout(() => {
                        this.setPhase('ready');
                        setTimeout(() => this.startGameplay(), 1500);
                    }, 1500);
                }, 2000);
            }, 2000 + Math.random() * 2000);
        }, 1000);
    },

    showSubscriptionRequired() {
        const msg = document.getElementById('game-message');
        if (msg) {
            const lang = localStorage.getItem('ireme-lang') || 'en';
            msg.textContent = lang === 'rw'
                ? 'Ukeneye gahunda yo kwishyura kugira ngo ukine. Kanda hano urebe gahunda.'
                : 'You need an active subscription to play. Click here to view plans.';
            msg.className = 'text-danger text-center mt-3';
        }
    },

    startGameplay() {
        this.state.questions = this.shuffle(this.getQuestions(this.state.subject));
        this.state.playerTurn = Math.random() > 0.5;
        this.state.currentRound = 0;
        this.setPhase('playing');
        this.nextRound();
    },

    nextRound() {
        this.state.currentRound++;
        if (this.state.currentRound > this.state.totalRounds) {
            this.endMatch();
            return;
        }

        const qIndex = (this.state.currentRound - 1) % this.state.questions.length;
        this.state.currentQuestion = this.state.questions[qIndex];
        this.state.timer = 30;

        this.updateGameUI();
        this.startTimer();
    },

    startTimer() {
        clearInterval(this.state.timerInterval);
        this.state.timerInterval = setInterval(() => {
            this.state.timer--;
            const timerEl = document.getElementById('game-timer');
            if (timerEl) timerEl.textContent = this.state.timer + 's';

            if (this.state.timer <= 0) {
                clearInterval(this.state.timerInterval);
                this.submitAnswer(-1);
            }
        }, 1000);
    },

    submitAnswer(answerIndex) {
        clearInterval(this.state.timerInterval);
        const q = this.state.currentQuestion;
        const lang = this.state.language;
        const isCorrect = answerIndex === q.correct;
        const isPlayerAnswering = this.state.playerTurn;

        if (isPlayerAnswering) {
            if (isCorrect) {
                this.state.playerScore += q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1;
            }
        } else {
            const aiCorrect = Math.random() > 0.35;
            if (aiCorrect) {
                this.state.opponentScore += q.difficulty === 'hard' ? 3 : q.difficulty === 'medium' ? 2 : 1;
            }
        }

        this.showAnswerResult(isCorrect, isPlayerAnswering);
    },

    showAnswerResult(isCorrect, isPlayerAnswering) {
        const q = this.state.currentQuestion;
        const lang = localStorage.getItem('ireme-lang') || 'en';
        const resultEl = document.getElementById('game-result-feedback');
        if (!resultEl) return;

        const correctText = lang === 'rw' ? 'Igisubizo nyacyo' : 'Correct Answer';
        const yourAnswer = isPlayerAnswering
            ? (lang === 'rw' ? (isCorrect ? 'Wasubije neza!' : 'Ntabwo ari cyo gisubizo.') : (isCorrect ? 'Correct!' : 'Not quite right.'))
            : (lang === 'rw' ? "Umuhanzi w'umukinnyi" : "Opponent's turn");

        const options = lang === 'rw' ? q.options_rw : q.options_en;
        const explanation = lang === 'rw' ? q.explanation_rw : q.explanation_en;

        resultEl.innerHTML = `
            <div class="text-center mb-3">
                <span class="badge ${isPlayerAnswering && isCorrect ? 'bg-success' : 'bg-danger'} px-3 py-2 fs-6">
                    ${yourAnswer}
                </span>
            </div>
            <div class="bg-light rounded p-3 mb-3">
                <h6 class="text-primary">${correctText}:</h6>
                <p class="mb-1 fw-bold">${options[q.correct]}</p>
                <p class="mb-0 small text-muted">${explanation}</p>
            </div>
            <div class="d-flex justify-content-between">
                <span class="fw-bold">You: ${this.state.playerScore}</span>
                <span class="fw-bold">${this.state.opponent?.name || 'Opponent'}: ${this.state.opponentScore}</span>
            </div>
        `;

        setTimeout(() => {
            this.state.playerTurn = !this.state.playerTurn;
            this.nextRound();
        }, 4000);
    },

    updateGameUI() {
        const q = this.state.currentQuestion;
        if (!q) return;
        const lang = localStorage.getItem('ireme-lang') || 'en';

        const roundEl = document.getElementById('game-round');
        if (roundEl) roundEl.textContent = `${lang === 'rw' ? 'Umuzingi' : 'Round'} ${this.state.currentRound}/${this.state.totalRounds}`;

        const topicEl = document.getElementById('game-topic');
        if (topicEl) topicEl.textContent = q.topic;

        const diffEl = document.getElementById('game-difficulty');
        if (diffEl) {
            const diffText = { easy: lang === 'rw' ? 'Byoroshye' : 'Easy', medium: lang === 'rw' ? 'Biringaniye' : 'Medium', hard: lang === 'rw' ? 'Bigoye' : 'Hard' };
            diffEl.textContent = diffText[q.difficulty];
        }

        const questionEl = document.getElementById('game-question-text');
        if (questionEl) questionEl.textContent = lang === 'rw' ? q.text_rw : q.text_en;

        const optionsEl = document.getElementById('game-options');
        if (optionsEl) {
            const options = lang === 'rw' ? q.options_rw : q.options_en;
            optionsEl.innerHTML = options.map((opt, i) =>
                `<button class="btn btn-outline-primary w-100 mb-2 py-3 text-start" onclick="IremeGame.submitAnswer(${i})" ${!this.state.playerTurn ? 'disabled' : ''}>${String.fromCharCode(65 + i)}. ${opt}</button>`
            ).join('');
        }

        const turnEl = document.getElementById('game-turn-indicator');
        if (turnEl) {
            turnEl.textContent = this.state.playerTurn
                ? (lang === 'rw' ? 'Ni ukwawe!' : 'Your turn!')
                : (lang === 'rw' ? "Umuhanzi w'umukinnyi aratoranya..." : 'Opponent is choosing...');
            turnEl.className = `text-center fw-bold mb-3 ${this.state.playerTurn ? 'text-primary' : 'text-muted'}`;
        }

        const scoreEl = document.getElementById('game-scores');
        if (scoreEl) {
            scoreEl.innerHTML = `
                <div class="d-flex justify-content-between px-3">
                    <span class="fw-bold">You: ${this.state.playerScore}</span>
                    <span class="fw-bold">${this.state.opponent?.name || 'Opponent'}: ${this.state.opponentScore}</span>
                </div>`;
        }

        const timerEl = document.getElementById('game-timer');
        if (timerEl) timerEl.textContent = this.state.timer + 's';

        const feedbackEl = document.getElementById('game-result-feedback');
        if (feedbackEl) feedbackEl.innerHTML = '';
    },

    endMatch() {
        clearInterval(this.state.timerInterval);
        this.setPhase('completed');

        const lang = localStorage.getItem('ireme-lang') || 'en';
        const playerWon = this.state.playerScore > this.state.opponentScore;
        const isDraw = this.state.playerScore === this.state.opponentScore;

        const resultText = playerWon
            ? (lang === 'rw' ? 'Watsinze!' : 'You Won!')
            : isDraw
                ? (lang === 'rw' ? 'Manganye!' : 'It\'s a Draw!')
                : (lang === 'rw' ? 'Watsinzwe.' : 'You Lost.');

        const accuracy = this.state.totalRounds > 0
            ? Math.round((this.state.playerScore / (this.state.totalRounds * 3)) * 100)
            : 0;

        const matchRecord = {
            date: new Date().toLocaleDateString(),
            subject: this.state.subject,
            level: this.state.level,
            opponent: this.state.opponent?.name,
            playerScore: this.state.playerScore,
            opponentScore: this.state.opponentScore,
            result: playerWon ? 'win' : isDraw ? 'draw' : 'loss',
            accuracy: accuracy,
        };
        this.state.matchHistory.push(matchRecord);

        if (typeof IremeGameUI !== 'undefined') {
            IremeGameUI.showResults(matchRecord, resultText);
        }
    },

    cancelMatchmaking() {
        this.setPhase('idle');
        this.state.opponent = null;
    },

    getMatchHistory() {
        return this.state.matchHistory;
    },

    toggleSubscription(active) {
        this.state.subscriptionActive = active;
    }
};

const IremeGameUI = {
    showResults(record, resultText) {
        const lang = localStorage.getItem('ireme-lang') || 'en';
        const container = document.getElementById('game-results-container');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center mb-4">
                <h2 class="fw-bold ${record.result === 'win' ? 'text-success' : record.result === 'draw' ? 'text-warning' : 'text-danger'}">${resultText}</h2>
            </div>
            <div class="row g-4 mb-4">
                <div class="col-6">
                    <div class="service-item rounded text-center p-4">
                        <h3 class="fw-bold text-primary">${record.playerScore}</h3>
                        <p class="mb-0">${lang === 'rw' ? 'Amanota yawe' : 'Your Score'}</p>
                    </div>
                </div>
                <div class="col-6">
                    <div class="service-item rounded text-center p-4">
                        <h3 class="fw-bold">${record.opponentScore}</h3>
                        <p class="mb-0">${record.opponent}</p>
                    </div>
                </div>
            </div>
            <div class="bg-light rounded p-4 mb-4">
                <div class="row text-center">
                    <div class="col-4">
                        <h5 class="fw-bold">${record.accuracy}%</h5>
                        <small class="text-muted">${lang === 'rw' ? 'Ukuri' : 'Accuracy'}</small>
                    </div>
                    <div class="col-4">
                        <h5 class="fw-bold">${record.subject?.toUpperCase() || 'N/A'}</h5>
                        <small class="text-muted">${lang === 'rw' ? 'Isomo' : 'Subject'}</small>
                    </div>
                    <div class="col-4">
                        <h5 class="fw-bold">${record.date}</h5>
                        <small class="text-muted">${lang === 'rw' ? 'Itariki' : 'Date'}</small>
                    </div>
                </div>
            </div>
            <div class="bg-light rounded p-4 mb-4">
                <h5 class="fw-bold mb-3">${lang === 'rw' ? 'Inama zo kwiga' : 'Learning Recommendations'}</h5>
                <ul class="mb-0">
                    <li>${lang === 'rw' ? 'Komeza kwitoza ibibazo by\'iki gice' : 'Keep practicing questions in this topic'}</li>
                    <li>${lang === 'rw' ? 'Soma ibitabo by\'iki gice muri REB' : 'Review curriculum materials for this subject'}</li>
                    <li>${lang === 'rw' ? 'Koresha Ireme AI kugira ngo ubaze ibibazo' : 'Use Ireme AI to ask questions about difficult topics'}</li>
                </ul>
            </div>
            <div class="d-flex justify-content-center gap-3">
                <button class="btn btn-primary rounded-pill px-4" onclick="IremeGameUI.rematch()">${lang === 'rw' ? 'Subira Ukinire' : 'Play Again'}</button>
                <a href="game-setup.html" class="btn btn-outline-primary rounded-pill px-4">${lang === 'rw' ? 'Hindura Isomo' : 'Change Subject'}</a>
                <a href="student-dashboard.html" class="btn btn-outline-primary rounded-pill px-4">${lang === 'rw' ? 'Subira ahabanza' : 'Dashboard'}</a>
            </div>`;
    },

    rematch() {
        window.location.href = 'game-setup.html';
    },

    renderHistory() {
        const lang = localStorage.getItem('ireme-lang') || 'en';
        const history = IremeGame.getMatchHistory();
        const container = document.getElementById('game-history-list');
        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = `<p class="text-center text-muted py-4">${lang === 'rw' ? 'Nta mikino irakinwa. Tangira gukina!' : 'No matches played yet. Start playing!'}</p>`;
            return;
        }

        container.innerHTML = history.map(m => {
            const badgeClass = m.result === 'win' ? 'bg-success' : m.result === 'draw' ? 'bg-warning text-dark' : 'bg-danger';
            const resultLabel = m.result === 'win' ? (lang === 'rw' ? 'Watsinze' : 'Won') : m.result === 'draw' ? (lang === 'rw' ? 'Manganye' : 'Draw') : (lang === 'rw' ? 'Watsinzwe' : 'Lost');
            return `
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom">
                <div>
                    <span class="badge ${badgeClass} me-2">${resultLabel}</span>
                    <strong>${m.subject?.toUpperCase()}</strong>
                    <small class="text-muted ms-2">${m.date}</small>
                </div>
                <div>
                    <span class="fw-bold">${m.playerScore} - ${m.opponentScore}</span>
                    <small class="text-muted ms-2">${m.accuracy}%</small>
                </div>
            </div>`;
        }).join('');
    }
};
