const Booking = require("../models/Booking");
const Lead = require("../models/Lead");
const {
  enrichLead,
  ctype,
  buildBookingMessages,
  resolveOwnerForConsult,
  sameDay,
  now,
  HR,
  MIN,
  CONSULT_TYPES,
  OFFICES,
  HEARD,
  MSG_LABEL,
  fday,
  ftime,
} = require("../services/runway.service");
const { applyRmaRule } = require("../services/intake.service");

function enrichBooking(b) {
  const doc = b.toObject ? b.toObject() : { ...b };
  return {
    ...doc,
    id: doc._id?.toString?.() || doc.id,
    consultType: ctype(doc.type),
  };
}

async function bookingToLead(booking) {
  let lead = booking.email ? await Lead.findOne({ email: booking.email.toLowerCase() }) : null;
  if (!lead) {
    lead = await Lead.create({
      name: booking.name,
      email: booking.email,
      mobile: booking.mobile,
      source: "CTA banner",
      goal: "",
      occupation: booking.topic || "Consult booking",
      location: booking.office,
      status: "consult",
      owner: resolveOwnerForConsult(booking.type),
      contactedAt: new Date(),
      signals: [
        {
          type: "cta",
          detail: `Booked ${ctype(booking.type).name} via website${booking.heard ? " · heard via " + booking.heard : ""}`,
        },
      ],
      notes: [
        {
          text: `Booked: ${ctype(booking.type).name} · ${fday(booking.at)} ${ftime(booking.at)} (${booking.mode})`,
          at: new Date(),
        },
      ],
    });
  } else {
    applyRmaRule(lead, "consult");
    lead.owner = resolveOwnerForConsult(booking.type);
    if (!lead.contactedAt) lead.contactedAt = new Date();
    lead.notes.unshift({
      text: `Booked: ${ctype(booking.type).name} · ${fday(booking.at)} ${ftime(booking.at)} (${booking.mode})`,
      at: new Date(),
    });
    lead.signals.unshift({
      type: "cta",
      detail: `Booked ${ctype(booking.type).name} via website`,
    });
    await lead.save();
  }
  booking.leadId = lead._id;
  await booking.save();
  return lead;
}

exports.list = async (req, res) => {
  const bookings = await Booking.find().sort({ at: 1 }).lean();
  const enriched = bookings.map(enrichBooking);
  const today = enriched.filter(
    (b) => b.status === "confirmed" && sameDay(b.at, now())
  ).length;
  const upcoming = enriched.filter(
    (b) => b.status === "confirmed" && new Date(b.at).getTime() >= now() - 2 * HR
  );
  const past = enriched.filter(
    (b) =>
      new Date(b.at).getTime() < now() - 2 * HR ||
      ["completed", "no-show", "cancelled"].includes(b.status)
  );
  const remindersQueued = enriched.reduce(
    (a, b) =>
      a +
      (b.msgs || []).filter(
        (m) => !m.sent && !["cancelled", "no-show"].includes(b.status)
      ).length,
    0
  );
  const completed = enriched.filter((b) => ["completed", "no-show"].includes(b.status));
  const noshows = completed.filter((b) => b.status === "no-show").length;

  res.json({
    success: true,
    data: {
      bookings: enriched,
      today,
      upcoming,
      past,
      remindersQueued,
      noShowRate: completed.length ? Math.round((noshows / completed.length) * 100) : null,
      consultTypes: CONSULT_TYPES,
      offices: OFFICES,
      heard: HEARD,
      msgLabels: MSG_LABEL,
    },
  });
};

exports.create = async (req, res) => {
  const body = req.body || {};
  const t = ctype(body.type || "pr");
  const booking = await Booking.create({
    name: body.name,
    email: body.email,
    mobile: body.mobile || "",
    type: body.type || "pr",
    office: body.office || "Truganina",
    mode: body.mode || "Video",
    at: body.at ? new Date(body.at) : new Date(Date.now() + 86400000),
    topic: body.topic || "",
    heard: body.heard || "",
    vevo: body.vevo !== false,
    oaf: { status: t.fee > 0 ? "pending" : "optional", data: null },
    msgs: buildBookingMessages({ ...body, type: body.type || "pr", at: body.at }),
  });
  await bookingToLead(booking);
  res.status(201).json({ success: true, data: enrichBooking(booking) });
};

exports.update = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
  const body = req.body || {};
  if (body.status) booking.status = body.status;
  if (body.at) booking.at = new Date(body.at);
  await booking.save();
  res.json({ success: true, data: enrichBooking(booking) });
};

exports.comms = async (_req, res) => {
  const bookings = await Booking.find().lean();
  const rows = [];
  bookings.forEach((b) => {
    (b.msgs || []).forEach((m) => {
      rows.push({ booking: enrichBooking(b), message: m });
    });
  });
  rows.sort((a, b) => new Date(a.message.due) - new Date(b.message.due));
  res.json({ success: true, data: { queue: rows, msgLabels: MSG_LABEL } });
};

exports.submitOaf = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
  const data = req.body || {};
  const lead = await applyOafToBooking(booking, data);
  res.json({
    success: true,
    data: { booking: enrichBooking(booking), lead: lead ? enrichLead(lead) : null },
  });
};

/** Apply OAF payload onto booking + linked lead. Mutates and saves booking. */
async function applyOafToBooking(booking, data) {
  booking.oaf = { status: "completed", data };
  await booking.save();

  let lead = booking.leadId ? await Lead.findById(booking.leadId) : null;
  if (!lead && booking.email) lead = await Lead.findOne({ email: booking.email.toLowerCase() });
  if (lead) {
    if (data.subclass) lead.subclass = data.subclass === "none" ? "" : data.subclass;
    if (data.expiry) lead.expiry = new Date(data.expiry);
    if (data.goal) lead.goal = data.goal;
    if (data.occ) lead.occupation = data.occ;
    lead.signals.unshift({
      type: "gate",
      detail: `Completed pre-consult assessment${data.eng ? " · " + data.eng + " " + data.score : ""}`,
    });
    if (data.refusal === "Yes") {
      lead.notes.unshift({
        text: `⚠ PRIOR REFUSAL/CANCELLATION: ${data.refdet || "details at consult"}`,
        at: new Date(),
      });
    }
    if (data.history) {
      lead.notes.unshift({ text: `Assessment: ${data.history}`, at: new Date() });
    }
    await lead.save();
  }
  return lead;
}

/** Public: list pending pre-assessments for an email (no PII beyond booking meta). */
exports.publicPendingOaf = async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Enter a valid email address." });
  }

  const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const bookings = await Booking.find({
    email,
    status: "confirmed",
    "oaf.status": { $in: ["pending", "optional"] },
    at: { $gte: from },
  })
    .sort({ at: 1 })
    .limit(8)
    .lean();

  res.json({
    success: true,
    data: {
      bookings: bookings.map((b) => ({
        id: b._id.toString(),
        at: b.at,
        type: b.type,
        mode: b.mode,
        office: b.office,
        name: b.name,
        consultType: ctype(b.type),
        oafStatus: b.oaf?.status || "pending",
      })),
    },
  });
};

/**
 * Public pre-consult assessment — attaches to an existing booking (by id + email match,
 * or latest pending booking for that email). Shows as completed OAF on the booking in admin.
 */
exports.publicSubmitOaf = async (req, res) => {
  const body = req.body || {};
  if (body.company_website) {
    return res.json({ success: true, data: { ok: true, skipped: true } });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const bookingId = String(body.bookingId || "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter the email used for your booking." });
  }
  if (!body.subclass) {
    return res.status(400).json({ success: false, message: "Please select your current visa subclass." });
  }
  if (!body.refusal) {
    return res.status(400).json({ success: false, message: "Please confirm whether you have a prior refusal." });
  }
  if (body.docs !== true && body.docs !== "true") {
    return res.status(400).json({ success: false, message: "Please confirm you will bring your documents." });
  }

  let booking = null;
  if (bookingId) {
    booking = await Booking.findById(bookingId);
    if (!booking || String(booking.email || "").toLowerCase() !== email) {
      return res.status(404).json({
        success: false,
        message: "We could not match that booking to this email. Check the email on your confirmation.",
      });
    }
  } else {
    const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    booking = await Booking.findOne({
      email,
      status: "confirmed",
      "oaf.status": { $in: ["pending", "optional"] },
      at: { $gte: from },
    }).sort({ at: 1 });
  }

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "No upcoming booking found for this email. Book a consultation first, then complete this form.",
    });
  }

  if (booking.oaf?.status === "completed") {
    return res.status(409).json({
      success: false,
      message: "This assessment is already completed for your booking.",
    });
  }

  const data = {
    subclass: String(body.subclass || ""),
    expiry: String(body.expiry || ""),
    goal: String(body.goal || ""),
    occ: String(body.occ || ""),
    eng: String(body.eng || ""),
    score: String(body.score || ""),
    family: String(body.family || "Just me"),
    refusal: String(body.refusal || "No"),
    refdet: String(body.refdet || ""),
    history: String(body.history || ""),
    docs: true,
  };

  const lead = await applyOafToBooking(booking, data);
  const t = ctype(booking.type);

  res.json({
    success: true,
    data: {
      ok: true,
      bookingId: booking._id.toString(),
      at: booking.at,
      consultType: t,
      name: booking.name,
      leadUpdated: Boolean(lead),
    },
  });
};

exports.getOne = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
  res.json({ success: true, data: enrichBooking(booking) });
};

/** Public booking options — no PII, safe for unauthenticated clients. */
exports.publicOptions = async (_req, res) => {
  const from = new Date(Date.now() - 60 * 60 * 1000);
  const to = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const taken = await Booking.find({
    status: "confirmed",
    at: { $gte: from, $lte: to },
  })
    .select("at")
    .lean();

  res.json({
    success: true,
    data: {
      consultTypes: CONSULT_TYPES,
      offices: OFFICES,
      heard: HEARD,
      takenSlots: taken.map((b) => new Date(b.at).toISOString()),
    },
  });
};

/** Public self-serve booking — same create path, with validation + honeypot. */
exports.publicCreate = async (req, res) => {
  const body = req.body || {};
  if (body.company_website) {
    return res.json({ success: true, data: { ok: true, skipped: true } });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const mobile = String(body.mobile || "").trim();
  const typeId = String(body.type || "").trim();
  const atRaw = body.at;

  if (!name) {
    return res.status(400).json({ success: false, message: "Please enter your full name." });
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address." });
  }
  if (!typeId || !CONSULT_TYPES.some((t) => t.id === typeId)) {
    return res.status(400).json({ success: false, message: "Please select a consultation type." });
  }
  if (!atRaw) {
    return res.status(400).json({ success: false, message: "Please pick a date and time." });
  }
  const at = new Date(atRaw);
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 45 * 60 * 1000) {
    return res.status(400).json({ success: false, message: "Please choose a future time slot." });
  }
  if (body.vevo === false || body.vevo === "false") {
    return res.status(400).json({ success: false, message: "Please accept the VEVO consent to continue." });
  }

  const clash = await Booking.findOne({
    status: "confirmed",
    at: {
      $gte: new Date(at.getTime() - 29 * 60 * 1000),
      $lte: new Date(at.getTime() + 29 * 60 * 1000),
    },
  });
  if (clash) {
    return res.status(409).json({ success: false, message: "That time was just taken — please pick another slot." });
  }

  const t = ctype(typeId);
  const booking = await Booking.create({
    name,
    email,
    mobile,
    type: typeId,
    office: body.office || "Truganina",
    mode: body.mode === "Phone" ? "Phone" : "Video",
    at,
    topic: String(body.topic || "").trim(),
    heard: String(body.heard || "").trim(),
    vevo: true,
    oaf: { status: t.fee > 0 ? "pending" : "optional", data: null },
    msgs: buildBookingMessages({
      name,
      email,
      mobile,
      type: typeId,
      office: body.office || "Truganina",
      mode: body.mode === "Phone" ? "Phone" : "Video",
      at: at.toISOString(),
    }),
  });
  await bookingToLead(booking);

  res.status(201).json({
    success: true,
    data: {
      id: booking._id.toString(),
      at: booking.at,
      type: booking.type,
      mode: booking.mode,
      office: booking.office,
      consultType: t,
      ok: true,
    },
  });
};
