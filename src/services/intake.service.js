const Lead = require("../models/Lead");
const { enrichLead, resolveOwnerForConsult, applyRmaRule } = require("./runway.service");

const WIDGET_SOURCE_MAP = {
  "visa-expiry-checker": "CTA banner",
  "pr-points-calculator": "Points calculator",
  "fee-estimator": "Contact us",
  "sponsor-cost-estimator": "CTA banner",
  "partner-scorecard": "Side blog",
  newsletter: "Newsletter",
  immigration_newsletter: "Newsletter",
  contact: "Contact us",
  "book-consultation": "CTA banner",
  "pathway-assessment": "Pathway assessment",
  pathway_assessment: "Pathway assessment",
  herosection_chatbot: "Pre-Consultation Check",
  "pre-consultation-check": "Pre-Consultation Check",
};

const PUBLIC_WIDGETS = new Set([
  "pathway-assessment",
  "pathway_assessment",
  "herosection_chatbot",
  "newsletter",
  "immigration_newsletter",
]);

function normalizeWidget(widget) {
  return String(widget || "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_");
}

/** WordPress iframe embeds — never require x-nanak-intake-key (browsers cannot hold secrets). */
function isPublicEmbedIntake(body) {
  const widget = normalizeWidget(body.widget);
  if (PUBLIC_WIDGETS.has(widget)) return true;
  if (widget.includes("newsletter")) return true;
  if (widget.includes("herosection") || widget.includes("pathway")) return true;
  return false;
}

function mapWidgetSource(widget, explicitSource) {
  if (explicitSource) return explicitSource;
  const w = normalizeWidget(widget);
  return WIDGET_SOURCE_MAP[w] || WIDGET_SOURCE_MAP[w.replace(/_/g, "-")] || "Blog";
}

async function captureIntake(body, headers = {}) {
  const honeypot = body?.company_website || body?.lead?.company_website;
  if (honeypot) return { ok: true, skipped: true };

  const key =
    headers["x-nanak-intake-key"] ||
    headers["X-Nanak-Intake-Key"] ||
    "";
  const expected = process.env.INTAKE_API_KEY;
  const widget = normalizeWidget(body.widget);
  const publicWidget = isPublicEmbedIntake(body);
  if (expected && key !== expected && !publicWidget) {
    const err = new Error("Invalid intake key");
    err.status = 401;
    throw err;
  }

  const leadData = body.lead || body;
  const email = (leadData.email || "").trim().toLowerCase();
  if (!email && !leadData.mobile) {
    const err = new Error("Email or mobile required");
    err.status = 400;
    throw err;
  }

  const source = mapWidgetSource(body.widget, leadData.source);
  const signalDetail =
    body.result?.summary ||
    (body.widget ? `${body.widget} submission` : "Website intake") +
      (body.page ? ` · ${body.page}` : "");

  const notePrefix = widget.includes("herosection") || widget.includes("pathway")
    ? "Pre-Consultation"
    : "Hero chatbot";
  const noteText = body.result?.ref
    ? `${notePrefix} · Ref ${body.result.ref} · ${body.result.summary || signalDetail}`
    : body.result?.summary
      ? `${notePrefix} · ${body.result.summary}`
      : null;

  const articleField = body.result?.ref || body.fields?.ref || body.page || leadData.article || "";

  let lead = email ? await Lead.findOne({ email }) : null;
  let created = false;

  const defaultName =
    widget === "newsletter" || widget === "immigration_newsletter"
      ? "Newsletter subscriber"
      : "New enquiry";

  if (!lead) {
    lead = await Lead.create({
      name: leadData.name || defaultName,
      email,
      mobile: leadData.mobile || leadData.phone || "",
      subclass: leadData.subclass || body.result?.code || "",
      expiry: leadData.expiry ? new Date(leadData.expiry) : null,
      goal: leadData.goal || "",
      occupation: leadData.occupation || leadData.occ || "",
      location: leadData.location || leadData.loc || leadData.city || "",
      source,
      article: articleField,
      status: "new",
      consent: {
        email: leadData.consent?.email !== false,
        sms: !!leadData.consent?.sms,
        wa: !!leadData.consent?.wa,
      },
      signals: [
        {
          type: body.result ? "calc" : "gate",
          detail: body.result?.ref ? `${signalDetail} · Ref ${body.result.ref}` : signalDetail,
        },
      ],
      notes: noteText ? [{ text: noteText }] : [],
    });
    created = true;
  } else {
    if (leadData.name) lead.name = leadData.name;
    if (leadData.mobile || leadData.phone) lead.mobile = leadData.mobile || leadData.phone;
    if (leadData.subclass || body.result?.code) lead.subclass = leadData.subclass || body.result.code;
    if (leadData.expiry) lead.expiry = new Date(leadData.expiry);
    if (leadData.goal) lead.goal = leadData.goal;
    if (leadData.occupation || leadData.occ) lead.occupation = leadData.occupation || leadData.occ;
    if (leadData.location || leadData.loc) lead.location = leadData.location || leadData.loc;
    if (articleField) lead.article = articleField;
    lead.signals.unshift({
      type: body.result ? "calc" : "gate",
      detail: body.result?.ref ? `${signalDetail} · Ref ${body.result.ref}` : signalDetail,
    });
    if (noteText) {
      lead.notes.unshift({ text: noteText });
    }
    await lead.save();
  }

  return { ok: true, created, lead: enrichLead(lead) };
}

module.exports = { captureIntake, mapWidgetSource, applyRmaRule, resolveOwnerForConsult };
