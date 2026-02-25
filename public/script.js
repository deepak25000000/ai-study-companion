// ==================== STATE ====================
let currentMode = 'explain';
let currentLevel = 'medium';
let numQuestions = 5;
let quizTimer = 30;
let isGenerating = false;
let currentSessionId = generateSessionId();

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const quizOptionsBar = document.getElementById('quizOptionsBar');
const currentModeBadge = document.getElementById('currentModeBadge');
const sidebar = document.getElementById('sidebar');
const historyList = document.getElementById('historyList');

// ==================== INITIALIZE ====================
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
}

// Load chat history
loadChatHistory();

// Auto-resize textarea
messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// ==================== MODE SELECTION ====================
const modeIcons = {
    explain: 'fa-book-open',
    summarize: 'fa-compress',
    quiz: 'fa-question-circle',
    flashcard: 'fa-layer-group'
};

const modeColors = {
    explain: '#3b82f6',
    summarize: '#8b5cf6',
    quiz: '#f59e0b',
    flashcard: '#ef4444'
};

document.querySelectorAll('.mode-card').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentMode = btn.dataset.mode;

        // Update current mode badge
        currentModeBadge.innerHTML = `
            <i class="fas ${modeIcons[currentMode]}" style="color: ${modeColors[currentMode]};"></i>
            <span>${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode</span>
        `;

        // Show/hide quiz options
        quizOptionsBar.classList.toggle('visible', currentMode === 'quiz');

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    });
});

// ==================== DIFFICULTY SELECTION ====================
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLevel = btn.dataset.level;
    });
});

// ==================== QUIZ OPTIONS ====================
document.querySelectorAll('[data-num]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-num]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        numQuestions = parseInt(btn.dataset.num);
    });
});

document.querySelectorAll('[data-timer]').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.parentElement.querySelectorAll('[data-timer]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        quizTimer = parseInt(btn.dataset.timer);
    });
});

// ==================== NAVIGATION ====================
const menuBtn = document.getElementById('menuBtn');
const sidebarClose = document.getElementById('sidebarClose');

if (menuBtn) {
    menuBtn.addEventListener('click', () => sidebar.classList.add('open'));
}
if (sidebarClose) {
    sidebarClose.addEventListener('click', () => sidebar.classList.remove('open'));
}

// Close sidebar on clicking outside
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove('open');
    }
});

document.getElementById('newChatBtn').addEventListener('click', () => {
    currentSessionId = generateSessionId();
    chatContainer.innerHTML = '';
    chatContainer.appendChild(welcomeScreen);
    setupQuickActions();
    loadChatHistory();
    if (window.innerWidth <= 768) sidebar.classList.remove('open');
});

document.getElementById('clearChatBtn').addEventListener('click', () => {
    chatContainer.innerHTML = '';
    chatContainer.appendChild(welcomeScreen);
    setupQuickActions();
    if (window.innerWidth <= 768) sidebar.classList.remove('open');
});

function setupQuickActions() {
    document.querySelectorAll('.quick-action').forEach(btn => {
        btn.addEventListener('click', () => {
            messageInput.value = btn.dataset.topic.trim();
            handleSend();
        });
    });
}
setupQuickActions(); // Init listeners

// ==================== MESSAGING LOGIC ====================
sendBtn.addEventListener('click', handleSend);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

async function handleSend() {
    const topic = messageInput.value.trim();
    if (!topic || isGenerating) return;

    if (welcomeScreen && welcomeScreen.parentNode) welcomeScreen.remove();

    addUserMessage(topic);
    messageInput.value = '';
    messageInput.style.height = 'auto';

    const typingEl = addTypingIndicator();
    isGenerating = true;
    sendBtn.disabled = true;

    try {
        if (currentMode === 'quiz' || currentMode === 'flashcard') {
            const body = { mode: currentMode, topic, level: currentLevel };
            if (currentMode === 'quiz') body.numQuestions = numQuestions;

            const res = await fetch('/api/study', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            typingEl.remove();

            if (data.result) renderResponse(data.result, data.mode);
            else addErrorMessage('Failed to generate content.');
        } else {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    message: topic,
                    mode: currentMode,
                    level: currentLevel
                })
            });
            const data = await res.json();
            typingEl.remove();

            if (data.response) {
                currentSessionId = data.sessionId;
                renderMarkdown(data.response);
                loadChatHistory();
            } else {
                addErrorMessage(data.error || 'No response received.');
            }
        }
    } catch (e) {
        typingEl.remove();
        addErrorMessage('Server connection failed.');
        console.error(e);
    } finally {
        isGenerating = false;
        sendBtn.disabled = false;
    }
}

// ==================== RENDERING ====================
function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML = `<div class="message-content">${escapeHtml(text)}</div><div class="message-avatar"><i class="fas fa-user"></i></div>`;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'message ai';
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>`;
    chatContainer.appendChild(div);
    scrollToBottom();
    return div;
}

function addErrorMessage(text) {
    const div = document.createElement('div');
    div.className = 'message ai error';
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="message-content"><strong>Error:</strong> ${escapeHtml(text)}</div>`;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function renderResponse(content, mode) {
    if (mode === 'quiz') renderQuiz(content);
    else if (mode === 'flashcard') renderFlashcards(content);
    else renderMarkdown(content);
}

function renderMarkdown(content) {
    const div = document.createElement('div');
    div.className = 'message ai';
    let html = typeof marked !== 'undefined' ? marked.parse(content) : escapeHtml(content).replace(/\n/g, '<br>');
    div.innerHTML = `<div class="message-avatar"><i class="fas fa-robot"></i></div><div class="message-content">${html}</div>`;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.toString().replace(/&/g, "&amp;")
        .replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ==================== PARSERS ====================
function parseQuestions(text) {
    const questions = [];
    const lines = text.split('\n');
    let current = null;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Match Question: "1. What is..." or "**Question 1**:"
        const qMatch = line.match(/^(?:\d+[\.:\)]|Question\s*\d+|Q:)\s*[:\.]?\s*(.+)/i);
        if (qMatch && !line.match(/^(Answer|Option|Explanation)/i)) {
            if (current && current.options.length >= 2) questions.push(current);
            current = { question: qMatch[1].replace(/\*\*/g, ''), options: [], answer: '', explanation: '' };
            continue;
        }

        // Match Option: "A) Text" or "- Text"
        const optMatch = line.match(/^([A-D])[\)\.]\s*(.+)/i) || line.match(/^[-\*]\s*(.+)/);
        if (current && optMatch) {
            current.options.push(optMatch[2] || optMatch[1]); // Regex group varies
            continue;
        }

        // Match Answer
        const ansMatch = line.match(/Answer:?\s*\*?([A-D])/i);
        if (current && ansMatch) current.answer = ansMatch[1].toUpperCase();

        // Match Explanation
        const expMatch = line.match(/Explanation:?\s*(.+)/i);
        if (current && expMatch) current.explanation = expMatch[1];
    }
    if (current && current.options.length >= 2) questions.push(current);

    // Auto-assign letters to answers if missing
    questions.forEach(q => {
        if (!q.answer && q.options.length > 0) q.answer = 'A'; // Fallback
    });

    return questions;
}

// ==================== QUIZ RENDERER ====================
function renderQuiz(content) {
    let questions = [];
    try {
        if (typeof content === 'string') {
            const clean = content.replace(/```json\s*|\s*```/g, '').trim();
            const start = clean.indexOf('[');
            const end = clean.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                questions = JSON.parse(clean.substring(start, end + 1));
            } else {
                questions = parseQuestions(content);
            }
        } else if (Array.isArray(content)) {
            questions = content;
        }
    } catch (e) {
        console.error("Quiz JSON parse failed, trying text parser:", e);
        questions = parseQuestions(content);
    }

    if (!questions || !questions.length) {
        renderMarkdown(typeof content === 'string' ? content : 'Could not generate quiz.');
        return;
    }

    // Normalize: ensure answer is uppercase letter
    questions.forEach(q => {
        if (q.answer) q.answer = q.answer.toString().trim().toUpperCase().charAt(0);
        if (!q.explanation) q.explanation = '';
    });

    const quizState = { questions, index: 0, score: 0, timer: null, timeLeft: 30 };
    const quizId = 'quiz-' + Date.now();

    const wrapper = document.createElement('div');
    wrapper.className = 'message ai';
    wrapper.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content" style="width:100%;padding:0;background:none;border:none;">
            <div id="${quizId}" class="quiz-container"></div>
        </div>`;
    chatContainer.appendChild(wrapper);
    renderQuizQuestion(quizState, quizId);
    scrollToBottom();
}

function renderQuizQuestion(quizState, quizId) {
    const box = document.getElementById(quizId);
    if (!box) return;
    const q = quizState.questions[quizState.index];
    quizState.timeLeft = 30;
    if (quizState.timer) clearInterval(quizState.timer);

    const pct = ((quizState.index) / quizState.questions.length) * 100;

    box.innerHTML = `
        <div class="quiz-header">
            <div class="quiz-progress">Question <strong>${quizState.index + 1}</strong> of ${quizState.questions.length}</div>
            <div class="quiz-timer" id="${quizId}-timer"><i class="fas fa-clock"></i> <span>30s</span></div>
        </div>
        <div class="quiz-progress-track"><div class="quiz-progress-bar" style="width:${pct}%"></div></div>
        <div class="quiz-question">${escapeHtml(q.question)}</div>
        <div class="quiz-options">
            ${q.options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        return `<button class="quiz-option" data-letter="${letter}">
                    <div class="option-letter">${letter}</div>
                    <span>${escapeHtml(opt)}</span>
                </button>`;
    }).join('')}
        </div>
        <div class="quiz-feedback-area" style="display:none;"></div>
        <button class="quiz-next-btn" style="display:none;">
            ${quizState.index < quizState.questions.length - 1 ? 'Next Question →' : 'See Results 🎉'}
        </button>
    `;

    // Attach click handlers
    box.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', function () {
            onQuizAnswer(quizState, quizId, this);
        });
    });

    // Start 30s countdown
    const timerSpan = document.querySelector(`#${quizId}-timer span`);
    quizState.timer = setInterval(() => {
        quizState.timeLeft--;
        if (timerSpan) timerSpan.textContent = quizState.timeLeft + 's';
        if (quizState.timeLeft <= 5 && timerSpan) timerSpan.parentElement.classList.add('danger');
        if (quizState.timeLeft <= 0) {
            clearInterval(quizState.timer);
            onQuizTimeout(quizState, quizId);
        }
    }, 1000);
}

function onQuizAnswer(quizState, quizId, clickedBtn) {
    if (quizState.timer) clearInterval(quizState.timer);
    const box = document.getElementById(quizId);
    if (!box) return;

    const q = quizState.questions[quizState.index];
    const chosen = clickedBtn.dataset.letter;
    const correct = q.answer;
    const isRight = chosen === correct;

    if (isRight) quizState.score++;

    // Disable all options and highlight
    box.querySelectorAll('.quiz-option').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
        const l = btn.dataset.letter;
        if (l === correct) btn.classList.add('correct');
        else if (l === chosen && !isRight) btn.classList.add('wrong');
    });

    // Show feedback
    const fb = box.querySelector('.quiz-feedback-area');
    fb.style.display = 'block';
    fb.className = 'quiz-feedback-area ' + (isRight ? 'feedback-correct' : 'feedback-wrong');
    fb.innerHTML = `
        <div class="feedback-icon">${isRight ? '✅' : '❌'}</div>
        <div class="feedback-text">
            <strong>${isRight ? 'Correct!' : 'Incorrect!'}</strong>
            The answer is <strong>${correct}</strong>.
            ${q.explanation ? `<br><em>${escapeHtml(q.explanation)}</em>` : ''}
        </div>
    `;

    // Show next button
    const nextBtn = box.querySelector('.quiz-next-btn');
    nextBtn.style.display = 'block';
    nextBtn.onclick = () => {
        quizState.index++;
        if (quizState.index < quizState.questions.length) {
            renderQuizQuestion(quizState, quizId);
        } else {
            renderQuizResults(quizState, quizId);
        }
        scrollToBottom();
    };
    scrollToBottom();
}

function onQuizTimeout(quizState, quizId) {
    const box = document.getElementById(quizId);
    if (!box) return;
    const q = quizState.questions[quizState.index];

    box.querySelectorAll('.quiz-option').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
        if (btn.dataset.letter === q.answer) btn.classList.add('correct');
    });

    const fb = box.querySelector('.quiz-feedback-area');
    fb.style.display = 'block';
    fb.className = 'quiz-feedback-area feedback-wrong';
    fb.innerHTML = `
        <div class="feedback-icon">⏱️</div>
        <div class="feedback-text">
            <strong>Time's up!</strong> The answer was <strong>${q.answer}</strong>.
            ${q.explanation ? `<br><em>${escapeHtml(q.explanation)}</em>` : ''}
        </div>
    `;

    const nextBtn = box.querySelector('.quiz-next-btn');
    nextBtn.style.display = 'block';
    nextBtn.onclick = () => {
        quizState.index++;
        if (quizState.index < quizState.questions.length) {
            renderQuizQuestion(quizState, quizId);
        } else {
            renderQuizResults(quizState, quizId);
        }
        scrollToBottom();
    };
    scrollToBottom();
}

function renderQuizResults(quizState, quizId) {
    const box = document.getElementById(quizId);
    if (!box) return;
    const total = quizState.questions.length;
    const score = quizState.score;
    const pct = Math.round((score / total) * 100);
    let msg = '', emoji = '';

    if (pct === 100) { msg = 'Perfect Score! You\'re a genius! 🧠'; emoji = '🏆'; }
    else if (pct >= 80) { msg = 'Excellent work! Almost perfect!'; emoji = '🌟'; }
    else if (pct >= 60) { msg = 'Good job! Keep studying!'; emoji = '👍'; }
    else if (pct >= 40) { msg = 'Not bad, but room for improvement.'; emoji = '📖'; }
    else { msg = 'Keep practicing, you\'ll get there!'; emoji = '💪'; }

    box.innerHTML = `
        <div class="quiz-results">
            <div class="results-emoji">${emoji}</div>
            <h3>Quiz Complete!</h3>
            <div class="results-score-circle">
                <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="${pct >= 60 ? '#10b981' : '#ef4444'}" 
                        stroke-width="8" stroke-dasharray="${pct * 3.39} 339.29"
                        stroke-linecap="round" transform="rotate(-90 60 60)"
                        style="transition: stroke-dasharray 1s ease;"/>
                </svg>
                <div class="score-text">${score}/${total}</div>
            </div>
            <p class="results-pct">${pct}%</p>
            <p class="results-msg">${msg}</p>
        </div>
    `;
    scrollToBottom();
}

// ==================== FLASHCARD RENDERER ====================
function renderFlashcards(content) {
    let cards = [];
    try {
        if (typeof content === 'string') {
            const clean = content.replace(/```json\s*|\s*```/g, '').trim();
            const start = clean.indexOf('[');
            const end = clean.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                cards = JSON.parse(clean.substring(start, end + 1));
            } else {
                cards = parseQuestions(content);
            }
        } else if (Array.isArray(content)) {
            cards = content;
        }
    } catch (e) {
        console.error("Flashcard JSON parse failed:", e);
        cards = parseQuestions(content);
    }

    if (!cards || !cards.length) {
        renderMarkdown(typeof content === 'string' ? content : 'Could not generate flashcards.');
        return;
    }

    // Normalize cards — resolve answer letters to actual option text
    cards.forEach(c => {
        // Handle term/definition format
        if (c.term && !c.question) { c.question = c.term; }
        if (c.definition && !c.explanation) { c.explanation = c.definition; }
        if (c.front && !c.question) { c.question = c.front; }
        if (c.back && !c.explanation) { c.explanation = c.back; }

        // Resolve answer: if it's a single letter like "B", find the matching option
        if (c.answer && c.options && c.options.length > 0) {
            const letter = c.answer.toString().trim().toUpperCase().charAt(0);
            const idx = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            if (idx >= 0 && idx < c.options.length) {
                c.answerText = c.options[idx];
            } else {
                c.answerText = c.answer;
            }
        } else if (c.answer) {
            c.answerText = c.answer;
        } else {
            c.answerText = c.explanation || 'See explanation';
        }
        if (!c.explanation) c.explanation = '';
        if (!c.question) c.question = 'Flashcard';
    });

    const fcState = { cards, index: 0, score: 0, answered: false };
    const fcId = 'fc-' + Date.now();

    const wrapper = document.createElement('div');
    wrapper.className = 'message ai';
    wrapper.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content" style="width:100%;padding:0;background:none;border:none;">
            <div id="${fcId}" class="fc-game"></div>
        </div>`;
    chatContainer.appendChild(wrapper);
    renderFlashcard(fcState, fcId);
    scrollToBottom();
}

function renderFlashcard(fcState, fcId) {
    const box = document.getElementById(fcId);
    if (!box) return;
    const card = fcState.cards[fcState.index];
    fcState.answered = false;

    box.innerHTML = `
        <div class="fc-header">
            <span class="fc-counter"><i class="fas fa-layer-group"></i> Card ${fcState.index + 1} of ${fcState.cards.length}</span>
            <span class="fc-score"><i class="fas fa-star" style="color:#f59e0b;"></i> ${fcState.score} pts</span>
        </div>
        <div class="fc-card-wrapper" id="${fcId}-card">
            <div class="fc-card">
                <div class="fc-front">
                    <div class="fc-label">QUESTION</div>
                    <div class="fc-question">${escapeHtml(card.question)}</div>
                    <div class="fc-hint">👆 Tap the card to reveal the answer</div>
                </div>
                <div class="fc-back">
                    <div class="fc-label" style="color:var(--success);">ANSWER</div>
                    <div class="fc-answer">${escapeHtml(card.answerText)}</div>
                    ${card.explanation ? `<div class="fc-explanation">${escapeHtml(card.explanation)}</div>` : ''}
                    <div class="fc-self-check">
                        <p>Did you know this?</p>
                        <div class="fc-check-btns">
                            <button class="fc-btn-yes" data-correct="yes">✅ I knew it!</button>
                            <button class="fc-btn-no" data-correct="no">❌ I didn't know</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="fc-nav">
            <button class="fc-nav-btn fc-prev" ${fcState.index === 0 ? 'disabled' : ''}><i class="fas fa-arrow-left"></i> Previous</button>
            <button class="fc-nav-btn fc-next">${fcState.index < fcState.cards.length - 1 ? 'Skip →' : 'Finish 🎉'}</button>
        </div>
        <div class="fc-progress-track"><div class="fc-progress-bar" style="width:${((fcState.index) / fcState.cards.length) * 100}%"></div></div>
    `;

    // Flip on card click
    const cardWrapper = document.getElementById(`${fcId}-card`);
    cardWrapper.addEventListener('click', (e) => {
        if (!e.target.closest('.fc-check-btns')) {
            cardWrapper.classList.toggle('flipped');
        }
    });

    // Self-check buttons
    box.querySelectorAll('.fc-check-btns button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (fcState.answered) return;
            fcState.answered = true;
            if (btn.dataset.correct === 'yes') fcState.score++;
            btn.classList.add('selected');
            box.querySelectorAll('.fc-check-btns button').forEach(b => b.disabled = true);
            // Auto-advance after 1 second
            setTimeout(() => {
                fcState.index++;
                if (fcState.index < fcState.cards.length) renderFlashcard(fcState, fcId);
                else renderFCResults(fcState, fcId);
            }, 800);
        });
    });

    // Navigation
    const prevBtn = box.querySelector('.fc-prev');
    const nextBtn = box.querySelector('.fc-next');

    prevBtn.addEventListener('click', () => {
        if (fcState.index > 0) {
            fcState.index--;
            renderFlashcard(fcState, fcId);
        }
    });

    nextBtn.addEventListener('click', () => {
        fcState.index++;
        if (fcState.index < fcState.cards.length) renderFlashcard(fcState, fcId);
        else renderFCResults(fcState, fcId);
    });

    scrollToBottom();
}

function renderFCResults(fcState, fcId) {
    const box = document.getElementById(fcId);
    if (!box) return;
    const total = fcState.cards.length;

    box.innerHTML = `
        <div class="quiz-results">
            <div class="results-emoji">🃏</div>
            <h3>Flashcard Session Complete!</h3>
            <div class="results-score-circle">
                <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#8b5cf6" 
                        stroke-width="8" stroke-dasharray="${Math.round((fcState.score / total) * 339.29)} 339.29"
                        stroke-linecap="round" transform="rotate(-90 60 60)"
                        style="transition: stroke-dasharray 1s ease;"/>
                </svg>
                <div class="score-text">${fcState.score}/${total}</div>
            </div>
            <p class="results-msg">You knew ${fcState.score} out of ${total} cards!</p>
        </div>
    `;
    scrollToBottom();
}

// ==================== HISTORY ====================
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffDay > 7) return date.toLocaleDateString();
    if (diffDay > 0) return diffDay + 'd ago';
    if (diffHr > 0) return diffHr + 'h ago';
    if (diffMin > 0) return diffMin + 'm ago';
    return 'Just now';
}

async function loadChatHistory() {
    try {
        const res = await fetch('/api/chat/history');
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
            historyList.innerHTML = data.sessions.map(s => `
                <div class="history-item ${s.sessionId === currentSessionId ? 'active' : ''}" data-id="${s.sessionId}">
                    <i class="fas fa-comment-dots"></i>
                    <div class="history-content">
                        <div class="history-title">${escapeHtml(s.title || 'Untitled Session')}</div>
                        <div class="history-meta">
                            <span>${timeAgo(s.updatedAt || s.createdAt)}</span>
                            ${s.messageCount ? `<span class="msg-count"><i class="fas fa-comment"></i> ${s.messageCount}</span>` : ''}
                        </div>
                        ${s.preview ? `<div class="history-preview">${escapeHtml(s.preview)}</div>` : ''}
                    </div>
                </div>`).join('');
            historyList.querySelectorAll('.history-item').forEach(el => {
                el.addEventListener('click', () => {
                    loadSession(el.dataset.id);
                    if (window.innerWidth <= 768) sidebar.classList.remove('open');
                });
            });
        } else {
            historyList.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-inbox"></i>
                    No sessions yet.<br>Start a conversation to see your history here.
                </div>`;
        }
    } catch { }
}

async function loadSession(sid) {
    const res = await fetch(`/api/chat/session/${sid}`);
    const data = await res.json();
    if (data.messages) {
        currentSessionId = data.sessionId;
        chatContainer.innerHTML = '';
        data.messages.forEach(m => {
            if (m.role === 'user') addUserMessage(m.content);
            else renderMarkdown(m.content);
        });
        loadChatHistory();
    }
}