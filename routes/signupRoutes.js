const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Organization = require("../models/orgModel");
const User = require("../models/userModel");
const logAudit = require("../utils/auditLogger");

const router = express.Router();
const getSecret = () => process.env.JWT_SECRET || "default_super_secret_key_12345";

router.post("/", async (req, res) => {
    try {
        const { orgName, name, email, password } = req.body;

        if (!orgName || !name || !email || !password) {
            return res.status(400).json({ message: "Organization name, full name, email, and password are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        // 1. Create Organization
        const org = await Organization.create({ name: orgName.trim() });

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create OWNER user
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            orgId: org._id,
            role: "OWNER",
        });

        // 4. Log audit action
        await logAudit({
            orgId: org._id,
            actorId: user._id.toString(),
            action: "ORGANIZATION_CREATED",
            resourceType: "Organization",
            resourceId: org._id,
            metadata: {
                orgName: org.name,
                ownerEmail: user.email,
            },
        });

        // 5. Issue JWT Token
        const token = jwt.sign(
            {
                userId: user._id,
                orgId: org._id,
                role: user.role,
                email: user.email,
                name: user.name,
            },
            getSecret(),
            { expiresIn: "24h" }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                orgId: org._id,
            },
            organization: {
                id: org._id,
                name: org.name,
            }
        });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Server error during registration" });
    }
});

module.exports = router;
