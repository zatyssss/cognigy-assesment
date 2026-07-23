/* ===========================================================
   CONFIG
   =========================================================== */
const QUESTIONS_PER_PARTICIPANT = 50;
const DURATION_MINUTES = 60;
const PASSING_PERCENT = 80;

/* ===========================================================
   STATE
   =========================================================== */
let fullBank = [];
let session = null; // {questions, current, answers, endTime}
let timerInterval = null;

const app = document.getElementById('app');
const timerBadge = document.getElementById('timer-badge');

/* ===========================================================
   UTILITIES
   =========================================================== */
function esc(s){
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
// Fisher-Yates shuffle
function shuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fmtTime(totalSeconds){
  totalSeconds = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

/* ===========================================================
   LOAD QUESTIONS
   =========================================================== */
async function loadBank(){
  try{
    const res = await fetch('questions.json');
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if(!Array.isArray(data) || data.length === 0) throw new Error('questions.json is empty.');
    fullBank = data;
    renderStart(null);
  }catch(err){
    renderStart('Could not load questions.json (' + err.message + '). If you opened this file directly from your computer, run a local server instead (e.g. "python3 -m http.server") or deploy it to GitHub Pages \u2014 browsers block loading local JSON files directly.');
  }
}

/* ===========================================================
   START SCREEN
   =========================================================== */
function renderStart(loadError){
  const ready = fullBank.length > 0;
  app.innerHTML = `
    <div class="start-card">
      <h1>Cognigy Assessment</h1>
     <p class="desc"></p>
      <div class="meta-row">
        <span class="meta-pill">${DURATION_MINUTES} min</span>
        <span class="meta-pill">${QUESTIONS_PER_PARTICIPANT} questions</span>
        <span class="meta-pill">${PASSING_PERCENT}% to pass</span>
      </div>
      <div class="field">
        <label for="name-input">Your name</label>
        <input type="text" id="name-input" placeholder="e.g. Alex Rivera" maxlength="60">
      </div>
      <button class="btn btn-primary" id="start-btn" ${ready ? '' : 'disabled'}>Start Cognigy Assessment</button>
      ${loadError ? `<p class="load-msg err">${esc(loadError)}</p>` : ''}
    </div>
  `;
  const nameInput = document.getElementById('name-input');
  const startBtn = document.getElementById('start-btn');
  const go = () => {
    const name = nameInput.value.trim();
    if(!name){ nameInput.focus(); return; }
    startQuiz(name);
  };
  startBtn.onclick = go;
  nameInput.addEventListener('keydown', e => { if(e.key === 'Enter') go(); });
}

/* ===========================================================
   START QUIZ
   =========================================================== */
function startQuiz(name){
  const count = Math.min(QUESTIONS_PER_PARTICIPANT, fullBank.length);
  const picked = shuffle(fullBank).slice(0, count);

  const questions = picked.map(q => {
    const order = shuffle(q.options.map((_, i) => i));
    const options = order.map(i => q.options[i]);
    const answer = order.indexOf(q.answer);
    return {
      question: q.question,
      options,
      answer,
      explanation: q.explanation || ''
    };
  });

  session = {
    name,
    questions,
    current: 0,
    answers: {},
    startTime: Date.now(),
    endTime: Date.now() + DURATION_MINUTES * 60 * 1000,
    submitted: false
  };

  timerBadge.classList.remove('hidden');
  startTimer();
  renderQuiz();
}

/* ===========================================================
   TIMER
   =========================================================== */
function startTimer(){
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if(!session || session.submitted) return;
    const remaining = (session.endTime - Date.now()) / 1000;
    timerBadge.textContent = fmtTime(remaining);
    timerBadge.classList.toggle('low', remaining <= 300);
    if(remaining <= 0){
      clearInterval(timerInterval);
      submitQuiz(true);
    }
  }, 1000);
}

/* ===========================================================
   QUIZ SCREEN
   =========================================================== */
function renderQuiz(){
  const s = session;
  const total = s.questions.length;
  const q = s.questions[s.current];
  const answeredCount = Object.keys(s.answers).length;

  const segs = s.questions.map((_, i) => `<div class="progress-seg ${s.answers[i] !== undefined ? 'done' : ''}"></div>`).join('');

  const optionsHtml = q.options.map((opt, i) => {
    const selected = s.answers[s.current] === i;
    return `<div class="option ${selected ? 'selected' : ''}" data-oi="${i}">
      <div class="option-letter">${String.fromCharCode(65 + i)}</div>
      <div class="option-text">${esc(opt)}</div>
    </div>`;
  }).join('');

  app.innerHTML = `
    <div class="progress-row">
      <div class="progress-track">${segs}</div>
      <div class="progress-label">${answeredCount} / ${total}</div>
    </div>
    <div class="q-card">
      <div class="q-eyebrow">Question ${s.current + 1} of ${total}</div>
      <p class="q-text">${esc(q.question)}</p>
      ${optionsHtml}
      <div class="nav-row">
        <button class="btn btn-outline" id="prev-btn" ${s.current === 0 ? 'disabled' : ''}>\u2190 Previous</button>
        ${s.current < total - 1
          ? `<button class="btn btn-primary" id="next-btn">Next \u2192</button>`
          : `<button class="btn btn-primary" id="submit-btn">Submit Assessment</button>`}
      </div>
    </div>
  `;

  app.querySelectorAll('.option').forEach(el => {
    el.onclick = () => {
      s.answers[s.current] = parseInt(el.dataset.oi, 10);
      renderQuiz();
    };
  });
  document.getElementById('prev-btn').onclick = () => {
    if(s.current > 0){ s.current--; renderQuiz(); }
  };
  const nextBtn = document.getElementById('next-btn');
  if(nextBtn) nextBtn.onclick = () => {
    if(s.current < total - 1){ s.current++; renderQuiz(); }
  };
  const submitBtn = document.getElementById('submit-btn');
  if(submitBtn) submitBtn.onclick = () => {
    const unanswered = total - Object.keys(s.answers).length;
    const msg = unanswered > 0
      ? `${unanswered} question(s) are unanswered. Submit anyway?`
      : `Submit your final answers?`;
    if(confirm(msg)) submitQuiz(false);
  };
}

/* ===========================================================
   SUBMIT + SCORE
   =========================================================== */
function submitQuiz(autoSubmitted){
  const s = session;
  if(s.submitted) return;
  s.submitted = true;
  clearInterval(timerInterval);

  let correct = 0;
  const detail = s.questions.map((q, i) => {
    const selIdx = s.answers[i];
    const isCorrect = selIdx === q.answer;
    if(isCorrect) correct++;
    return {
      question: q.question,
      selectedText: selIdx !== undefined ? q.options[selIdx] : null,
      correctText: q.options[q.answer],
      isCorrect,
      explanation: q.explanation
    };
  });

  const total = s.questions.length;
  const unanswered = total - Object.keys(s.answers).length;
  const wrong = total - correct - unanswered;
  const percentage = Math.round((correct / total) * 1000) / 10;
  const passed = percentage >= PASSING_PERCENT;
  const timeTakenSec = Math.round((Date.now() - s.startTime) / 1000);

  renderResult({ correct, wrong, unanswered, total, percentage, passed, timeTakenSec, autoSubmitted, detail });
}

/* ===========================================================
   RESULT SCREEN
   =========================================================== */
function renderResult(r){
  timerBadge.classList.add('hidden');
  app.innerHTML = `
    <div class="result-card">
      <div class="score-ring ${r.passed ? 'pass' : 'fail'}">
        <div class="pct">${r.percentage}%</div>
        <div class="lbl">${r.passed ? 'Passed' : 'Not passed'}</div>
      </div>
      <h2>${esc(session.name)}</h2>
      <p style="color:var(--muted);font-size:13px;margin-top:6px;">${r.autoSubmitted ? 'Auto-submitted when time expired' : 'Submitted manually'}</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="n">${r.correct}</div><div class="l">Correct</div></div>
        <div class="stat-box"><div class="n">${r.wrong}</div><div class="l">Wrong</div></div>
        <div class="stat-box"><div class="n">${r.unanswered}</div><div class="l">Unanswered</div></div>
      </div>
      <p style="color:var(--muted);font-size:12.5px;">Time taken: ${fmtTime(r.timeTakenSec)}</p>
      <div class="review-list" id="review-list"></div>
    </div>
  `;
  const list = document.getElementById('review-list');
  list.innerHTML = r.detail.map((d, i) => `
    <div class="review-item ${d.isCorrect ? 'correct' : 'incorrect'}">
      <span class="review-badge ${d.isCorrect ? 'correct' : 'incorrect'}">${d.isCorrect ? 'Correct' : 'Incorrect'}</span>
      <p class="review-q">${i + 1}. ${esc(d.question)}</p>
      <p class="review-line"><b>Your answer:</b> ${esc(d.selectedText || '(no answer)')}</p>
      ${!d.isCorrect ? `<p class="review-line"><b>Correct answer:</b> ${esc(d.correctText)}</p>` : ''}
      ${d.explanation ? `<p class="review-expl">${esc(d.explanation)}</p>` : ''}
    </div>
  `).join('');
}

/* ===========================================================
   INIT
   =========================================================== */
loadBank();
