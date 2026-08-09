const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Organization = require("../models/orgModel");
const auth = require("../middleware/auth");

const router = express.Router();

const getSecret = () => process.env.JWT_SECRET || "default_super_secret_key_12345";

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
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
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                orgId: user.orgId,
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error during login" });
    }
});

// GET /api/auth/me - Return current user & tenant details
router.get("/me", auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const organization = await Organization.findById(req.orgId);
        
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                orgId: user.orgId,
            },
            organization: organization ? {
                id: organization._id,
                name: organization.name,
                createdAt: organization.createdAt,
            } : null
        });
    } catch (err) {
        console.error("Get me error:", err);
        res.status(500).json({ message: "Server error getting user context" });
    }
});

module.exports = router;
