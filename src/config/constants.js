const RMA_NAME = "Navpreet Aulakh";

const SOURCES = [
  "Blog",
  "Side blog",
  "Newsletter",
  "Contact us",
  "CTA banner",
  "Points calculator",
  "Pathway assessment",
];

const HEAT = {
  "Contact us": "hot",
  "CTA banner": "hot",
  "Pathway assessment": "hot",
  "Points calculator": "warm",
  "Side blog": "warm",
  Blog: "cool",
  Newsletter: "cool",
};

const SLA_MINS = { hot: 30, warm: 240, cool: 1440 };

const VISAS = {
  500: "Student",
  485: "Temporary Graduate",
  482: "Skills in Demand",
  407: "Training",
  186: "Employer Nomination",
  189: "Skilled Independent",
  190: "Skilled Nominated",
  491: "Skilled Work Regional",
  887: "Skilled Regional PR",
  820: "Partner (onshore)",
  801: "Partner (permanent)",
  309: "Partner (offshore)",
  600: "Visitor",
  "": "No AU visa / offshore",
};

const PATHWAYS = {
  500: [
    { c: "485", f: 1800 },
    { c: "190", f: 4000 },
    { c: "CIT", f: 1200 },
  ],
  485: [
    { c: "190", f: 4000 },
    { c: "CIT", f: 1200 },
  ],
  482: [
    { c: "186", f: 6500 },
    { c: "CIT", f: 1200 },
  ],
  407: [
    { c: "482", f: 4500 },
    { c: "186", f: 6500 },
    { c: "CIT", f: 1200 },
  ],
  600: [
    { c: "500", f: 1500 },
    { c: "485", f: 1800 },
    { c: "190", f: 4000 },
    { c: "CIT", f: 1200 },
  ],
  820: [
    { c: "801", f: 2000 },
    { c: "CIT", f: 1200 },
  ],
  491: [
    { c: "887", f: 2500 },
    { c: "CIT", f: 1200 },
  ],
  190: [{ c: "CIT", f: 1200 }],
  189: [{ c: "CIT", f: 1200 }],
  186: [{ c: "CIT", f: 1200 }],
  EMP: [
    { c: "SBS", f: 3500 },
    { c: "482", f: 4500 },
    { c: "186", f: 6500 },
  ],
  "": [
    { c: "500", f: 1500 },
    { c: "485", f: 1800 },
    { c: "190", f: 4000 },
    { c: "CIT", f: 1200 },
  ],
};

const STAGE_NAMES = {
  CIT: "Citizenship",
  SBS: "Sponsorship approval",
  485: "Temporary Graduate",
  190: "Skilled Nominated",
  186: "ENS (TRT)",
  482: "Skills in Demand",
  801: "Partner permanent",
  887: "Regional PR",
  500: "Student",
};

const BAND_LABEL = {
  crit: "Critical <90d",
  urgent: "Urgent 90-180d",
  window: "Window 180-365d",
  runway: "Runway 12m+",
  none: "No expiry",
};

const CONSULT_TYPES = [
  { id: "free", name: "Quick eligibility call", dur: 15, fee: 0, who: "Intake desk", desc: "Free 15 minutes to confirm whether a paid consult is worth your money. No advice given." },
  { id: "pr", name: "PR Pathway Consultation", dur: 45, fee: 75, who: "Navpreet Aulakh (RMA)", desc: "189 / 190 / 491 and your realistic route to permanent residence." },
  { id: "family", name: "Family Visa – Parent / Partner", dur: 30, fee: 75, who: "Navpreet Aulakh (RMA)", desc: "Partner (820/801/309/100) and parent visa options and evidence." },
  { id: "temp", name: "Temporary Residency Visas", dur: 30, fee: 75, who: "Navpreet Aulakh (RMA)", desc: "485, 482, 407 and other temporary visas — conditions, timing, next steps." },
  { id: "student", name: "Student Visa", dur: 30, fee: 55, who: "Navpreet Aulakh (RMA)", desc: "New applications, extensions, course changes and condition questions." },
  { id: "visitor", name: "Visitor Visa – Australia", dur: 30, fee: 75, who: "Navpreet Aulakh (RMA)", desc: "Visitor and sponsored family visitor applications." },
  { id: "employer", name: "Employer Sponsored Visa", dur: 30, fee: 0, who: "Puneet Singh", desc: "For businesses: sponsorship costs, obligations and timelines. Free discovery call." },
  { id: "art", name: "ART / Tribunal Appeal", dur: 45, fee: 75, who: "Navpreet Aulakh (RMA)", desc: "Refusals and cancellations — review options and strict deadlines." },
  { id: "other", name: "Other Migration Services", dur: 30, fee: 75, who: "Navpreet Aulakh (RMA)", desc: "Anything not listed — tell us the situation in the notes." },
];

const OFFICES = ["Mickleham", "Truganina", "Cranbourne", "Geelong", "Canning Vale (WA)"];
const HEARD = ["Google", "TikTok", "Instagram", "Facebook", "YouTube", "Friend / family", "Existing client", "Other"];

const MSG_LABEL = {
  confirm: "Instant confirmation",
  r24: "24-hour reminder",
  r1h: "1-hour reminder",
  follow: "Post-consult follow-up",
};

module.exports = {
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
};
