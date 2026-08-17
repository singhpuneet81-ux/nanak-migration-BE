require("dotenv").config();
const { connectDB } = require("../config/db");
const User = require("../models/User");
const Lead = require("../models/Lead");
const Booking = require("../models/Booking");
const TeamMember = require("../models/TeamMember");
const RunwaySettings = require("../models/RunwaySettings");
const { buildBookingMessages, ctype } = require("../services/runway.service");

const DAY = 86400000;
const HR = 3600000;
const MIN = 60000;
const ts = () => Date.now();
const d = (n) => ts() + n * DAY;
const ago = (n) => ts() - n;

const TEAM = [
  {
    name: "Navpreet Aulakh",
    role: "Registered Migration Agent · MARN 2619467",
    office: "Truganina",
    capacity: 12,
    scope: "All advice-stage matters. Every lead that reaches consult stage sits here.",
    sortOrder: 0,
  },
  {
    name: "Puneet Singh",
    role: "Operations Director",
    office: "Truganina",
    capacity: 6,
    scope: "Employer sponsorship and commercial enquiries, pre-advice stage.",
    sortOrder: 1,
  },
  {
    name: "Intake Desk (Chandigarh)",
    role: "First contact + consult booking",
    office: "Chandigarh",
    capacity: 24,
    scope: "First response and booking only. No immigration assistance is given at this desk.",
    sortOrder: 2,
  },
];

async function seed() {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL || "admin@nanakmigration.com.au";
  const password = process.env.SEED_ADMIN_PASSWORD || "RunwayAdmin2026!";

  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({ name: "Runway Admin", email, password, role: "owner" });
    console.log("Created admin:", email);
  } else {
    admin.password = password;
    admin.active = true;
    await admin.save();
    console.log("Admin password synced from SEED_ADMIN_PASSWORD:", email);
  }

  await TeamMember.deleteMany({});
  await TeamMember.insertMany(TEAM);
  console.log("Team seeded");

  await RunwaySettings.findOneAndUpdate(
    { key: "default" },
    {
      key: "default",
      intakeApiKey: process.env.INTAKE_API_KEY || "change-me-intake-key",
      rmaName: "Navpreet Aulakh",
    },
    { upsert: true }
  );

  const existingLeads = await Lead.countDocuments();
  if (existingLeads > 0) {
    console.log(`Skipping leads (${existingLeads} already in DB)`);
    process.exit(0);
  }

  const S = [
    ["Harpreet Brar", "485", d(52), "190", "Contact us", "", 18 * MIN, null, "new", "", "Software Engineer", "Tarneit", { email: true, sms: true, wa: true }],
    ["Simran Dhillon", "485", d(128), "190", "Points calculator", "", 5 * HR, 4.4 * HR, "engaged", "Navpreet Aulakh", "Registered Nurse", "Truganina", { email: true, sms: false, wa: true }],
    ["Akash Verma", "500", d(240), "485", "Blog", "485 to PR: your realistic options in 2026", 3 * DAY, 2.7 * DAY, "engaged", "Intake Desk (Chandigarh)", "Accounting student", "Craigieburn", { email: true, sms: false, wa: false }],
    ["Manpreet Kaur", "820", d(410), "801", "Side blog", "Partner visa evidence checklist", 1.2 * DAY, 20 * HR, "consult", "Navpreet Aulakh", "Home duties", "Cranbourne", { email: true, sms: true, wa: true }],
    ["Rohit Malhotra", "482", d(760), "186", "Blog", "Subclass 186 TRT explained", 6 * DAY, 5.8 * DAY, "consult", "Navpreet Aulakh", "Chef", "Canning Vale", { email: true, sms: false, wa: false }],
    ["Gagandeep Singh", "485", d(95), "491", "CTA banner", "", 2.1 * HR, null, "new", "", "Motor Mechanic", "Geelong", { email: true, sms: true, wa: true }],
    ["Priya Nair", "500", d(455), "485", "Newsletter", "", 9 * DAY, 8.5 * DAY, "engaged", "Intake Desk (Chandigarh)", "Nursing student", "Sydney", { email: true, sms: false, wa: false }],
    ["Jasdeep Sandhu", "482", d(305), "186", "Contact us", "", 26 * HR, 25 * HR, "engaged", "Puneet Singh", "Carpenter", "Truganina", { email: true, sms: true, wa: false }],
    ["Kiran Thapa", "", null, "500", "Points calculator", "", 3.5 * DAY, 3.2 * DAY, "engaged", "Intake Desk (Chandigarh)", "Offshore - Kathmandu", "Offshore", { email: true, sms: false, wa: true }],
    ["GreenLine Logistics (Sponsor)", "EMP", null, "482", "CTA banner", "What employer sponsorship really costs in 2026", 7 * HR, 6.1 * HR, "consult", "Puneet Singh", "Transport company - 14 staff", "Truganina", { email: true, sms: false, wa: false }],
    ["Arjun Patel", "485", d(41), "190", "Blog", "Victoria state nomination - what changed", 44 * MIN, null, "new", "", "Civil Engineer", "Point Cook", { email: true, sms: true, wa: true }],
    ["Sukhman Gill", "600", d(64), "500", "Side blog", "Student visa condition 8105 and work rights", 10 * HR, 9.2 * HR, "engaged", "Intake Desk (Chandigarh)", "Visitor - onshore", "Brisbane", { email: false, sms: false, wa: true }],
    ["Divya Sharma", "190", d(1500), "CIT", "Newsletter", "", 14 * DAY, 13.6 * DAY, "won", "Navpreet Aulakh", "Pharmacist", "Craigieburn", { email: true, sms: false, wa: false }],
    ["Baljit Sidhu", "482", d(150), "186", "Contact us", "", 3.4 * DAY, 3.35 * DAY, "lost", "Puneet Singh", "Cook", "Perth", { email: false, sms: false, wa: false }],
    ["Nisha Rai", "485", d(212), "190", "Blog", "485 to PR: your realistic options in 2026", 2 * DAY, 1.8 * DAY, "engaged", "Navpreet Aulakh", "Early Childhood Teacher", "Tarneit", { email: true, sms: true, wa: true }],
    ["Mandeep Bajwa", "407", d(178), "482", "Newsletter", "", 5 * DAY, 4.7 * DAY, "engaged", "Intake Desk (Chandigarh)", "Trainee - hospitality", "Melbourne CBD", { email: true, sms: false, wa: false }],
  ];

  const leads = [];
  for (const r of S) {
    const slug = r[0].toLowerCase().replace(/[^a-z]+/g, ".").replace(/\.$/, "");
    const lead = await Lead.create({
      name: r[0],
      email: slug + "@example.com",
      mobile: "04" + String(10000000 + Math.floor(Math.random() * 89999999)),
      subclass: r[1],
      expiry: r[2],
      goal: r[3],
      source: r[4],
      article: r[5],
      createdAt: new Date(ts() - r[6]),
      contactedAt: r[7] ? new Date(ts() - r[7]) : null,
      status: r[8],
      owner: r[9],
      occupation: r[10],
      location: r[11],
      consent: r[12],
      signals: [],
      notes: [],
    });
    leads.push(lead);
  }

  const sig = async (name, arr) => {
    const l = leads.find((x) => x.name === name);
    if (!l) return;
    l.signals = arr.map((a) => ({
      at: new Date(ts() - a[0]),
      type: a[1],
      detail: a[2],
    }));
    await l.save();
  };

  await sig("Harpreet Brar", [
    [26 * MIN, "calc", "PR Points Calculator: 65 points · weak on English (6.0) · 261313 on 190 list"],
    [24 * MIN, "gate", "Emailed points breakdown PDF"],
    [18 * MIN, "cta", "Tapped: Ask about my result on WhatsApp"],
  ]);
  await sig("Simran Dhillon", [
    [6 * HR, "calc", "PR Points Calculator: 85 points · 254412 · 190 strong"],
    [5.5 * HR, "gate", "Emailed points breakdown PDF"],
  ]);
  await sig("Gagandeep Singh", [
    [2.4 * HR, "calc", "Expiry Checker: 485 ends in 95 days · shown 491 regional route"],
    [2.1 * HR, "cta", "CTA banner: Book a strategy call"],
  ]);
  await sig("Arjun Patel", [
    [52 * MIN, "view", "Read: Victoria state nomination - what changed (x2)"],
    [47 * MIN, "calc", "Expiry Checker: 485 ends in 41 days"],
    [44 * MIN, "gate", "Downloaded: 485 endgame checklist"],
  ]);
  await sig("GreenLine Logistics (Sponsor)", [
    [8 * HR, "calc", "Sponsor Cost Estimator: 2 nominations · SAF levy est $3,600"],
    [7 * HR, "gate", "Downloaded: sponsorship cost sheet"],
  ]);
  await sig("Kiran Thapa", [
    [3.6 * DAY, "calc", "PR Points Calculator (offshore): 70 points · needs onshore study route"],
    [3.5 * DAY, "gate", "Emailed points breakdown PDF"],
  ]);
  await sig("Manpreet Kaur", [
    [1.3 * DAY, "gate", "Downloaded: partner evidence checklist"],
    [1.1 * DAY, "cta", "Side blog CTA: consult request"],
  ]);
  await sig("Sukhman Gill", [
    [11 * HR, "view", "Read: Student visa condition 8105 (x1)"],
    [10 * HR, "gate", "Downloaded: visitor-to-student pathway guide"],
  ]);

  const at = (dOff, h, m) => {
    const x = new Date();
    x.setDate(x.getDate() + dOff);
    x.setHours(h, m, 0, 0);
    return x;
  };

  const mk = leads.find((x) => x.name === "Manpreet Kaur");
  const b1 = await Booking.create({
    leadId: mk._id,
    name: mk.name,
    email: mk.email,
    mobile: mk.mobile,
    type: "family",
    office: "Cranbourne",
    mode: "Video",
    at: new Date(ts() + 2 * HR),
    topic: "Partner visa 820/801",
    oaf: {
      status: "completed",
      data: {
        subclass: "820",
        goal: "801",
        occ: "Home duties",
        refusal: "No",
        family: "Partner",
        history: "Onshore since 2023, 820 granted Nov 2025.",
      },
    },
    msgs: buildBookingMessages({ name: mk.name, type: "family", at: new Date(ts() + 2 * HR), mode: "Video", office: "Cranbourne", mobile: mk.mobile }),
  });

  const ro = leads.find((x) => x.name === "Rohit Malhotra");
  await Booking.create({
    leadId: ro._id,
    name: ro.name,
    email: ro.email,
    mobile: ro.mobile,
    type: "pr",
    office: "Truganina",
    mode: "Video",
    at: at(1, 10, 30),
    topic: "186 TRT transition",
    msgs: buildBookingMessages({ name: ro.name, type: "pr", at: at(1, 10, 30), mode: "Video", office: "Truganina", mobile: ro.mobile }),
  });

  const gl = leads.find((x) => x.name === "GreenLine Logistics (Sponsor)");
  await Booking.create({
    leadId: gl._id,
    name: gl.name,
    email: gl.email,
    mobile: gl.mobile,
    type: "employer",
    office: "Truganina",
    mode: "Phone",
    at: at(2, 14, 0),
    topic: "Sponsoring 2 drivers",
    msgs: buildBookingMessages({ name: gl.name, type: "employer", at: at(2, 14, 0), mode: "Phone", office: "Truganina", mobile: gl.mobile }),
  });

  const si = leads.find((x) => x.name === "Simran Dhillon");
  const done = await Booking.create({
    leadId: si._id,
    name: si.name,
    email: si.email,
    mobile: si.mobile,
    type: "free",
    office: "Geelong",
    mode: "Phone",
    at: at(-1, 11, 0),
    status: "completed",
    topic: "190 pathway check",
    msgs: buildBookingMessages({ name: si.name, type: "free", at: at(-1, 11, 0), mode: "Phone", office: "Geelong", mobile: si.mobile }),
  });
  done.msgs.forEach((m) => {
    m.sent = new Date(at(-1, 11, 0).getTime() - 60 * MIN);
  });
  await done.save();

  const ba = leads.find((x) => x.name === "Baljit Sidhu");
  const ns = await Booking.create({
    leadId: ba._id,
    name: ba.name,
    email: ba.email,
    mobile: ba.mobile,
    type: "employer",
    office: "Truganina",
    mode: "Phone",
    at: at(-4, 15, 30),
    status: "no-show",
    topic: "186 options",
    msgs: buildBookingMessages({ name: ba.name, type: "employer", at: at(-4, 15, 30), mode: "Phone", office: "Truganina", mobile: ba.mobile }),
  });
  ns.msgs.forEach((m) => {
    if (m.kind !== "follow") m.sent = new Date(at(-4, 15, 30).getTime() - 60 * MIN);
  });
  await ns.save();

  console.log(`Seeded ${leads.length} leads and bookings`);
  console.log("Login:", email, "/", password);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
