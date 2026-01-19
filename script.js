const textEl = document.getElementById("text-element");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const timerContainer = document.getElementById("timer-container");
const timerDisplay = document.getElementById("timer");
const editBox = document.getElementById("editBox");

const setAudio = new Audio("set.mp3");
const pistolAudio = new Audio("pistol.mp3");

let timerInterval = null;
let paused = false;
let startTime = 0;
let elapsed = 0;

const defaults = {
  minSet: 1000,
  maxSet: 3000
};

let audioCtx = null;
let analyser = null;
let source = null;
let data = null;

function initAudioContext() {
  if (audioCtx) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  source = audioCtx.createMediaElementSource(pistolAudio);
  analyser = audioCtx.createAnalyser();

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  analyser.fftSize = 2048;
  data = new Uint8Array(analyser.fftSize);
}

function format(ms) {
  const cs = Math.floor((ms % 1000) / 10);
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return (
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0") + ":" +
    String(cs).padStart(2, "0")
  );
}

function randDelay(min, max) {
  return Math.random() * (max - min) + min;
}

function getNumberOr(def, val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : def;
}

function saveTimes() {
  localStorage.setItem("t5", document.getElementById("t5").value);
  localStorage.setItem("t6", document.getElementById("t6").value);
}

document.getElementById("t5").value = localStorage.getItem("t5") || "";
document.getElementById("t6").value = localStorage.getItem("t6") || "";

function updateTimer() {
  if (!paused) {
    const now = audioCtx.currentTime * 1000;
    elapsed = now - startTime;
    timerDisplay.textContent = format(elapsed);
  }
}

async function warmUpAudio(audio) {
  audio.volume = 0;
  try { await audio.play(); } catch {}
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;
}

async function runSequence() {
  startBtn.disabled = true;
  startBtn.style.cursor = "not-allowed";
  editBox.style.display = "none";

  textEl.style.display = "block";
  textEl.textContent = "Set";

  await setAudio.play().catch(() => {});

  const min = getNumberOr(defaults.minSet, document.getElementById("t5").value);
  const max = getNumberOr(defaults.maxSet, document.getElementById("t6").value);

  await new Promise(r => setTimeout(r, randDelay(min, max)));

  textEl.style.display = "none";
  timerContainer.style.display = "block";

  pistolAudio.currentTime = 0;
  pistolAudio.play().catch(() => {});

  if (navigator.vibrate) navigator.vibrate(30);

  function detectSound() {
    analyser.getByteTimeDomainData(data);
    let maxVal = 0;
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i] - 128);
      if (v > maxVal) maxVal = v;
    }
    if (maxVal > 5) {
      startTime = audioCtx.currentTime * 1000;
      timerInterval = setInterval(updateTimer, 10);
    } else {
      requestAnimationFrame(detectSound);
    }
  }

  detectSound();
}

function autoPauseOnUserAction() {
  if (!paused && timerInterval !== null) {
    paused = true;
    pauseBtn.textContent = "Resume";
    setAudio.pause();
    pistolAudio.pause();
    clearInterval(timerInterval);
  }
}

pauseBtn.addEventListener("click", () => {
  if (!paused) {
    paused = true;
    pauseBtn.textContent = "Resume";
    setAudio.pause();
    pistolAudio.pause();
    clearInterval(timerInterval);
  } else {
    paused = false;
    pauseBtn.textContent = "Pause";
    startTime = audioCtx.currentTime * 1000 - elapsed;
    setAudio.play().catch(() => {});
    pistolAudio.play().catch(() => {});
    timerInterval = setInterval(updateTimer, 10);
  }
});

stopBtn.addEventListener("click", () => {
  clearInterval(timerInterval);
  timerInterval = null;
  elapsed = 0;
  paused = false;
  timerDisplay.textContent = "00:00:00.00";
  timerContainer.style.display = "none";
  textEl.style.display = "block";
  textEl.textContent = "";
  startBtn.disabled = false;
  startBtn.style.cursor = "pointer";
  pauseBtn.textContent = "Pause";
  editBox.style.display = "block";
  setAudio.pause();
  setAudio.currentTime = 0;
  pistolAudio.pause();
  pistolAudio.currentTime = 0;
});

startBtn.addEventListener("click", async () => {
  initAudioContext();
  if (audioCtx.state === "suspended") await audioCtx.resume();

  elapsed = 0;
  paused = false;
  timerDisplay.textContent = "00:00:00.00";

  await warmUpAudio(pistolAudio);
  await runSequence();
});

["click", "keydown", "touchstart"].forEach(evt => {
  window.addEventListener(evt, () => {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }, { once: true });
});

window.addEventListener("keydown", autoPauseOnUserAction);
[startBtn, stopBtn, pauseBtn].forEach(btn => {
  btn.addEventListener("click", autoPauseOnUserAction);
});
