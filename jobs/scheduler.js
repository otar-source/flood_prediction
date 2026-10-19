// jobs/scheduler.js
// Simple in-process scheduler. Runs a full prediction every 30 minutes.
// Uses a lock flag to prevent overlapping runs.
// For production, prefer a dedicated job queue (BullMQ, Agenda, node-cron, etc.).

const { runFullPrediction } = require('../services/predictionEngine');

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
let isRunning = false;
let timerHandle = null;

async function safeRun(reason) {
  if (isRunning) {
    console.log(`[scheduler] Skipping run (${reason}) – previous run still in progress.`);
    return;
  }
  isRunning = true;
  console.log(`[scheduler] Starting prediction run (${reason}) at ${new Date().toISOString()}`);
  try {
    const summary = await runFullPrediction();
    console.log(
      `[scheduler] Finished: ${summary.succeeded}/${summary.total} ok, ${summary.failed} failed.`
    );
  } catch (err) {
    console.error('[scheduler] Prediction run crashed:', err.message);
  } finally {
    isRunning = false;
  }
}

function startScheduler() {
  if (timerHandle) return; // already started

  // Kick off one run shortly after boot (5 s) so there is fresh data
  setTimeout(() => safeRun('initial boot'), 5000);

  timerHandle = setInterval(() => safeRun('interval 30m'), INTERVAL_MS);
  console.log('[scheduler] Enabled – predictions will run every 30 minutes.');
}

function stopScheduler() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
    console.log('[scheduler] Stopped.');
  }
}

module.exports = { startScheduler, stopScheduler };