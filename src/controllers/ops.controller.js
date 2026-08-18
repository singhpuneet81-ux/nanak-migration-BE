const Lead = require("../models/Lead");
const Booking = require("../models/Booking");
const Client = require("../models/Client");
const Matter = require("../models/Matter");
const DocumentRecord = require("../models/DocumentRecord");
const ComplianceCheck = require("../models/ComplianceCheck");

function rx(v) {
  return new RegExp(String(v || "").trim(), "i");
}

function withId(doc) {
  const x = doc.toObject ? doc.toObject() : { ...doc };
  return { ...x, id: x._id?.toString?.() || x.id };
}

async function enrichClient(client) {
  const [matterCount, openMatterCount] = await Promise.all([
    Matter.countDocuments({ clientId: client._id }),
    Matter.countDocuments({ clientId: client._id, status: { $nin: ["approved", "closed"] } }),
  ]);
  return { ...withId(client), matterCount, openMatterCount };
}

async function enrichMatter(matter) {
  const [client, documentCount, overdueDocs] = await Promise.all([
    Client.findById(matter.clientId).lean(),
    DocumentRecord.countDocuments({ matterId: matter._id }),
    DocumentRecord.countDocuments({ matterId: matter._id, status: { $in: ["required", "requested", "expired"] } }),
  ]);
  return {
    ...withId(matter),
    clientName: client?.name || "Unknown client",
    documentCount,
    overdueDocs,
  };
}

exports.clients = async (req, res) => {
  const filter = {};
  if (req.query.search) {
    filter.$or = [{ name: rx(req.query.search) }, { email: rx(req.query.search) }, { location: rx(req.query.search) }];
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.kind) filter.kind = req.query.kind;
  const rows = await Client.find(filter).sort({ updatedAt: -1 });
  const clients = await Promise.all(rows.map(enrichClient));
  res.json({
    success: true,
    data: {
      clients,
      summary: {
        total: clients.length,
        active: clients.filter((c) => c.status === "active").length,
        businesses: clients.filter((c) => c.kind === "business").length,
        withOpenMatters: clients.filter((c) => c.openMatterCount > 0).length,
      },
    },
  });
};

exports.createClient = async (req, res) => {
  const body = req.body || {};
  const client = await Client.create({
    kind: body.kind || "person",
    status: body.status || "active",
    name: body.name || "New client",
    email: body.email || "",
    mobile: body.mobile || "",
    occupation: body.occupation || "",
    location: body.location || "",
    preferredChannel: body.preferredChannel || "email",
    visaCurrent: body.visaCurrent || "",
    visaGoal: body.visaGoal || "",
    visaExpiry: body.visaExpiry ? new Date(body.visaExpiry) : null,
    source: body.source || "",
    assignedTo: body.assignedTo || "",
    leadId: body.leadId || null,
    tags: body.tags || [],
    notes: body.note ? [{ text: body.note, at: new Date() }] : [],
  });
  res.status(201).json({ success: true, data: await enrichClient(client) });
};

exports.updateClient = async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ success: false, message: "Client not found" });
  const body = req.body || {};
  ["kind", "status", "name", "email", "mobile", "occupation", "location", "preferredChannel", "visaCurrent", "visaGoal", "source", "assignedTo"].forEach((f) => {
    if (body[f] !== undefined) client[f] = body[f];
  });
  if (body.visaExpiry !== undefined) client.visaExpiry = body.visaExpiry ? new Date(body.visaExpiry) : null;
  if (body.tags) client.tags = body.tags;
  if (body.note) client.notes.unshift({ text: body.note, at: new Date() });
  await client.save();
  res.json({ success: true, data: await enrichClient(client) });
};

exports.matters = async (req, res) => {
  const filter = {};
  if (req.query.stage) filter.stage = req.query.stage;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.status) filter.status = req.query.status;
  const rows = await Matter.find(filter).sort({ nextActionAt: 1, updatedAt: -1 });
  const matters = await Promise.all(rows.map(enrichMatter));
  res.json({
    success: true,
    data: {
      matters,
      summary: {
        total: matters.length,
        open: matters.filter((m) => ["open", "on-hold", "lodged"].includes(m.status)).length,
        dueThisWeek: matters.filter((m) => m.nextActionAt && new Date(m.nextActionAt).getTime() < Date.now() + 7 * 86400000).length,
        documentsOutstanding: matters.reduce((a, m) => a + (m.documentsOutstanding || 0), 0),
      },
    },
  });
};

exports.createMatter = async (req, res) => {
  const body = req.body || {};
  const matter = await Matter.create({
    title: body.title || "New matter",
    clientId: body.clientId,
    leadId: body.leadId || null,
    bookingId: body.bookingId || null,
    type: body.type || "Skilled Migration",
    visaCategory: body.visaCategory || "",
    stage: body.stage || "intake",
    status: body.status || "open",
    assignedTo: body.assignedTo || "",
    office: body.office || "",
    feeStatus: body.feeStatus || "unpaid",
    lodgementStatus: body.lodgementStatus || "not-ready",
    nextAction: body.nextAction || "",
    nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null,
    documentsOutstanding: body.documentsOutstanding || 0,
    riskLevel: body.riskLevel || "low",
    notes: body.note ? [{ text: body.note, at: new Date() }] : [],
    deadlines: body.deadlines || [],
  });
  res.status(201).json({ success: true, data: await enrichMatter(matter) });
};

exports.updateMatter = async (req, res) => {
  const matter = await Matter.findById(req.params.id);
  if (!matter) return res.status(404).json({ success: false, message: "Matter not found" });
  const body = req.body || {};
  ["title", "type", "visaCategory", "stage", "status", "assignedTo", "office", "feeStatus", "lodgementStatus", "nextAction", "riskLevel"].forEach((f) => {
    if (body[f] !== undefined) matter[f] = body[f];
  });
  if (body.nextActionAt !== undefined) matter.nextActionAt = body.nextActionAt ? new Date(body.nextActionAt) : null;
  if (body.documentsOutstanding !== undefined) matter.documentsOutstanding = body.documentsOutstanding;
  if (body.deadlines) matter.deadlines = body.deadlines;
  if (body.note) matter.notes.unshift({ text: body.note, at: new Date() });
  await matter.save();
  res.json({ success: true, data: await enrichMatter(matter) });
};

exports.documents = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.matterId) filter.matterId = req.query.matterId;
  const docs = await DocumentRecord.find(filter).sort({ updatedAt: -1 }).lean();
  const clients = await Client.find({ _id: { $in: docs.map((d) => d.clientId).filter(Boolean) } }).lean();
  const matters = await Matter.find({ _id: { $in: docs.map((d) => d.matterId).filter(Boolean) } }).lean();
  const byClient = Object.fromEntries(clients.map((c) => [String(c._id), c]));
  const byMatter = Object.fromEntries(matters.map((m) => [String(m._id), m]));
  res.json({
    success: true,
    data: {
      documents: docs.map((d) => ({
        ...withId(d),
        clientName: byClient[String(d.clientId)]?.name || "Unknown client",
        matterTitle: d.matterId ? byMatter[String(d.matterId)]?.title || "Unknown matter" : "",
      })),
      summary: {
        total: docs.length,
        required: docs.filter((d) => d.status === "required").length,
        requested: docs.filter((d) => d.status === "requested").length,
        expired: docs.filter((d) => d.status === "expired").length,
      },
    },
  });
};

exports.createDocument = async (req, res) => {
  const body = req.body || {};
  const doc = await DocumentRecord.create({
    clientId: body.clientId,
    matterId: body.matterId || null,
    category: body.category || "Identity",
    name: body.name || "New document",
    status: body.status || "required",
    requestedAt: body.requestedAt ? new Date(body.requestedAt) : null,
    receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
    expiryAt: body.expiryAt ? new Date(body.expiryAt) : null,
    version: body.version || 1,
    source: body.source || "client",
    notes: body.notes || "",
  });
  res.status(201).json({ success: true, data: withId(doc) });
};

exports.updateDocument = async (req, res) => {
  const doc = await DocumentRecord.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
  const body = req.body || {};
  ["category", "name", "status", "version", "source", "notes"].forEach((f) => {
    if (body[f] !== undefined) doc[f] = body[f];
  });
  if (body.requestedAt !== undefined) doc.requestedAt = body.requestedAt ? new Date(body.requestedAt) : null;
  if (body.receivedAt !== undefined) doc.receivedAt = body.receivedAt ? new Date(body.receivedAt) : null;
  if (body.expiryAt !== undefined) doc.expiryAt = body.expiryAt ? new Date(body.expiryAt) : null;
  await doc.save();
  res.json({ success: true, data: withId(doc) });
};

exports.compliance = async (req, res) => {
  const filter = {};
  if (req.query.overallStatus) filter.overallStatus = req.query.overallStatus;
  if (req.query.riskRating) filter.riskRating = req.query.riskRating;
  const rows = await ComplianceCheck.find(filter).sort({ updatedAt: -1 }).lean();
  const clients = await Client.find({ _id: { $in: rows.map((r) => r.clientId) } }).lean();
  const matters = await Matter.find({ _id: { $in: rows.map((r) => r.matterId).filter(Boolean) } }).lean();
  const byClient = Object.fromEntries(clients.map((c) => [String(c._id), c]));
  const byMatter = Object.fromEntries(matters.map((m) => [String(m._id), m]));
  res.json({
    success: true,
    data: {
      checks: rows.map((r) => ({
        ...withId(r),
        clientName: byClient[String(r.clientId)]?.name || "Unknown client",
        matterTitle: r.matterId ? byMatter[String(r.matterId)]?.title || "Unknown matter" : "",
      })),
      summary: {
        total: rows.length,
        pending: rows.filter((r) => r.overallStatus === "pending").length,
        escalated: rows.filter((r) => r.overallStatus === "escalated").length,
        highRisk: rows.filter((r) => r.riskRating === "high").length,
      },
    },
  });
};

exports.createCompliance = async (req, res) => {
  const body = req.body || {};
  const check = await ComplianceCheck.create({
    clientId: body.clientId,
    matterId: body.matterId || null,
    kycStatus: body.kycStatus || "pending",
    sourceOfFundsStatus: body.sourceOfFundsStatus || "pending",
    sanctionsStatus: body.sanctionsStatus || "pending",
    pepStatus: body.pepStatus || "clear",
    riskRating: body.riskRating || "low",
    overallStatus: body.overallStatus || "pending",
    reviewer: body.reviewer || "",
    reviewedAt: body.reviewedAt ? new Date(body.reviewedAt) : null,
    notes: body.note ? [{ text: body.note, at: new Date() }] : [],
  });
  res.status(201).json({ success: true, data: withId(check) });
};

exports.updateCompliance = async (req, res) => {
  const check = await ComplianceCheck.findById(req.params.id);
  if (!check) return res.status(404).json({ success: false, message: "Compliance check not found" });
  const body = req.body || {};
  ["kycStatus", "sourceOfFundsStatus", "sanctionsStatus", "pepStatus", "riskRating", "overallStatus", "reviewer"].forEach((f) => {
    if (body[f] !== undefined) check[f] = body[f];
  });
  if (body.reviewedAt !== undefined) check.reviewedAt = body.reviewedAt ? new Date(body.reviewedAt) : null;
  if (body.note) check.notes.unshift({ text: body.note, at: new Date() });
  await check.save();
  res.json({ success: true, data: withId(check) });
};

exports.reports = async (_req, res) => {
  const [leads, bookings, clients, matters, documents, checks] = await Promise.all([
    Lead.find().lean(),
    Booking.find().lean(),
    Client.find().lean(),
    Matter.find().lean(),
    DocumentRecord.find().lean(),
    ComplianceCheck.find().lean(),
  ]);

  const openMatters = matters.filter((m) => ["open", "on-hold", "lodged"].includes(m.status));
  const upcomingDeadlines = openMatters
    .flatMap((m) => (m.deadlines || []).filter((d) => !d.done).map((d) => ({ matterId: m._id, title: m.title, label: d.label, due: d.due })))
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 10);

  const workloadMap = {};
  openMatters.forEach((m) => {
    const key = m.assignedTo || "Unassigned";
    workloadMap[key] = workloadMap[key] || { assignee: key, matters: 0, highRisk: 0, docsOutstanding: 0 };
    workloadMap[key].matters += 1;
    workloadMap[key].docsOutstanding += m.documentsOutstanding || 0;
    if (m.riskLevel === "high") workloadMap[key].highRisk += 1;
  });

  const report = {
    kpis: {
      leads: leads.length,
      bookings: bookings.length,
      clients: clients.length,
      openMatters: openMatters.length,
      pendingCompliance: checks.filter((c) => c.overallStatus === "pending").length,
    },
    funnel: {
      newLeads: leads.filter((l) => l.status === "new").length,
      engagedLeads: leads.filter((l) => l.status === "engaged").length,
      consultLeads: leads.filter((l) => l.status === "consult").length,
      wonLeads: leads.filter((l) => l.status === "won").length,
      activeClients: clients.filter((c) => c.status === "active").length,
    },
    bookings: {
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      noShow: bookings.filter((b) => b.status === "no-show").length,
    },
    documents: {
      total: documents.length,
      ready: documents.filter((d) => ["received", "verified"].includes(d.status)).length,
      outstanding: documents.filter((d) => ["required", "requested", "expired"].includes(d.status)).length,
    },
    compliance: {
      low: checks.filter((c) => c.riskRating === "low").length,
      medium: checks.filter((c) => c.riskRating === "medium").length,
      high: checks.filter((c) => c.riskRating === "high").length,
    },
    upcomingDeadlines,
    teamWorkload: Object.values(workloadMap).sort((a, b) => b.matters - a.matters),
  };

  res.json({ success: true, data: report });
};
