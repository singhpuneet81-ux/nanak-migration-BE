const Lead = require("../models/Lead");
const TeamMember = require("../models/TeamMember");
const {
  enrichLead,
  counts,
  kpiStrip,
  band,
  slaState,
  slaDue,
  ltv,
  pathway,
  triggers,
  segDefs,
  SOURCES,
  BAND_LABEL,
  now,
  DAY,
} = require("../services/runway.service");
const { applyRmaRule } = require("../services/intake.service");

function buildFilter(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;
  if (query.owner) filter.owner = query.owner;
  if (query.search) {
    const q = query.search.trim();
    filter.$or = [
      { name: new RegExp(q, "i") },
      { email: new RegExp(q, "i") },
      { occupation: new RegExp(q, "i") },
      { location: new RegExp(q, "i") },
    ];
  }
  return filter;
}

exports.list = async (req, res) => {
  const filter = buildFilter(req.query);
  let leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
  if (req.query.band) {
    leads = leads.filter((l) => band(l) === req.query.band);
  }
  const enriched = leads.map((l) => enrichLead(l));
  res.json({
    success: true,
    data: {
      leads: enriched,
      kpis: kpiStrip(leads),
      counts: counts(leads),
    },
  });
};

exports.getOne = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
  res.json({ success: true, data: enrichLead(lead) });
};

exports.create = async (req, res) => {
  const body = req.body || {};
  const lead = await Lead.create({
    name: body.name || "New enquiry",
    email: body.email || "",
    mobile: body.mobile || "",
    subclass: body.subclass || "",
    expiry: body.expiry ? new Date(body.expiry) : null,
    goal: body.goal || "190",
    occupation: body.occupation || "",
    location: body.location || "",
    source: body.source || "Contact us",
    article: body.article || "",
    status: "new",
    owner: body.owner || "",
    consent: body.consent || { email: true, sms: false, wa: false },
  });
  res.status(201).json({ success: true, data: enrichLead(lead) });
};

exports.update = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

  const body = req.body || {};
  const fields = [
    "name",
    "email",
    "mobile",
    "subclass",
    "goal",
    "occupation",
    "location",
    "source",
    "article",
    "owner",
  ];
  fields.forEach((f) => {
    if (body[f] !== undefined) lead[f] = body[f];
  });
  if (body.expiry !== undefined) lead.expiry = body.expiry ? new Date(body.expiry) : null;
  if (body.consent) {
    const c = lead.consent?.toObject ? lead.consent.toObject() : { ...lead.consent };
    lead.consent = { ...c, ...body.consent };
  }
  if (body.contacted === true || body.markContacted) {
    lead.contactedAt = new Date();
    lead.notes.unshift({ text: "First contact made", at: new Date() });
  }
  if (body.note) {
    lead.notes.unshift({ text: body.note, at: new Date() });
  }
  if (body.nbaSent) {
    if (!lead.contactedAt) lead.contactedAt = new Date();
    if (lead.status === "new") lead.status = "engaged";
    lead.notes.unshift({ text: `NBA sent: ${body.nbaTitle || "Next best action"}`, at: new Date() });
  }
  if (body.status) {
    applyRmaRule(lead, body.status);
    lead.notes.unshift({ text: `Status → ${body.status}`, at: new Date() });
  }
  if (body.owner !== undefined && body.owner !== lead.owner) {
    lead.notes.unshift({
      text: body.owner ? `Allocated to ${body.owner}` : "Unallocated",
      at: new Date(),
    });
  }
  if (body.consultBooked) {
    applyRmaRule(lead, "consult");
    if (!lead.contactedAt) lead.contactedAt = new Date();
    lead.notes.unshift({ text: "Consult booked — with the RMA", at: new Date() });
  }

  await lead.save();
  res.json({ success: true, data: enrichLead(lead) });
};

exports.remove = async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
  res.json({ success: true, data: { ok: true } });
};

exports.exportCsv = async (req, res) => {
  const leads = await Lead.find(buildFilter(req.query)).sort({ createdAt: -1 }).lean();
  const rows = [
    [
      "name",
      "email",
      "mobile",
      "current_visa",
      "expiry",
      "goal",
      "source",
      "article",
      "owner",
      "status",
      "pathway_value",
      "consent_email",
      "consent_sms",
      "consent_wa",
    ],
    ...leads.map((l) => [
      l.name,
      l.email,
      l.mobile,
      l.subclass,
      l.expiry ? new Date(l.expiry).toISOString().slice(0, 10) : "",
      l.goal,
      l.source,
      l.article,
      l.owner,
      l.status,
      ltv(l),
      l.consent?.email,
      l.consent?.sms,
      l.consent?.wa,
    ]),
  ];
  res.json({ success: true, data: { rows } });
};

exports.radar = async (req, res) => {
  const all = await Lead.find().sort({ expiry: 1 }).lean();
  const open = all.filter((l) => !["won", "lost"].includes(l.status));
  const withExp = open.filter((l) => l.expiry).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
  const noExp = open.filter((l) => !l.expiry);

  const queue = open
    .filter((l) => !l.contactedAt)
    .sort((a, b) => {
      const sa = slaState(a);
      const sb = slaState(b);
      if ((sa.s === "breach") !== (sb.s === "breach")) return sa.s === "breach" ? -1 : 1;
      return slaDue(a) - slaDue(b);
    });

  const critical = withExp.filter((l) => {
    const b = band(l);
    return b === "crit" || b === "urgent";
  });

  res.json({
    success: true,
    data: {
      kpis: kpiStrip(all),
      counts: counts(all),
      chips: withExp.map((l) => enrichLead(l)),
      noExpiry: noExp.map((l) => enrichLead(l)),
      firstContactQueue: queue.map((l) => enrichLead(l)),
      shortRunway: critical.map((l) => enrichLead(l)),
      bandLabels: BAND_LABEL,
    },
  });
};

exports.sources = async (req, res) => {
  const leads = await Lead.find().lean();
  const by = {};
  SOURCES.forEach((s) => {
    by[s] = { leads: 0, consult: 0, won: 0, ltv: 0 };
  });
  leads.forEach((l) => {
    const b = by[l.source];
    if (!b) return;
    b.leads++;
    if (["consult", "won"].includes(l.status)) b.consult++;
    if (l.status === "won") b.won++;
    b.ltv += ltv(l);
  });
  const arts = {};
  leads.forEach((l) => {
    if (!l.article) return;
    arts[l.article] = arts[l.article] || { leads: 0, consult: 0 };
    arts[l.article].leads++;
    if (["consult", "won"].includes(l.status)) arts[l.article].consult++;
  });
  res.json({
    success: true,
    data: {
      sources: SOURCES.map((s) => ({
        source: s,
        ...by[s],
        consultRate: by[s].leads ? Math.round((by[s].consult / by[s].leads) * 100) : 0,
      })),
      articles: Object.entries(arts)
        .sort((a, b) => b[1].leads - a[1].leads)
        .map(([article, v]) => ({ article, ...v })),
    },
  });
};

exports.pathways = async (req, res) => {
  const leads = await Lead.find({ status: { $nin: ["won", "lost"] } }).lean();
  const total = leads.reduce((a, l) => a + ltv(l), 0);
  const trigList = [];
  leads.forEach((l) => {
    triggers(l).forEach((t) => trigList.push({ lead: enrichLead(l), trigger: t }));
  });
  trigList.sort((a, b) => a.trigger.at - b.trigger.at);

  res.json({
    success: true,
    data: {
      openCount: leads.length,
      pipelineLtv: total,
      triggerCount: trigList.length,
      upcomingTriggers: trigList.slice(0, 20),
      leads: leads
        .map((l) => ({ ...enrichLead(l), pathwayFlow: pathway(l) }))
        .sort((a, b) => b.ltv - a.ltv),
    },
  });
};

exports.team = async (req, res) => {
  const [members, leads] = await Promise.all([
    TeamMember.find().sort({ sortOrder: 1 }).lean(),
    Lead.find({ status: { $nin: ["won", "lost"] } }).lean(),
  ]);
  const open = leads;
  const unalloc = open
    .filter((l) => !l.owner)
    .sort((a, b) => slaDue(a) - slaDue(b))
    .map((l) => enrichLead(l));

  const grid = members.map((m) => {
    const owned = open.filter((l) => l.owner === m.name);
    return {
      ...m,
      load: owned.length,
      full: owned.length >= m.capacity,
      leads: owned.map((l) => enrichLead(l)),
    };
  });

  res.json({ success: true, data: { members: grid, unallocated: unalloc } });
};

exports.segments = async (req, res) => {
  const channel = req.query.channel || "email";
  const leads = await Lead.find().lean();
  const defs = segDefs();
  const segments = defs.map((sg) => {
    const list = leads.filter((l) => sg.filter(l) && l.consent?.[channel]);
    return {
      id: sg.id,
      name: sg.name,
      desc: sg.desc,
      count: list.length,
      leads: list.map((l) => enrichLead(l)),
    };
  });
  res.json({ success: true, data: { channel, segments } });
};

exports.segmentExport = async (req, res) => {
  const channel = req.query.channel || "email";
  const segId = req.query.segment;
  const sg = segDefs().find((s) => s.id === segId);
  if (!sg) return res.status(404).json({ success: false, message: "Segment not found" });
  const leads = await Lead.find().lean();
  const list = leads.filter((l) => sg.filter(l) && l.consent?.[channel]);
  const rows = [
    ["name", "email", "mobile", "current_visa", "expiry", "goal", "occupation", "location"],
    ...list.map((l) => [
      l.name,
      l.email,
      channel === "email" ? "" : l.mobile,
      l.subclass,
      l.expiry ? new Date(l.expiry).toISOString().slice(0, 10) : "",
      l.goal,
      l.occupation,
      l.location,
    ]),
  ];
  res.json({ success: true, data: { rows, count: list.length } });
};

exports.meta = async (_req, res) => {
  res.json({
    success: true,
    data: {
      sources: SOURCES,
      bandLabels: BAND_LABEL,
      statuses: ["new", "engaged", "consult", "won", "lost"],
    },
  });
};
