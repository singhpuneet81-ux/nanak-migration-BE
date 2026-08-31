/** Default blog posts — exact copy from migration/src/data/blogPosts.ts */
function parseDate(str) {
  if (!str) return new Date();
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

const posts = [
  {
    slug: "skills-in-demand-salary-threshold-2026",
    title: "[DRAFT] Australia raises Skills in Demand visa salary threshold for 2026–27",
    standfirst:
      "The Department of Home Affairs has confirmed a revised income threshold for the Skills in Demand (subclass 482) Core Skills stream, taking effect from 1 July 2026. Employers nominating workers in most occupations will need to meet the updated Temporary Skilled Migration Income Threshold (TSMIT) to remain compliant.",
    body: "",
    category: "Policy Update",
    tags: ["482 visa", "employer sponsored", "salary"],
    relatedRoute: "skills-in-demand-visa",
    date: "28 Jul 2026",
  },
  {
    slug: "victoria-190-healthcare-2026",
    title: "[DRAFT] Victoria opens new round of 190 nominations for healthcare workers",
    standfirst:
      "Victoria's state nomination program has reopened for a targeted cohort of registered nurses, midwives and allied health professionals under the subclass 190 (Skilled Nominated) visa. Eligible candidates must hold a current skills assessment and meet the state's work-in-Victoria requirement.",
    body: "",
    category: "State Nomination",
    tags: ["190 visa", "state nomination", "healthcare"],
    relatedRoute: "skilled-nominated-190",
    date: "14 Jul 2026",
  },
  {
    slug: "post-study-work-rights-2026",
    title: "[DRAFT] Changes to post-study work rights for 2026 graduates explained",
    standfirst:
      "Graduates completing Australian qualifications from 1 January 2026 onward are subject to revised Temporary Graduate (subclass 485) visa conditions, including updated stream eligibility and extended stay periods for regional and STEM graduates.",
    body: "",
    category: "Student Visas",
    tags: ["485 visa", "graduates", "student"],
    relatedRoute: "temporary-graduate-485",
    date: "02 Jul 2026",
  },
  {
    slug: "ielts-vs-pte",
    title: "[DRAFT] IELTS vs PTE: which test suits your visa pathway",
    standfirst:
      "IELTS and PTE Academic are both accepted for most Australian skilled and employer-sponsored visas, but scoring structures differ significantly — understanding which test plays to your strengths can save months of preparation. This article compares the two formats, accepted score benchmarks by visa subclass, and common strategy mistakes.",
    body: "",
    category: "English Requirements",
    tags: ["IELTS", "PTE", "english requirements"],
    relatedRoute: "english-requirements",
    date: "18 Jun 2026",
  },
  {
    slug: "190-vs-491",
    title: "[DRAFT] 190 vs 491: choosing your state nomination pathway",
    standfirst:
      "The subclass 190 (Skilled Nominated) visa grants permanent residence directly, while the subclass 491 (Skilled Work Regional) is provisional and requires three years of regional living before you can apply for the subclass 191 permanent visa. Choosing between them involves weighing your occupation, available states, points score and willingness to live regionally.",
    body: "",
    category: "Skilled Migration",
    tags: ["190 visa", "491 visa", "state nomination"],
    relatedRoute: "state-nomination",
    date: "05 Jun 2026",
  },
  {
    slug: "partner-visa-timeline",
    title: "[DRAFT] Partner visa timeline: what to expect after lodgement",
    standfirst:
      "After lodging a partner visa application, most applicants enter a waiting period that currently stretches beyond two years for the permanent stage, during which work and study rights apply. Understanding the two-stage structure of the subclass 820/801 (onshore) and 309/100 (offshore) pathways helps applicants plan their lives around realistic timeframes.",
    body: "",
    category: "Partner Visas",
    tags: ["partner visa", "820 visa", "309 visa"],
    relatedRoute: "partner-visa-820-801",
    date: "22 May 2026",
  },
  {
    slug: "migration-program-2026-27",
    title: "[DRAFT] How the 2026–27 migration program planning levels work",
    standfirst:
      "Australia's annual migration program sets ceiling numbers for permanent visa grants across the Skilled, Family and Special Eligibility streams, influencing how quickly skilled migration places are allocated and which occupations attract invitation rounds. This article explains how planning levels translate into practical waiting times and what the 2026–27 figures mean for current applicants.",
    body: "",
    category: "Policy Update",
    tags: ["migration program", "planning levels", "policy"],
    relatedRoute: "skilled-migration",
    date: "10 May 2026",
  },
  {
    slug: "employer-sponsorship-costs",
    title: "[DRAFT] Employer sponsorship costs: what businesses should budget",
    standfirst:
      "Becoming a Standard Business Sponsor and nominating a worker under the subclass 482 Skills in Demand visa involves government fees, SAF levy obligations, and potential agent fees that vary by visa duration and occupation. Businesses should budget accurately from the outset to avoid delays and compliance issues mid-process.",
    body: "",
    category: "Employer Sponsored",
    tags: ["482 visa", "employer sponsorship", "SAF levy", "costs"],
    relatedRoute: "standard-business-sponsorship",
    date: "28 Apr 2026",
  },
  {
    slug: "genuine-student-assessment",
    title: "[DRAFT] Genuine Student requirement: how decision-makers assess your answers",
    standfirst:
      "The Genuine Student (GS) requirement, introduced on 23 March 2024, replaced the Genuine Temporary Entrant criterion for student visa (subclass 500) applicants, with the Department of Home Affairs now assessing a personal statement against a broader set of factors. Understanding what assessors look for — and what answers raise concerns — can significantly improve application quality.",
    body: "",
    category: "Student Visas",
    tags: ["student visa", "500 visa", "genuine student", "GS requirement"],
    relatedRoute: "genuine-student-requirement",
    date: "14 Apr 2026",
  },
  {
    slug: "bridging-visas-explained",
    title: "[DRAFT] Bridging visas explained: your status between applications",
    standfirst:
      "A Bridging Visa automatically comes into effect when a substantive visa expires while a valid application is pending, but different types — BVA, BVB and BVE — carry different work rights, travel conditions and expiry rules. Misunderstanding your bridging visa conditions is one of the most common causes of unlawful status.",
    body: "",
    category: "Bridging Visas",
    tags: ["bridging visa", "BVA", "BVB", "BVE"],
    relatedRoute: "bridging-visas",
    date: "01 Apr 2026",
  },
  {
    slug: "485-to-pr-options",
    title: "[DRAFT] From 485 to PR: mapping your options after graduation",
    standfirst:
      "The Temporary Graduate visa (subclass 485) opens a two- to four-year window to gain skilled work experience and build a points score for permanent residence, but the pathway you pursue depends heavily on your occupation, qualification level and whether regional living is an option. This article maps the most common routes from a 485 to permanent residence.",
    body: "",
    category: "Skilled Migration",
    tags: ["485 visa", "graduates", "PR pathway"],
    relatedRoute: "temporary-graduate-485",
    date: "18 Mar 2026",
  },
  {
    slug: "citizenship-test-2026",
    title: "[DRAFT] Citizenship test 2026: what has changed",
    standfirst:
      "Australia's citizenship test was updated in 2023 with a revised question bank and a stronger focus on Australian values and democratic principles, and ongoing changes to guidance materials mean preparation strategies that worked previously may no longer be sufficient. This article covers what has changed, how to prepare, and what to expect on test day.",
    body: "",
    category: "Citizenship",
    tags: ["citizenship", "citizenship test", "conferral"],
    relatedRoute: "australian-citizenship",
    date: "05 Mar 2026",
  },
];

module.exports = posts.map((b) => ({ ...b, publishedAt: parseDate(b.date) }));
