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
  res.json({
    success: true,
    data: { booking: enrichBooking(booking), lead: lead ? enrichLead(lead) : null },
  });
};

exports.getOne = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
  res.json({ success: true, data: enrichBooking(booking) });
};
