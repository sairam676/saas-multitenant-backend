const express = require("express");
const Resource = require("../models/resourceModel");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const rateLimit = require("../middleware/rateLimit");
const logAudit = require("../utils/auditLogger");

const router = express.Router();

// Enforce auth & tenant rate limiting for all resource endpoints
router.use(auth);
router.use(rateLimit);

// POST /api/resources - Create resource in current organization
router.post("/", async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Resource title is required" });
        }

        const resource = await Resource.create({
            title: title.trim(),
            description: description ? description.trim() : "",
            orgId: req.orgId,
        });

        await logAudit({
            orgId: req.orgId,
            actorId: req.userId,
            action: "RESOURCE_CREATED",
            resourceType: "Resource",
            resourceId: resource._id,
            metadata: {
                title: resource.title,
                actorEmail: req.email,
            },
        });

        res.status(201).json(resource);
    } catch (err) {
        console.error("Create resource error:", err);
        res.status(500).json({ message: "Server error creating resource" });
    }
});

// GET /api/resources - List active (non-deleted) resources for organization
router.get("/", async (req, res) => {
    try {
        const resources = await Resource.find({
            orgId: req.orgId,
            deletedAt: null
        }).sort({ createdAt: -1 });

        res.json(resources);
    } catch (err) {
        console.error("Get resources error:", err);
        res.status(500).json({ message: "Server error fetching resources" });
    }
});

// GET /api/resources/trash - List soft-deleted resources (OWNER/ADMIN only)
router.get("/trash", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
        const resources = await Resource.find({
            orgId: req.orgId,
            deletedAt: { $ne: null }
        }).sort({ deletedAt: -1 });

        res.json(resources);
    } catch (err) {
        console.error("Get deleted resources error:", err);
        res.status(500).json({ message: "Server error fetching trash items" });
    }
});

// DELETE /api/resources/:id - Soft-delete resource (OWNER/ADMIN only)
router.delete("/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
        const resource = await Resource.findOne({
            _id: req.params.id,
            orgId: req.orgId,
            deletedAt: null,
        });

        if (!resource) {
            return res.status(404).json({ message: "Resource not found or already deleted" });
        }

        resource.deletedAt = new Date();
        await resource.save();

        await logAudit({
            orgId: req.orgId,
            actorId: req.userId,
            action: "RESOURCE_DELETED",
            resourceType: "Resource",
            resourceId: resource._id,
            metadata: {
                title: resource.title,
                actorEmail: req.email,
                role: req.role,
            },
        });

        res.json({ message: "Resource moved to trash (soft-deleted)", resource });
    } catch (err) {
        console.error("Delete resource error:", err);
        res.status(500).json({ message: "Server error soft deleting resource" });
    }
});

// POST /api/resources/:id/restore - Restore soft-deleted resource (OWNER/ADMIN only)
router.post("/:id/restore", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
        const resource = await Resource.findOne({
            _id: req.params.id,
            orgId: req.orgId,
            deletedAt: { $ne: null },
        });

        if (!resource) {
            return res.status(404).json({ message: "Resource not found in trash" });
        }

        resource.deletedAt = null;
        await resource.save();

        await logAudit({
            orgId: req.orgId,
            actorId: req.userId,
            action: "RESOURCE_RESTORED",
            resourceType: "Resource",
            resourceId: resource._id,
            metadata: {
                title: resource.title,
                actorEmail: req.email,
            },
        });

        res.json({ message: "Resource successfully restored", resource });
    } catch (err) {
        console.error("Restore resource error:", err);
        res.status(500).json({ message: "Server error restoring resource" });
    }
});

module.exports = router;
