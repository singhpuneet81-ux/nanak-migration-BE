const Lead = require("../models/Lead");
const { enrichLead, resolveOwnerForConsult, applyRmaRule } = require("./runway.service");

const WIDGET_SOURCE_MAP = {
  "visa-expiry-checker": "CTA banner",
  "pr-points-calculator": "Points calculator",
  "fee-estimator": "Contact us",
  "sponsor-cost-estimator": "CTA banner",
  "partner-scorecard": "Side blog",
  newsletter: "Newsletter",
  contact: "Contact us",
  "book-consultation": "CTA banner",
  "pathway-assessment": "Pathway assessment",
  pathway_assessment: "Pathway assessment",
  herosection_chatbot: "Pathway assessment",
};

const PUBLIC_WIDGETS = new Set([
  "pathway-assessment",
  "pathway_assessment",
  "herosection_chatbot",
  "newsletter",
  "immigration_newsletter",
]);

function mapWidgetSource(widget, explicitSource) {
  if (explicitSource) return explicitSource;
  const w = String(widget || "").toLowerCase();
  return WIDGET_SOURCE_MAP[w] || "Blog";
}

async function captureIntake(body, headers = {}) {
  const honeypot = body?.company_website || body?.lead?.company_website;
  if (honeypot) return { ok: true, skipped: true };

  const key = headers["x-nanak-intake-key"];
  const expected = process.env.INTAKE_API_KEY;
  const widget = String(body.widget || "").toLowerCase();
  const publicWidget = PUBLIC_WIDGETS.has(widget);
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
      article: body.page || leadData.article || "",
      status: "new",
      consent: {
        email: leadData.consent?.email !== false,
        sms: !!leadData.consent?.sms,
        wa: !!leadData.consent?.wa,
      },
      signals: [{ type: body.result ? "calc" : "gate", detail: signalDetail }],
      notes: body.result?.summary ? [{ text: `Hero chatbot · ${body.result.summary}` }] : [],
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
    lead.signals.unshift({
      type: body.result ? "calc" : "gate",
      detail: signalDetail,
    });
    if (body.result?.summary) {
      lead.notes.unshift({ text: `Hero chatbot · ${body.result.summary}` });
    }
    await lead.save();
  }

  return { ok: true, created, lead: enrichLead(lead) };
}

module.exports = { captureIntake, mapWidgetSource, applyRmaRule, resolveOwnerForConsult };
