const GovernanceTicket = require("../models/GovernanceTicket");

function withId(doc) {
  const x = doc.toObject ? doc.toObject() : { ...doc };
  return { ...x, id: x._id?.toString?.() || x.id };
}

function makeRef() {
  const n = Date.now().toString(36).toUpperCase().slice(-6);
  const r = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `GOV-${n}${r}`;
}

const CATEGORIES = [
  "complaint",
  "feedback",
  "service-quality",
  "billing",
  "privacy",
  "other",
];

exports.list = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const q = String(req.query.search).trim();
    filter.$or = [
      { name: new RegExp(q, "i") },
      { email: new RegExp(q, "i") },
      { subject: new RegExp(q, "i") },
      { ref: new RegExp(q, "i") },
    ];
  }
  const tickets = await GovernanceTicket.find(filter).sort({ createdAt: -1 }).lean();
  const enriched = tickets.map(withId);
  res.json({
    success: true,
    data: {
      tickets: enriched,
      kpis: {
        total: enriched.length,
        new: enriched.filter((t) => t.status === "new").length,
        inProgress: enriched.filter((t) => t.status === "in_progress").length,
        resolved: enriched.filter((t) => t.status === "resolved").length,
      },
      categories: CATEGORIES,
    },
  });
};

exports.getOne = async (req, res) => {
  const ticket = await GovernanceTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
  res.json({ success: true, data: withId(ticket) });
};

exports.update = async (req, res) => {
  const ticket = await GovernanceTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
  const body = req.body || {};
  if (body.status) ticket.status = body.status;
  if (body.category) ticket.category = body.category;
  if (body.note) {
    ticket.notes.unshift({
      text: String(body.note).trim(),
      at: new Date(),
      by: body.by || "admin",
    });
  }
  await ticket.save();
  res.json({ success: true, data: withId(ticket) });
};

exports.publicCreate = async (req, res) => {
  const body = req.body || {};
  if (body.company_website) {
    return res.json({ success: true, data: { ok: true, skipped: true } });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const subject = String(body.subject || "").trim();
  const details = String(body.details || "").trim();
  const category = CATEGORIES.includes(body.category) ? body.category : "complaint";

  if (!name) return res.status(400).json({ success: false, message: "Please enter your full name." });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address." });
  }
  if (!subject) return res.status(400).json({ success: false, message: "Please enter a subject." });
  if (!details || details.length < 20) {
    return res.status(400).json({ success: false, message: "Please provide more detail (at least 20 characters)." });
  }
  if (body.consent === false || body.consent === "false") {
    return res.status(400).json({ success: false, message: "Please accept the consent to continue." });
  }

  let ref = makeRef();
  for (let i = 0; i < 3; i++) {
    const exists = await GovernanceTicket.findOne({ ref }).lean();
    if (!exists) break;
    ref = makeRef();
  }

  const ticket = await GovernanceTicket.create({
    ref,
    name,
    email,
    mobile: String(body.mobile || "").trim(),
    category,
    subject,
    details,
    relatedRef: String(body.relatedRef || "").trim(),
    status: "new",
    page: "governance",
    notes: [{ text: "Ticket submitted via website", at: new Date(), by: "system" }],
  });

  res.status(201).json({
    success: true,
    data: {
      ok: true,
      id: ticket._id.toString(),
      ref: ticket.ref,
      status: ticket.status,
    },
  });
};
