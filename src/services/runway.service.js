const {
  RMA_NAME,
  SOURCES,
  HEAT,
  SLA_MINS,
  VISAS,
  PATHWAYS,
  STAGE_NAMES,
  BAND_LABEL,
  CONSULT_TYPES,
  OFFICES,
  HEARD,
  MSG_LABEL,
} = require("../config/constants");

const DAY = 86400000;
const HR = 3600000;
const MIN = 60000;

function now() {
  return Date.now();
}

function toLeadShape(lead) {
  const doc = lead.toObject ? lead.toObject() : { ...lead };
  return {
    ...doc,
    id: doc._id?.toString?.() || doc.id,
    created: doc.createdAt ? new Date(doc.createdAt).getTime() : doc.created,
    contacted: doc.contactedAt ? new Date(doc.contactedAt).getTime() : doc.contacted || null,
    occ: doc.occupation ?? doc.occ,
    loc: doc.location ?? doc.loc,
  };
}

function daysToExpiry(lead) {
  const exp = lead.expiry ? new Date(lead.expiry).getTime() : null;
  if (!exp) return null;
  return Math.round((exp - now()) / DAY);
}

function band(lead) {
  const d = daysToExpiry(lead);
  if (d === null) return "none";
  if (d < 90) return "crit";
  if (d < 180) return "urgent";
  if (d < 365) return "window";
  return "runway";
}

function heat(lead) {
  return HEAT[lead.source] || "cool";
}

function slaDue(lead) {
  const created = lead.createdAt ? new Date(lead.createdAt).getTime() : lead.created;
  return created + SLA_MINS[heat(lead)] * MIN;
}

function slaState(lead) {
  const contacted = lead.contactedAt
    ? new Date(lead.contactedAt).getTime()
    : lead.contacted || null;
  const created = lead.createdAt ? new Date(lead.createdAt).getTime() : lead.created;
  if (contacted) {
    return { s: "done", mins: Math.round((contacted - created) / MIN) };
  }
  const rem = slaDue(lead) - now();
  return rem < 0
    ? { s: "breach", mins: Math.round(-rem / MIN) }
    : { s: "due", mins: Math.round(rem / MIN) };
}

function pathway(lead) {
  const key = PATHWAYS[lead.subclass] ? lead.subclass : PATHWAYS[lead.goal] ? lead.goal : "";
  return PATHWAYS[key] || [];
}

function ltv(lead) {
  return pathway(lead).reduce((a, st) => a + st.f, 0);
}

function visaLabel(c) {
  return VISAS[c] !== undefined ? VISAS[c] : STAGE_NAMES[c] || c;
}

function fm(n) {
  return "$" + n.toLocaleString("en-AU");
}

function fmins(m) {
  if (m < 60) return m + "m";
  if (m < 1440) return Math.round((m / 60) * 10) / 10 + "h";
  return Math.round((m / 1440) * 10) / 10 + "d";
}

function fdate(ts) {
  return new Date(ts).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ftime(ts) {
  return new Date(ts).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function fday(ts) {
  return new Date(ts).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function sameDay(a, b) {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

function ctype(id) {
  return CONSULT_TYPES.find((t) => t.id === id) || CONSULT_TYPES[0];
}

function triggers(lead) {
  const t = [];
  const d = lead.expiry ? new Date(lead.expiry).getTime() : null;
  if (!d) return t;
  const path = pathway(lead);
  if (lead.subclass === "485" && path.length) {
    t.push({ at: d - 420 * DAY, what: "PR pathway nurture (14 months before 485 expiry)" });
  }
  if (lead.subclass === "500") {
    t.push({ at: d - 180 * DAY, what: "485 Temporary Graduate nurture (6 months before student visa end)" });
  }
  if (lead.subclass === "482") {
    t.push({ at: d - 540 * DAY, what: "186 TRT eligibility check (18 months before SID expiry)" });
  }
  if (lead.subclass === "820") {
    t.push({ at: d - 90 * DAY, what: "801 permanent stage preparation" });
  }
  if (lead.subclass === "491") {
    t.push({ at: d - 365 * DAY, what: "887 residence + income evidence check" });
  }
  t.push({ at: d - 60 * DAY, what: "Final expiry safeguard - status check 60 days out" });
  return t.filter((x) => x.at > now() - 30 * DAY).sort((a, b) => a.at - b.at);
}

function score(lead) {
  let sc = 0;
  sc += { hot: 30, warm: 18, cool: 8 }[heat(lead)] || 0;
  const b = band(lead);
  sc += { crit: 30, urgent: 22, window: 12, runway: 5, none: 5 }[b] || 0;
  (lead.signals || []).forEach((g) => {
    sc += { calc: 12, gate: 10, cta: 8, view: 3 }[g.type] || 2;
  });
  if (lead.status === "consult") sc += 15;
  return Math.min(sc, 100);
}

function firstName(lead) {
  return lead.name.split(" ")[0].replace(/\(.*/, "");
}

function calcSignal(lead) {
  const g = (lead.signals || []).find((x) => x.type === "calc");
  return g ? g.detail : "";
}

function nba(lead) {
  const d = daysToExpiry(lead);
  const b = band(lead);
  const fn = firstName(lead);
  const cs = calcSignal(lead);
  const ss = slaState(lead);
  const consultLink = "nanakmigration.com.au/book";
  const contacted = lead.contactedAt || lead.contacted;

  if (lead.subclass === "EMP") {
    return {
      title: "Send sponsor cost pack + book discovery call",
      why: "Business enquiry with cost-estimator signal. B2B moves on speed and certainty of numbers.",
      wa: `Hi, thanks for using our sponsorship cost estimator. I've attached the full 2026 cost sheet including SAF levy for your two nominations. Puneet from Nanak Migration can walk you through the process this week — book a time here: ${consultLink}`,
      ch: "Email + WhatsApp",
    };
  }
  if (!contacted && (b === "crit" || b === "urgent")) {
    return {
      title: "Call now, then WhatsApp the consult link",
      why: `${d !== null ? d + " days of runway" : "short runway"} and uncontacted — phone first, message as backup. ${ss.s === "breach" ? "SLA already breached." : ""}`,
      wa: `Hi ${fn}, it's Nanak Migration — you checked your options on our site. With your ${lead.subclass || "visa"} ending ${d !== null ? "in " + d + " days" : "soon"}, there's still a clear window to act. ${cs ? "Based on your result (" + cs.split("·")[0].trim() + "), " : ""}Navpreet (Registered Migration Agent, MARN 2619467) can map your realistic routes in one call: ${consultLink}`,
      ch: "Phone → WhatsApp",
    };
  }
  if (cs && !contacted) {
    return {
      title: "Reply to their calculator result",
      why: "They already told us their situation — respond to THAT, not with a generic welcome.",
      wa: `Hi ${fn}, thanks for using our calculator — your result (${cs.split("·")[0].trim()}) puts you in a genuinely workable position. The next step is a short eligibility chat with our Registered Migration Agent to confirm the best route. Book here: ${consultLink}`,
      ch: "WhatsApp",
    };
  }
  const created = lead.createdAt ? new Date(lead.createdAt).getTime() : lead.created;
  if (lead.status === "engaged" && now() - created > 3 * DAY && !["won", "lost"].includes(lead.status)) {
    return {
      title: "3-day nudge with their lead magnet follow-up",
      why: "Engaged but no consult after 3 days. One useful nudge, then into the nurture sequence.",
      wa: `Hi ${fn}, just checking you got the guide we sent. If it raised questions about your ${visaLabel(lead.goal) || "next step"}, a 20-minute consult usually settles them: ${consultLink}`,
      ch: "WhatsApp or email",
    };
  }
  if (lead.status === "consult") {
    return {
      title: "Confirm consult + send document checklist",
      why: "Booked — reduce no-shows with a confirmation and a simple prep list.",
      wa: `Hi ${fn}, confirming your consult with Navpreet Aulakh (MARN 2619467). To make the time count, please have your passport, current visa grant letter and CV handy. See you soon!`,
      ch: "WhatsApp + email",
    };
  }
  return {
    title: "Standard first response with lead magnet",
    why: "No strong signal yet — send value, open the door.",
    wa: `Hi ${fn}, thanks for reaching out to Nanak Migration. I've sent our guide for ${visaLabel(lead.goal) || "your enquiry"} to your email. If you'd like a professional read on your options: ${consultLink}`,
    ch: "Email",
  };
}

function enrichLead(lead) {
  const l = toLeadShape(lead);
  return {
    ...l,
    band: band(l),
    bandLabel: BAND_LABEL[band(l)],
    daysToExpiry: daysToExpiry(l),
    sla: slaState(l),
    pathway: pathway(l),
    ltv: ltv(l),
    score: score(l),
    nba: nba(l),
    triggers: triggers(l),
    visaLabel: visaLabel(l.subclass),
    goalLabel: visaLabel(l.goal),
  };
}

function counts(leads) {
  const open = leads.filter((l) => !["won", "lost"].includes(l.status));
  return {
    breach: open.filter((l) => slaState(l).s === "breach").length,
    crit: open.filter((l) => band(l) === "crit").length,
    unalloc: open.filter((l) => !l.owner).length,
  };
}

function kpiStrip(leads) {
  const open = leads.filter((l) => !["won", "lost"].includes(l.status));
  const c = counts(leads);
  const monthNew = leads.filter((l) => {
    const created = l.createdAt ? new Date(l.createdAt).getTime() : l.created;
    return now() - created < 30 * DAY;
  }).length;
  const pipeLTV = open.reduce((a, l) => a + ltv(l), 0);
  return {
    monthNew,
    awaitingContact: open.filter((l) => !(l.contactedAt || l.contacted)).length,
    slaBreaches: c.breach,
    criticalRunway: c.crit,
    pipelineLtv: pipeLTV,
  };
}

function msgText(b, kind) {
  const t = ctype(b.type);
  const fn = b.name.split(" ")[0];
  const at = new Date(b.at).getTime();
  const when = fday(at) + " at " + ftime(at);
  if (kind === "confirm") {
    return `Hi ${fn}, your ${t.name.toLowerCase()} with Nanak Migration is confirmed for ${when} (${b.mode}, looked after by our ${b.office} office).`;
  }
  if (kind === "r24") {
    return `Hi ${fn}, a reminder: your ${t.name.toLowerCase()} is tomorrow — ${when} (${b.mode}). Please have your documents ready. Reply if you need to reschedule.`;
  }
  if (kind === "r1h") {
    return `Hi ${fn}, your consultation is in 1 hour — ${ftime(at)} today (${b.mode}). See you soon.`;
  }
  if (kind === "follow") {
    return `Hi ${fn}, thanks for meeting with us today. Your summary and recommended next steps are on their way to your email. Questions? Just reply here. — Nanak Migration`;
  }
  return "";
}

function buildBookingMessages(booking) {
  const at = new Date(booking.at).getTime();
  const t = ctype(booking.type);
  const msgs = [
    { kind: "confirm", due: new Date(), sent: null },
    { kind: "r24", due: new Date(at - 24 * 60 * MIN), sent: null },
    { kind: "r1h", due: new Date(at - 60 * MIN), sent: null },
    { kind: "follow", due: new Date(at + t.dur * MIN + 90 * MIN), sent: null },
  ].filter((m) => m.kind === "confirm" || m.due.getTime() > now() - 5 * MIN);
  return msgs.map((m) => ({
    ...m,
    body: msgText({ ...booking, at }, m.kind),
  }));
}

function resolveOwnerForConsult(typeId) {
  const t = ctype(typeId);
  if (t.who.includes("Navpreet")) return RMA_NAME;
  if (t.who.includes("Puneet")) return "Puneet Singh";
  return "Intake Desk (Chandigarh)";
}

function segDefs() {
  return [
    {
      id: "485-pr",
      name: "485 holders · PR window",
      desc: "Temporary Graduate visa holders with 4–14 months of runway.",
      filter: (l) =>
        l.subclass === "485" &&
        l.expiry &&
        daysToExpiry(l) >= 120 &&
        daysToExpiry(l) <= 420,
    },
    {
      id: "student",
      name: "Student visa holders",
      desc: "Subclass 500 onshore — 485 and course-change nurture.",
      filter: (l) => l.subclass === "500",
    },
    {
      id: "employer",
      name: "Employer sponsors",
      desc: "Businesses asking about sponsorship. B2B sequence.",
      filter: (l) => l.subclass === "EMP",
    },
    {
      id: "partner",
      name: "Partner pathway",
      desc: "820/801 enquiries — evidence checklist sequence.",
      filter: (l) =>
        ["820", "801"].includes(l.subclass) || ["820", "801"].includes(l.goal),
    },
    {
      id: "skilled",
      name: "Skilled + state nomination",
      desc: "189 / 190 / 491 goals — invitation round updates.",
      filter: (l) => ["189", "190", "491"].includes(l.goal),
    },
    {
      id: "tax-bridge",
      name: "Future tax clients · Nanak Accountants",
      desc: "485 and TR holders — first Australian tax return handover.",
      filter: (l) => ["485", "482", "407"].includes(l.subclass),
    },
  ];
}

function applyRmaRule(lead, status) {
  if (status === "consult") {
    lead.owner = RMA_NAME;
    lead.status = status;
    return lead;
  }
  lead.status = status;
  return lead;
}

module.exports = {
  DAY,
  HR,
  MIN,
  now,
  toLeadShape,
  daysToExpiry,
  band,
  heat,
  slaDue,
  slaState,
  pathway,
  ltv,
  visaLabel,
  fm,
  fmins,
  fdate,
  ftime,
  fday,
  sameDay,
  ctype,
  triggers,
  score,
  nba,
  enrichLead,
  counts,
  kpiStrip,
  msgText,
  buildBookingMessages,
  resolveOwnerForConsult,
  segDefs,
  applyRmaRule,
  SOURCES,
  BAND_LABEL,
  CONSULT_TYPES,
  OFFICES,
  HEARD,
  MSG_LABEL,
  RMA_NAME,
};
