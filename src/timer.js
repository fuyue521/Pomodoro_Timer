export function createTimer(onTick, onComplete) {
  let totalMs = 25 * 60 * 1000;
  let remainingMs = totalMs;
  let running = false;
  let startTime = 0;
  let lastDisplayedSec = -1;

  function tick() {
    if (!running) return;

    const elapsed = Date.now() - startTime;
    const newRemaining = Math.max(0, totalMs - elapsed);
    const currentSec = Math.ceil(newRemaining / 1000);

    if (currentSec !== lastDisplayedSec) {
      lastDisplayedSec = currentSec;
      const totalSec = Math.ceil(totalMs / 1000);
      onTick(currentSec, totalSec);
    }

    remainingMs = newRemaining;

    if (remainingMs <= 0) {
      running = false;
      remainingMs = 0;
      onComplete();
    }
  }

  function start() {
    if (running) return;
    if (remainingMs <= 0) remainingMs = totalMs;
    startTime = Date.now() - (totalMs - remainingMs);
    running = true;
    lastDisplayedSec = Math.ceil(remainingMs / 1000);
  }

  function pause() {
    if (!running) return;
    running = false;
    remainingMs = Math.max(0, totalMs - (Date.now() - startTime));
  }

  function reset() {
    running = false;
    remainingMs = totalMs;
    lastDisplayedSec = -1;
    const totalSec = Math.ceil(totalMs / 1000);
    onTick(totalSec, totalSec);
  }

  function setDuration(minutes) {
    totalMs = minutes * 60 * 1000;
    remainingMs = totalMs;
    running = false;
    lastDisplayedSec = -1;
    const totalSec = Math.ceil(totalMs / 1000);
    onTick(totalSec, totalSec);
  }

  function isRunning() {
    return running;
  }

  function getRemainingMs() {
    if (running) {
      return Math.max(0, totalMs - (Date.now() - startTime));
    }
    return remainingMs;
  }

  function getTotalMs() {
    return totalMs;
  }

  return { tick, start, pause, reset, setDuration, isRunning, getRemainingMs, getTotalMs };
}
