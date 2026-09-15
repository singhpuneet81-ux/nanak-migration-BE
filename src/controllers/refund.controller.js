const RefundRequest = require("../models/RefundRequest");

function withId(doc) {
  const x = doc.toObject ? doc.toObject() : { ...doc };
  return { ...x, id: x._id?.toString?.() || x.id };
}

function makeRef() {
  const n = Date.now().toString(36).toUpperCase().slice(-6);
  const r = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `REF-${n}${r}`;
}

const METHODS = ["stripe", "bank", "cash", "other", "unknown"];

exports.list = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const q = String(req.query.search).trim();
    filter.$or = [
      { name: new RegExp(q, "i") },
      { email: new RegExp(q, "i") },
      { ref: new RegExp(q, "i") },
      { bookingRef: new RegExp(q, "i") },
      { invoiceRef: new RegExp(q, "i") },
    ];
  }
  const rows = await RefundRequest.find(filter).sort({ createdAt: -1 }).lean();
  const enriched = rows.map(withId);
  const refunded = enriched.filter((r) => r.status === "refunded");
  const totalRefundedAud = refunded.reduce((s, r) => s + (Number(r.amountAud) || 0), 0);
  res.json({
    success: true,
    data: {
      requests: enriched,
      kpis: {
        total: enriched.length,
        new: enriched.filter((r) => r.status === "new").length,
        reviewing: enriched.filter((r) => r.status === "reviewing").length,
        approved: enriched.filter((r) => r.status === "approved").length,
        refunded: refunded.length,
        totalRefundedAud,
      },
    },
  });
};

exports.getOne = async (req, res) => {
  const row = await RefundRequest.findById(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Refund request not found" });
  res.json({ success: true, data: withId(row) });
};

exports.update = async (req, res) => {
  const row = await RefundRequest.findById(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: "Refund request not found" });
  const body = req.body || {};
  if (body.status) row.status = body.status;
  if (body.amountAud != null && body.amountAud !== "") row.amountAud = Number(body.amountAud) || 0;
  if (body.note) {
    row.notes.unshift({
      text: String(body.note).trim(),
      at: new Date(),
      by: body.by || "admin",
    });
  }
  await row.save();
  res.json({ success: true, data: withId(row) });
};

exports.publicCreate = async (req, res) => {
  const body = req.body || {};
  if (body.company_website) {
    return res.json({ success: true, data: { ok: true, skipped: true } });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const reason = String(body.reason || "").trim();
  const amountAud = Number(body.amountAud) || 0;
  const paymentMethod = METHODS.includes(body.paymentMethod) ? body.paymentMethod : "unknown";

  if (!name) return res.status(400).json({ success: false, message: "Please enter your full name." });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address." });
  }
  if (!reason || reason.length < 20) {
    return res.status(400).json({ success: false, message: "Please explain the refund reason (at least 20 characters)." });
  }
  if (body.consent === false || body.consent === "false") {
    return res.status(400).json({ success: false, message: "Please accept the consent to continue." });
  }

  let ref = makeRef();
  for (let i = 0; i < 3; i++) {
    const exists = await RefundRequest.findOne({ ref }).lean();
    if (!exists) break;
    ref = makeRef();
  }

  const row = await RefundRequest.create({
    ref,
    name,
    email,
    mobile: String(body.mobile || "").trim(),
    bookingRef: String(body.bookingRef || "").trim(),
    invoiceRef: String(body.invoiceRef || "").trim(),
    amountAud,
    reason,
    paymentMethod,
    status: "new",
    page: "refund-request",
    notes: [{ text: "Refund request submitted via website", at: new Date(), by: "system" }],
  });

  res.status(201).json({
    success: true,
    data: {
      ok: true,
      id: row._id.toString(),
      ref: row.ref,
      status: row.status,
    },
  });
};
