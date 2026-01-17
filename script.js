const textEl = document.getElementById("text-element");
const startBtn = document.getElementById("start-btn");
const timerContainer = document.getElementById("timer-container");
const timerDisplay = document.getElementById("timer");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const editBox = document.getElementById("editBox");

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function getNumberOr(def, v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

const defaults = { minSet: 3000, maxSet: 6000 };

document.getElementById("t5").value = getNumberOr(defaults.minSet, localStorage.getItem("minSet"));
document.getElementById("t6").value = getNumberOr(defaults.maxSet, localStorage.getItem("maxSet"));

const setFile = "set.mp3";
const pistolFile = "pistol.mp3";

let timerInterval = null;
let paused = false;
let startTime = 0;
let elapsed = 0;

function randDelay(min, max) {
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function format(ms) {
  const total = ms / 1000;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const c = Math.floor((ms % 1000) / 10);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(c).padStart(2,"0")}`;
}

function updateTimer() {
  if (!paused) {
    const now = audioCtx.currentTime * 1000;
    elapsed = now - startTime;
    timerDisplay.textContent = format(elapsed);
  }
}

async function warmUpAudio(audio) {
  audio.volume = 0;
  try {
    await audio.play();
  } catch {}
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;
}

async function runSequence(setAudio, pistolAudio) {
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

  const source = audioCtx.createMediaElementSource(pistolAudio);
  const analyser = audioCtx.createAnalyser();
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  const data = new Uint8Array(analyser.fftSize);

  pistolAudio.play();

  if (navigator.vibrate) navigator.vibrate(30);

  function detectSound() {
    analyser.getByteTimeDomainData(data);
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i] - 128);
      if (v > max) max = v;
    }
    if (max > 5) {
      startTime = audioCtx.currentTime * 1000;
      timerInterval = setInterval(updateTimer, 10);
    } else {
      requestAnimationFrame(detectSound);
    }
  }
  detectSound();
}

// Pauzeer timer bij user actie (toets of klik op start/stop/pause)
function autoPauseOnUserAction() {
  if (!paused && timerInterval !== null) {
    paused = true;
    pauseBtn.textContent = "Resume";
  }
}

window.addEventListener("keydown", autoPauseOnUserAction);

[startBtn, stopBtn, pauseBtn].forEach(btn => {
  btn.addEventListener("click", autoPauseOnUserAction);
});

pauseBtn.addEventListener("click", () => {
  paused = !paused;
  if (paused) {
    pauseBtn.textContent = "Resume";
  } else {
    startTime = audioCtx.currentTime * 1000 - elapsed;
    pauseBtn.textContent = "Pause";
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
});

startBtn.addEventListener("click", async () => {
  elapsed = 0;
  paused = false;
  timerDisplay.textContent = "00:00:00.00";

  const setAudio = new Audio(setFile);
  const pistolAudio = new Audio(pistolFile);

  if (audioCtx.state === "suspended") await audioCtx.resume();

  await warmUpAudio(pistolAudio);

  await runSequence(setAudio, pistolAudio);
});

function saveTimes() {
  localStorage.setItem("minSet", document.getElementById("t5").value);
  localStorage.setItem("maxSet", document.getElementById("t6").value);
}
