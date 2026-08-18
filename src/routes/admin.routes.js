const express = require("express");
const { protect } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/asyncHandler");
const leads = require("../controllers/leads.controller");
const bookings = require("../controllers/bookings.controller");
const ops = require("../controllers/ops.controller");

const router = express.Router();
router.use(protect);

router.get("/meta", asyncHandler(leads.meta));

router.get("/leads", asyncHandler(leads.list));
router.get("/leads/export", asyncHandler(leads.exportCsv));
router.get("/leads/radar", asyncHandler(leads.radar));
router.get("/leads/sources", asyncHandler(leads.sources));
router.get("/leads/pathways", asyncHandler(leads.pathways));
router.get("/leads/team", asyncHandler(leads.team));
router.get("/leads/segments", asyncHandler(leads.segments));
router.get("/leads/segments/export", asyncHandler(leads.segmentExport));
router.get("/leads/:id", asyncHandler(leads.getOne));
router.post("/leads", asyncHandler(leads.create));
router.patch("/leads/:id", asyncHandler(leads.update));

router.get("/bookings", asyncHandler(bookings.list));
router.get("/bookings/comms", asyncHandler(bookings.comms));
router.get("/bookings/:id", asyncHandler(bookings.getOne));
router.post("/bookings", asyncHandler(bookings.create));
router.patch("/bookings/:id", asyncHandler(bookings.update));
router.post("/bookings/:id/oaf", asyncHandler(bookings.submitOaf));

router.get("/clients", asyncHandler(ops.clients));
router.post("/clients", asyncHandler(ops.createClient));
router.patch("/clients/:id", asyncHandler(ops.updateClient));

router.get("/matters", asyncHandler(ops.matters));
router.post("/matters", asyncHandler(ops.createMatter));
router.patch("/matters/:id", asyncHandler(ops.updateMatter));

router.get("/documents", asyncHandler(ops.documents));
router.post("/documents", asyncHandler(ops.createDocument));
router.patch("/documents/:id", asyncHandler(ops.updateDocument));

router.get("/compliance", asyncHandler(ops.compliance));
router.post("/compliance", asyncHandler(ops.createCompliance));
router.patch("/compliance/:id", asyncHandler(ops.updateCompliance));

router.get("/reports", asyncHandler(ops.reports));

module.exports = router;
