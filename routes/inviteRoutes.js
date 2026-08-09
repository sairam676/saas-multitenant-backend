const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Invite = require("../models/inviteModel");
const User = require("../models/userModel");
const Organization = require("../models/orgModel");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const logAudit = require("../utils/auditLogger");

const router = express.Router();
const getSecret = () => process.env.JWT_SECRET || "default_super_secret_key_12345";

// POST /api/invites - Invite user (OWNER or ADMIN only)
router.post("/", auth, requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
        const { email, role } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const targetRole = role === "ADMIN" ? "ADMIN" : "MEMBER";

        // Check if user already exists in system
        const existingUser = await User.findOne({ email: normalizedEmail, orgId: req.orgId });
        if (existingUser) {
            return res.status(400).json({ message: "User is already a member of this organization" });
        }

        const token = crypto.randomBytes(24).toString("hex");

        // Remove any previous unaccepted invite for this email in this org
        await Invite.deleteMany({ email: normalizedEmail, orgId: req.orgId, accepted: false });

        const invite = await Invite.create({
            email: normalizedEmail,
            orgId: req.orgId,
            role: targetRole,
            token,
            accepted: false,
        });

        // Audit log
        await logAudit({
            orgId: req.orgId,
            actorId: req.userId,
            action: "USER_INVITED",
            resourceType: "Invite",
            resourceId: invite._id,
            metadata: {
                invitedEmail: invite.email,
                role: invite.role,
                inviterEmail: req.email,
            },
        });

        res.status(201).json({
            inviteToken: token,
            invite: {
                id: invite._id,
                email: invite.email,
                role: invite.role,
                createdAt: invite.createdAt,
            },
            message: "Invitation link generated successfully",
        });
    } catch (err) {
        console.error("Invite creation error:", err);
        res.status(500).json({ message: "Server error creating invitation" });
    }
});

// GET /api/invites/info/:token - Get invite details for UI
router.get("/info/:token", async (req, res) => {
    try {
        const invite = await Invite.findOne({ token: req.params.token, accepted: false });
        if (!invite) {
            return res.status(404).json({ message: "Invalid or expired invitation token" });
        }

        const org = await Organization.findById(invite.orgId);
        res.json({
            email: invite.email,
            role: invite.role,
            orgName: org ? org.name : "Organization",
        });
    } catch (err) {
        res.status(400).json({ message: "Invalid token request" });
    }
});

// POST /api/invites/accept - Accept invitation and join organization
router.post("/accept", async (req, res) => {
    try {
        const { token, name, password } = req.body;

        if (!token || !name || !password) {
            return res.status(400).json({ message: "Token, name, and password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        const invite = await Invite.findOne({ token, accepted: false });
        if (!invite) {
            return res.status(400).json({ message: "Invalid or already accepted invitation" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        const user = await User.create({
            name: name.trim(),
            email: invite.email,
            password: hashedPassword,
            orgId: invite.orgId,
            role: invite.role,
        });

        // Mark invite accepted
        invite.accepted = true;
        await invite.save();

        // Audit log
        await logAudit({
            orgId: invite.orgId,
            actorId: user._id.toString(),
            action: "INVITE_ACCEPTED",
            resourceType: "User",
            resourceId: user._id,
            metadata: {
                email: user.email,
                role: user.role,
            },
        });

        // Issue token
        const jwtToken = jwt.sign(
            {
                userId: user._id,
                orgId: user.orgId,
                role: user.role,
                email: user.email,
                name: user.name,
            },
            getSecret(),
            { expiresIn: "24h" }
        );

        res.json({
            token: jwtToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                orgId: user.orgId,
            },
            message: "Account created and invitation accepted successfully",
        });
    } catch (err) {
        console.error("Accept invite error:", err);
        res.status(500).json({ message: "Server error accepting invitation" });
    }
});

// GET /api/invites/members - Get all active members and pending invites for organization
router.get("/members", auth, async (req, res) => {
    try {
        const members = await User.find({ orgId: req.orgId })
            .select("-password")
            .sort({ createdAt: -1 });

        const pendingInvites = await Invite.find({ orgId: req.orgId, accepted: false })
            .sort({ createdAt: -1 });

        res.json({
            members,
            pendingInvites,
        });
    } catch (err) {
        console.error("Get members error:", err);
        res.status(500).json({ message: "Server error fetching organization members" });
    }
});

module.exports = router;
