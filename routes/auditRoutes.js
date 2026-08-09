const express = require("express");
const AuditLog = require("../models/auditLogModel");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

// GET /api/audit-logs - View organization audit trail (OWNER/ADMIN only)
router.get("/", auth, requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
        const logs = await AuditLog.find({ orgId: req.orgId })
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(logs);
    } catch (err) {
        console.error("Fetch audit logs error:", err);
        res.status(500).json({ message: "Server error fetching audit trail" });
    }
});

module.exports = router;
