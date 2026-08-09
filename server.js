require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

// Database Connection
connectDB();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/auth", require("./routes/authRoute"));
app.use("/api/signup", require("./routes/signupRoutes"));
app.use("/api/invites", require("./routes/inviteRoutes"));
app.use("/api/resources", require("./routes/resourceRoutes"));
app.use("/api/audit-logs", require("./routes/auditRoutes"));

// Health Check API
app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        system: "Multi-Tenant SaaS Backend Platform",
        timestamp: new Date().toISOString()
    });
});

// Single Page Application Fallback for Express v5
app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ message: "API endpoint not found" });
    }
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Multi-Tenant SaaS Server running on http://localhost:${PORT}`);
});
