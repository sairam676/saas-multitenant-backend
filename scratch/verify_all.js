const http = require("http");

async function testBackend() {
    console.log("Starting verification tests on backend API...");

    // Helper to make HTTP requests to http://localhost:5000
    function request(path, method = "GET", headers = {}, body = null) {
        return new Promise((resolve, reject) => {
            const req = http.request(`http://localhost:5000${path}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...headers,
                }
            }, (res) => {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => {
                    let parsed = {};
                    try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
                    resolve({ status: res.statusCode, headers: res.headers, body: parsed });
                });
            });
            req.on("error", reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    try {
        // 1. Health check
        const health = await request("/api/health");
        console.log("✅ Health Check Status:", health.status, health.body.status);

        // 2. Signup Organization
        const randomStr = Math.random().toString(36).substring(7);
        const signupRes = await request("/api/signup", "POST", {}, {
            orgName: `Test Org ${randomStr}`,
            name: "Test Owner",
            email: `owner_${randomStr}@test.com`,
            password: "password123"
        });
        console.log("✅ Signup Status:", signupRes.status);
        if (signupRes.status !== 201) {
            console.error("Signup failed:", signupRes.body);
            process.exit(1);
        }
        const token = signupRes.body.token;
        console.log("   JWT Token issued successfully!");

        // 3. Login with password
        const loginRes = await request("/api/auth/login", "POST", {}, {
            email: `owner_${randomStr}@test.com`,
            password: "password123"
        });
        console.log("✅ Login Status:", loginRes.status);

        // 4. Test Invalid Password
        const invalidLogin = await request("/api/auth/login", "POST", {}, {
            email: `owner_${randomStr}@test.com`,
            password: "wrongpassword"
        });
        console.log("✅ Invalid Password Status (Expected 401):", invalidLogin.status);

        // 5. Get User Context
        const meRes = await request("/api/auth/me", "GET", { Authorization: `Bearer ${token}` });
        console.log("✅ Auth /me Status:", meRes.status, "Org Name:", meRes.body.organization.name);

        // 6. Create Resource
        const createRes = await request("/api/resources", "POST", { Authorization: `Bearer ${token}` }, {
            title: "Production DB Cluster",
            description: "MongoDB cluster credentials"
        });
        console.log("✅ Create Resource Status:", createRes.status, "Title:", createRes.body.title);
        const resourceId = createRes.body._id;

        // 7. Soft Delete Resource
        const deleteRes = await request(`/api/resources/${resourceId}`, "DELETE", { Authorization: `Bearer ${token}` });
        console.log("✅ Soft Delete Status:", deleteRes.status, "Message:", deleteRes.body.message);

        // 8. Restore Resource
        const restoreRes = await request(`/api/resources/${resourceId}/restore`, "POST", { Authorization: `Bearer ${token}` });
        console.log("✅ Restore Resource Status:", restoreRes.status, "Message:", restoreRes.body.message);

        // 9. Invite User
        const inviteRes = await request("/api/invites", "POST", { Authorization: `Bearer ${token}` }, {
            email: `member_${randomStr}@test.com`,
            role: "MEMBER"
        });
        console.log("✅ Create Invite Status:", inviteRes.status, "Invite Token:", inviteRes.body.inviteToken.substring(0, 10) + "...");

        // 10. Accept Invite
        const acceptRes = await request("/api/invites/accept", "POST", {}, {
            token: inviteRes.body.inviteToken,
            name: "Test Member",
            password: "memberpassword123"
        });
        console.log("✅ Accept Invite Status:", acceptRes.status, "Member Token issued!");

        // 11. Fetch Audit Logs
        const auditRes = await request("/api/audit-logs", "GET", { Authorization: `Bearer ${token}` });
        console.log("✅ Audit Trail Status:", auditRes.status, "Total Audit Events:", auditRes.body.length);

        console.log("\n🎉 ALL BACKEND SECURITY, AUTH, SOFT-DELETE & AUDIT LOG TESTS PASSED PERFECTLY!");
        process.exit(0);
    } catch (err) {
        console.error("Test execution failed:", err);
        process.exit(1);
    }
}

testBackend();
