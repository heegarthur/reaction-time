const setAudio = new Audio(setFile);
const pistolAudio = new Audio(pistolFile);

let timerInterval = null;
let paused = false;
let startTime = 0;
let elapsed = 0;

// AudioContext voor analyse
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const source = audioCtx.createMediaElementSource(pistolAudio);
const analyser = audioCtx.createAnalyser();
source.connect(analyser);
analyser.connect(audioCtx.destination);

const data = new Uint8Array(analyser.fftSize);

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
  pistolAudio.play();

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

    // pauzeer audio ook
    setAudio.pause();
    pistolAudio.pause();

    clearInterval(timerInterval);
  }
}

pauseBtn.addEventListener("click", () => {
  if (!paused) {
    // Pauzeren
    paused = true;
    pauseBtn.textContent = "Resume";

    setAudio.pause();
    pistolAudio.pause();

    clearInterval(timerInterval);
  } else {
    // Hervatten
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

  // Reset audio
  setAudio.pause();
  setAudio.currentTime = 0;
  pistolAudio.pause();
  pistolAudio.currentTime = 0;
});

startBtn.addEventListener("click", async () => {
  elapsed = 0;
  paused = false;
  timerDisplay.textContent = "00:00:00.00";

  if (audioCtx.state === "suspended") await audioCtx.resume();

  await warmUpAudio(pistolAudio);

  await runSequence();
});

window.addEventListener("keydown", autoPauseOnUserAction);
[startBtn, stopBtn, pauseBtn].forEach(btn => {
  btn.addEventListener("click", autoPauseOnUserAction);
});
