const app = {
    state: {
        token: localStorage.getItem("saas_jwt_token") || null,
        user: null,
        org: null,
        activeTab: "resourcesTab",
        resources: [],
        trash: [],
        members: [],
        invites: [],
        auditLogs: [],
    },

    init() {
        // Check for invitation token in URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const inviteToken = urlParams.get("invite");
        if (inviteToken) {
            this.openAcceptInviteModal(inviteToken);
        }

        if (this.state.token) {
            this.fetchUserContext();
        } else {
            this.renderGuestView();
        }
    },

    // HTTP Helper
    async request(url, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            ...options.headers,
        };

        if (this.state.token) {
            headers["Authorization"] = `Bearer ${this.state.token}`;
        }

        try {
            const res = await fetch(url, { ...options, headers });
            
            // Extract Rate Limit Headers
            const limit = res.headers.get("X-RateLimit-Limit");
            const remaining = res.headers.get("X-RateLimit-Remaining");
            if (limit && remaining !== null) {
                this.updateRateLimitStat(remaining, limit);
            }

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 401) {
                    this.logout(false);
                }
                throw new Error(data.message || `HTTP ${res.status} Error`);
            }

            return data;
        } catch (err) {
            throw err;
        }
    },

    // Toast Notifications
    showToast(message, type = "info") {
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${type === "success" ? "✅" : type === "error" ? "⚠️" : "ℹ️"}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    // View Rendering
    renderGuestView() {
        document.getElementById("guestHero").classList.remove("hidden");
        document.getElementById("authenticatedDashboard").classList.add("hidden");
        document.getElementById("tenantContextBadge").classList.add("hidden");
        document.getElementById("guestNav").classList.remove("hidden");
        document.getElementById("userNav").classList.add("hidden");
        document.getElementById("rateLimitBtn").classList.add("hidden");
    },

    async fetchUserContext() {
        try {
            const data = await this.request("/api/auth/me");
            this.state.user = data.user;
            this.state.org = data.organization;

            this.renderAuthenticatedView();
            this.loadTabContent();
        } catch (err) {
            console.error("Auth context error:", err);
            this.logout(false);
        }
    },

    renderAuthenticatedView() {
        document.getElementById("guestHero").classList.add("hidden");
        document.getElementById("authenticatedDashboard").classList.remove("hidden");
        document.getElementById("tenantContextBadge").classList.remove("hidden");
        document.getElementById("guestNav").classList.add("hidden");
        document.getElementById("userNav").classList.remove("hidden");
        document.getElementById("rateLimitBtn").classList.remove("hidden");

        // Header info
        document.getElementById("navOrgName").innerText = this.state.org ? this.state.org.name : "Organization";
        document.getElementById("navUserRole").innerText = this.state.user.role;
        document.getElementById("navUserName").innerText = this.state.user.name;

        // Stat cards
        document.getElementById("statOrgName").innerText = this.state.org ? this.state.org.name : "...";

        // Role-based visibility rules
        const isOwnerOrAdmin = ["OWNER", "ADMIN"].includes(this.state.user.role);
        
        // Trash & invite form & audit tab role gating
        const trashSection = document.getElementById("trashSection");
        if (trashSection) {
            trashSection.style.display = isOwnerOrAdmin ? "block" : "none";
        }
        const inviteCard = document.getElementById("inviteFormCard");
        if (inviteCard) {
            inviteCard.style.display = isOwnerOrAdmin ? "block" : "none";
        }
        const auditTabBtn = document.getElementById("auditTabBtn");
        if (auditTabBtn) {
            auditTabBtn.style.display = isOwnerOrAdmin ? "flex" : "none";
        }

        this.inspectTokenContext();
    },

    // Tab Navigation
    switchTab(tabId) {
        document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

        const targetBtn = Array.from(document.querySelectorAll(".tab-btn")).find(btn => btn.getAttribute("onclick").includes(tabId));
        if (targetBtn) targetBtn.classList.add("active");

        const targetContent = document.getElementById(tabId);
        if (targetContent) targetContent.classList.add("active");

        this.state.activeTab = tabId;
        this.loadTabContent();
    },

    loadTabContent() {
        if (!this.state.token) return;

        if (this.state.activeTab === "resourcesTab") {
            this.loadResources();
            if (["OWNER", "ADMIN"].includes(this.state.user.role)) {
                this.loadTrash();
            }
        } else if (this.state.activeTab === "membersTab") {
            this.loadMembers();
        } else if (this.state.activeTab === "auditTab" && ["OWNER", "ADMIN"].includes(this.state.user.role)) {
            this.loadAuditLogs();
        }
    },

    // Resource Actions
    async loadResources() {
        try {
            const data = await this.request("/api/resources");
            this.state.resources = data;
            document.getElementById("statResourcesCount").innerText = data.length;

            const container = document.getElementById("resourcesList");
            if (data.length === 0) {
                container.innerHTML = `<div class="empty-state">No active resources created yet for this organization.</div>`;
                return;
            }

            const canDelete = ["OWNER", "ADMIN"].includes(this.state.user.role);

            container.innerHTML = data.map(item => `
                <div class="resource-item">
                    <div>
                        <div class="resource-title">${this.escapeHtml(item.title)}</div>
                        <div class="resource-desc">${this.escapeHtml(item.description || "No description")}</div>
                    </div>
                    <div class="resource-meta">
                        <span>Created: ${new Date(item.createdAt).toLocaleDateString()}</span>
                        ${canDelete ? `<button class="btn btn-danger-ghost btn-sm" onclick="app.softDeleteResource('${item._id}')">Delete</button>` : `<span class="badge badge-accent">Active</span>`}
                    </div>
                </div>
            `).join("");
        } catch (err) {
            this.showToast("Failed to load resources: " + err.message, "error");
        }
    },

    async handleCreateResource(e) {
        e.preventDefault();
        const title = document.getElementById("resourceTitle").value;
        const description = document.getElementById("resourceDesc").value;

        try {
            await this.request("/api/resources", {
                method: "POST",
                body: JSON.stringify({ title, description }),
            });
            this.showToast("Resource created successfully!", "success");
            document.getElementById("createResourceForm").reset();
            this.loadResources();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    },

    async softDeleteResource(id) {
        if (!confirm("Are you sure you want to soft-delete this resource? It can be restored later.")) return;

        try {
            await this.request(`/api/resources/${id}`, { method: "DELETE" });
            this.showToast("Resource soft-deleted to trash", "success");
            this.loadResources();
            this.loadTrash();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    },

    async loadTrash() {
        try {
            const data = await this.request("/api/resources/trash");
            this.state.trash = data;

            const container = document.getElementById("trashList");
            if (data.length === 0) {
                container.innerHTML = `<div class="empty-state">No soft-deleted resources in trash.</div>`;
                return;
            }

            container.innerHTML = data.map(item => `
                <div class="resource-item deleted-item">
                    <div>
                        <div class="resource-title">${this.escapeHtml(item.title)}</div>
                        <div class="resource-desc">Deleted: ${new Date(item.deletedAt).toLocaleString()}</div>
                    </div>
                    <div class="resource-meta">
                        <span class="badge badge-danger">Deleted</span>
                        <button class="btn btn-primary btn-sm" onclick="app.restoreResource('${item._id}')">Restore</button>
                    </div>
                </div>
            `).join("");
        } catch (err) {
            console.error("Load trash error:", err);
        }
    },

    async restoreResource(id) {
        try {
            await this.request(`/api/resources/${id}/restore`, { method: "POST" });
            this.showToast("Resource restored successfully!", "success");
            this.loadResources();
            this.loadTrash();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    },

    // Team & Member Actions
    async loadMembers() {
        try {
            const data = await this.request("/api/invites/members");
            this.state.members = data.members;
            this.state.invites = data.pendingInvites;

            document.getElementById("statMembersCount").innerText = data.members.length;

            const membersBody = document.getElementById("membersTableBody");
            membersBody.innerHTML = data.members.map(m => `
                <tr>
                    <td><strong>${this.escapeHtml(m.name)}</strong></td>
                    <td>${this.escapeHtml(m.email)}</td>
                    <td><span class="badge ${m.role === 'OWNER' ? 'badge-primary' : m.role === 'ADMIN' ? 'badge-accent' : 'badge-warning'}">${m.role}</span></td>
                    <td>${new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
            `).join("");

            const invitesBody = document.getElementById("invitesTableBody");
            if (data.pendingInvites.length === 0) {
                invitesBody.innerHTML = `<tr><td colspan="4" class="text-center">No pending invitations.</td></tr>`;
            } else {
                invitesBody.innerHTML = data.pendingInvites.map(inv => `
                    <tr>
                        <td>${this.escapeHtml(inv.email)}</td>
                        <td><span class="badge badge-warning">${inv.role}</span></td>
                        <td><code class="code-font">${inv.token.substring(0, 10)}...</code></td>
                        <td>
                            <button class="btn btn-outline btn-sm" onclick="app.copyInviteTokenLink('${inv.token}')">Copy Link</button>
                        </td>
                    </tr>
                `).join("");
            }
        } catch (err) {
            this.showToast("Failed to load team members: " + err.message, "error");
        }
    },

    async handleInviteUser(e) {
        e.preventDefault();
        const email = document.getElementById("inviteEmail").value;
        const role = document.getElementById("inviteRole").value;

        try {
            const res = await this.request("/api/invites", {
                method: "POST",
                body: JSON.stringify({ email, role }),
            });

            this.showToast("Invitation created!", "success");
            document.getElementById("inviteUserForm").reset();

            const inviteUrl = `${window.location.origin}/?invite=${res.inviteToken}`;
            document.getElementById("generatedLinkInput").value = inviteUrl;
            document.getElementById("generatedLinkCard").classList.remove("hidden");

            this.loadMembers();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    },

    copyInviteLink() {
        const input = document.getElementById("generatedLinkInput");
        input.select();
        document.execCommand("copy");
        this.showToast("Invite link copied to clipboard!", "success");
    },

    copyInviteTokenLink(token) {
        const inviteUrl = `${window.location.origin}/?invite=${token}`;
        navigator.clipboard.writeText(inviteUrl);
        this.showToast("Invite link copied to clipboard!", "success");
    },

    // Audit Log Actions
    async loadAuditLogs() {
        try {
            const data = await this.request("/api/audit-logs");
            this.state.auditLogs = data;

            const tbody = document.getElementById("auditTableBody");
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center">No audit log records yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(log => `
                <tr>
                    <td>${new Date(log.createdAt).toLocaleString()}</td>
                    <td><span class="badge badge-primary">${this.escapeHtml(log.action)}</span></td>
                    <td>${this.escapeHtml(log.resourceType || "System")}</td>
                    <td><code class="code-font">${log.actorId ? log.actorId.substring(0, 8) + '...' : 'System'}</code></td>
                    <td><code class="code-font">${JSON.stringify(log.metadata || {})}</code></td>
                </tr>
            `).join("");
        } catch (err) {
            console.error("Load audit error:", err);
        }
    },

    // Authentication Handlers
    async handleSignup(e) {
        e.preventDefault();
        const orgName = document.getElementById("signupOrgName").value;
        const name = document.getElementById("signupName").value;
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;

        try {
            const data = await this.request("/api/signup", {
                method: "POST",
                body: JSON.stringify({ orgName, name, email, password }),
            });

            this.state.token = data.token;
            localStorage.setItem("saas_jwt_token", data.token);

            this.hideModal("signupModal");
            this.showToast("Organization & Owner Account created successfully!", "success");
            this.fetchUserContext();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const data = await this.request("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

            this.state.token = data.token;
            localStorage.setItem("saas_jwt_token", data.token);

            this.hideModal("loginModal");
            this.showToast("Signed in successfully!", "success");
            this.fetchUserContext();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    },

    async openAcceptInviteModal(token) {
        try {
            const info = await fetch(`/api/invites/info/${token}`).then(res => res.json());
            if (info.email) {
                document.getElementById("acceptInviteToken").value = token;
                document.getElementById("inviteBannerText").innerText = `Joining ${info.orgName} as ${info.role} (${info.email})`;
                this.showModal("acceptInviteModal");
            } else {
                this.showToast("Invalid or expired invitation link", "error");
            }
        } catch (err) {
            this.showToast("Error checking invitation details", "error");
        }
    },

    async handleAcceptInvite(e) {
        e.preventDefault();
        const token = document.getElementById("acceptInviteToken").value;
        const name = document.getElementById("acceptInviteName").value;
        const password = document.getElementById("acceptInvitePassword").value;

        try {
            const data = await this.request("/api/invites/accept", {
                method: "POST",
                body: JSON.stringify({ token, name, password }),
            });

            this.state.token = data.token;
            localStorage.setItem("saas_jwt_token", data.token);

            this.hideModal("acceptInviteModal");
            this.showToast("Welcome! Invitation accepted.", "success");
            
            // Clean query param from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            this.fetchUserContext();
        } catch (err) {
            this.showToast(err.message, "error");
        }
    },

    logout(notify = true) {
        this.state.token = null;
        this.state.user = null;
        this.state.org = null;
        localStorage.removeItem("saas_jwt_token");
        this.renderGuestView();
        if (notify) this.showToast("Logged out successfully", "info");
    },

    // Sandbox & Rate Limiting Test
    updateRateLimitStat(remaining, limit) {
        const statEl = document.getElementById("statRateRemaining");
        if (statEl) {
            statEl.innerText = `${remaining} / ${limit}`;
        }
    },

    async runRateLimitStressTest(count) {
        const consoleEl = document.getElementById("sandboxConsole");
        consoleEl.innerHTML = `[${new Date().toLocaleTimeString()}] Launching batch stress test with ${count} requests...\n`;

        let successCount = 0;
        let rateLimitedCount = 0;

        for (let i = 1; i <= count; i++) {
            try {
                const res = await fetch("/api/resources", {
                    headers: {
                        "Authorization": `Bearer ${this.state.token}`
                    }
                });
                
                const limit = res.headers.get("X-RateLimit-Limit");
                const remaining = res.headers.get("X-RateLimit-Remaining");

                if (res.status === 429) {
                    rateLimitedCount++;
                    consoleEl.innerHTML += `<span style="color:#ef4444;">[Req #${i}] HTTP 429 Rate Limit Exceeded! Remaining: 0</span>\n`;
                } else if (res.ok) {
                    successCount++;
                    if (i % 5 === 0 || i === count) {
                        consoleEl.innerHTML += `<span>[Req #${i}] HTTP 200 OK - Remaining capacity: ${remaining}/${limit}</span>\n`;
                    }
                }
                if (remaining !== null) {
                    this.updateRateLimitStat(remaining, limit || 100);
                }
            } catch (err) {
                consoleEl.innerHTML += `<span style="color:#ef4444;">[Req #${i}] Network Error: ${err.message}</span>\n`;
            }
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }

        consoleEl.innerHTML += `\n<strong>Test Complete: ${successCount} Successful, ${rateLimitedCount} Rate Limited (HTTP 429).</strong>\n`;
    },

    inspectTokenContext() {
        const inspector = document.getElementById("tokenInspector");
        if (!inspector || !this.state.token) return;

        try {
            const payloadBase64 = this.state.token.split(".")[1];
            const decoded = JSON.parse(atob(payloadBase64));
            inspector.innerHTML = JSON.stringify(decoded, null, 2);
        } catch (e) {
            inspector.innerHTML = "Error parsing token payload.";
        }
    },

    // Modal Helpers
    showModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove("hidden");
    },

    hideModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    },

    escapeHtml(str) {
        return String(str || "").replace(/[&<>"']/g, function (m) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[m];
        });
    }
};

document.addEventListener("DOMContentLoaded", () => app.init());
