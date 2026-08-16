const Booking = require("../models/Booking");
const { now, buildBookingMessages, ctype } = require("../services/runway.service");

async function runScheduler() {
  const bookings = await Booking.find({
    status: { $nin: ["cancelled", "no-show"] },
  });
  let fired = 0;
  for (const b of bookings) {
    let changed = false;
    for (const m of b.msgs || []) {
      if (!m.sent && new Date(m.due).getTime() <= now()) {
        m.sent = new Date();
        fired++;
        changed = true;
      }
    }
    if (changed) await b.save();
  }
  if (fired) console.log(`[worker] marked ${fired} booking messages sent`);
}

function startRunwayWorker() {
  setInterval(() => {
    runScheduler().catch((e) => console.error("[worker]", e.message));
  }, 60000);
  console.log("[worker] runway scheduler started (60s interval)");
}

module.exports = { startRunwayWorker, runScheduler };
