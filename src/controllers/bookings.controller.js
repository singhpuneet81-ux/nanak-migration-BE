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
const stripeService = require("../services/stripe.service");

function enrichBooking(b) {
  const doc = b.toObject ? b.toObject() : { ...b };
  return {
    ...doc,
    id: doc._id?.toString?.() || doc.id,
    consultType: ctype(doc.type),
    payment: doc.payment || { status: "not_required", amountCents: 0, currency: "aud" },
  };
}

async function assertSlotFree(at) {
  const clash = await Booking.findOne({
    status: { $in: ["confirmed", "pending_payment"] },
    at: {
      $gte: new Date(at.getTime() - 29 * 60 * 1000),
      $lte: new Date(at.getTime() + 29 * 60 * 1000),
    },
  });
  if (clash) {
    const err = new Error("That time was just taken — please pick another slot.");
    err.status = 409;
    throw err;
  }
}

function validatePublicBookingBody(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const mobile = String(body.mobile || "").trim();
  const typeId = String(body.type || "").trim();
  const atRaw = body.at;

  if (!name) {
    const err = new Error("Please enter your full name.");
    err.status = 400;
    throw err;
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^\s@]+$/.test(email)) {
    const err = new Error("Please enter a valid email address.");
    err.status = 400;
    throw err;
  }
  if (!typeId || !CONSULT_TYPES.some((t) => t.id === typeId)) {
    const err = new Error("Please select a consultation type.");
    err.status = 400;
    throw err;
  }
  if (!atRaw) {
    const err = new Error("Please pick a date and time.");
    err.status = 400;
    throw err;
  }
  const at = new Date(atRaw);
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 45 * 60 * 1000) {
    const err = new Error("Please choose a future time slot.");
    err.status = 400;
    throw err;
  }
  if (body.vevo === false || body.vevo === "false") {
    const err = new Error("Please accept the VEVO consent to continue.");
    err.status = 400;
    throw err;
  }

  return {
    name,
    email,
    mobile,
    typeId,
    at,
    office: body.office || "Truganina",
    mode: body.mode === "Phone" ? "Phone" : "Video",
    topic: String(body.topic || "").trim(),
    heard: String(body.heard || "").trim(),
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
  const paid = enriched.filter((b) => b.payment?.status === "paid");
  const pendingPayment = enriched.filter((b) => b.status === "pending_payment");
  const paidTotalCents = paid.reduce((s, b) => s + (b.payment?.amountCents || 0), 0);

  res.json({
    success: true,
    data: {
      bookings: enriched,
      today,
      upcoming,
      past,
      pendingPayment,
      remindersQueued,
      noShowRate: completed.length ? Math.round((noshows / completed.length) * 100) : null,
      payments: {
        paidCount: paid.length,
        pendingCount: pendingPayment.length,
        totalCents: paidTotalCents,
        totalAud: paidTotalCents / 100,
      },
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
    status: { $in: ["confirmed", "pending_payment"] },
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

/** Public self-serve booking — free consults only (paid uses /checkout). */
exports.publicCreate = async (req, res) => {
  const body = req.body || {};
  if (body.company_website) {
    return res.json({ success: true, data: { ok: true, skipped: true } });
  }

  let parsed;
  try {
    parsed = validatePublicBookingBody(body);
    await assertSlotFree(parsed.at);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }

  const t = ctype(parsed.typeId);
  if (t.fee > 0) {
    return res.status(400).json({
      success: false,
      message: "This consultation requires payment. Please use the checkout flow.",
    });
  }

  const booking = await Booking.create({
    name: parsed.name,
    email: parsed.email,
    mobile: parsed.mobile,
    type: parsed.typeId,
    office: parsed.office,
    mode: parsed.mode,
    at: parsed.at,
    topic: parsed.topic,
    heard: parsed.heard,
    vevo: true,
    status: "confirmed",
    payment: { status: "not_required", amountCents: 0, currency: "aud" },
    oaf: { status: "optional", data: null },
    msgs: buildBookingMessages({
      name: parsed.name,
      email: parsed.email,
      mobile: parsed.mobile,
      type: parsed.typeId,
      office: parsed.office,
      mode: parsed.mode,
      at: parsed.at.toISOString(),
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
      payment: booking.payment,
      ok: true,
    },
  });
};

/** Paid consult: create pending booking + Stripe Checkout Session. */
exports.publicCheckout = async (req, res) => {
  const body = req.body || {};
  if (body.company_website) {
    return res.json({ success: true, data: { ok: true, skipped: true } });
  }

  let parsed;
  try {
    parsed = validatePublicBookingBody(body);
    await assertSlotFree(parsed.at);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }

  const t = ctype(parsed.typeId);
  if (!t.fee || t.fee <= 0) {
    return res.status(400).json({
      success: false,
      message: "This consultation is free — book without payment.",
    });
  }

  const amountCents = Math.round(Number(t.fee) * 100);
  const booking = await Booking.create({
    name: parsed.name,
    email: parsed.email,
    mobile: parsed.mobile,
    type: parsed.typeId,
    office: parsed.office,
    mode: parsed.mode,
    at: parsed.at,
    topic: parsed.topic,
    heard: parsed.heard,
    vevo: true,
    status: "pending_payment",
    payment: {
      status: "pending",
      amountCents,
      currency: "aud",
    },
    oaf: { status: "pending", data: null },
    msgs: [],
  });

  try {
    const session = await stripeService.createConsultCheckoutSession({
      req,
      bookingId: booking._id.toString(),
      amountCents,
      consultName: t.name,
      customerEmail: parsed.email,
      customerName: parsed.name,
    });
    booking.payment.stripeSessionId = session.id;
    await booking.save();

    res.status(201).json({
      success: true,
      data: {
        ok: true,
        bookingId: booking._id.toString(),
        sessionId: session.id,
        url: session.url,
        amountCents,
        consultType: t,
      },
    });
  } catch (e) {
    booking.status = "cancelled";
    booking.payment.status = "failed";
    await booking.save();
    return res.status(e.status || 502).json({
      success: false,
      message: e.message || "Could not start payment. Please try again.",
    });
  }
};

/** After Stripe redirect — verify session and confirm booking. */
exports.publicConfirmPayment = async (req, res) => {
  const sessionId = String(req.body?.sessionId || req.query?.session_id || "").trim();
  if (!sessionId) {
    return res.status(400).json({ success: false, message: "Missing Stripe session id." });
  }

  let session;
  try {
    session = await stripeService.retrieveCheckoutSession(sessionId);
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || "Could not verify payment." });
  }

  const bookingId = session.client_reference_id || session.metadata?.bookingId;
  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Payment session is missing booking reference." });
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }

  if (session.payment_status === "paid" || session.status === "complete") {
    if (booking.status !== "confirmed") {
      booking.status = "confirmed";
      booking.payment = booking.payment || {};
      booking.payment.status = "paid";
      booking.payment.stripeSessionId = session.id;
      booking.payment.stripePaymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || "";
      booking.payment.paidAt = new Date();
      booking.payment.amountCents = session.amount_total || booking.payment.amountCents || 0;
      if (!booking.msgs?.length) {
        booking.msgs = buildBookingMessages({
          name: booking.name,
          email: booking.email,
          mobile: booking.mobile,
          type: booking.type,
          office: booking.office,
          mode: booking.mode,
          at: new Date(booking.at).toISOString(),
        });
      }
      await booking.save();
      if (!booking.leadId) await bookingToLead(booking);
    }

    const t = ctype(booking.type);
    return res.json({
      success: true,
      data: {
        ok: true,
        paid: true,
        id: booking._id.toString(),
        at: booking.at,
        type: booking.type,
        mode: booking.mode,
        office: booking.office,
        name: booking.name,
        consultType: t,
        payment: booking.payment,
      },
    });
  }

  if (session.status === "expired") {
    booking.status = "cancelled";
    booking.payment.status = "cancelled";
    await booking.save();
  }

  return res.status(402).json({
    success: false,
    message: "Payment not completed yet.",
    data: { paymentStatus: session.payment_status, sessionStatus: session.status },
  });
};

/** Cancel a pending Stripe booking (user abandoned checkout). */
exports.publicCancelPending = async (req, res) => {
  const bookingId = String(req.body?.bookingId || "").trim();
  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Missing booking id." });
  }
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found." });
  }
  if (booking.status === "pending_payment") {
    booking.status = "cancelled";
    booking.payment.status = "cancelled";
    await booking.save();
  }
  res.json({ success: true, data: { ok: true } });
};

/** Admin: paid consultation payments list + totals. */
exports.paymentsReport = async (_req, res) => {
  const paid = await Booking.find({ "payment.status": "paid" }).sort({ "payment.paidAt": -1 }).lean();
  const pending = await Booking.countDocuments({ status: "pending_payment", "payment.status": "pending" });
  const totalCents = paid.reduce((sum, b) => sum + (b.payment?.amountCents || 0), 0);
  res.json({
    success: true,
    data: {
      kpis: {
        paidCount: paid.length,
        pendingCount: pending,
        totalCents,
        totalAud: Math.round(totalCents) / 100,
      },
      payments: paid.map((b) => ({
        ...enrichBooking(b),
        amountAud: (b.payment?.amountCents || 0) / 100,
      })),
    },
  });
};

