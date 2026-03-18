# Multi-Tenant SaaS Backend Platform

A production-grade backend system designed to support multiple organizations (tenants) with strict data isolation, role-based access control, audit logging, soft deletes, and per-tenant rate limiting.

This project focuses on backend architecture, security boundaries, and system behavior, rather than UI or feature-heavy CRUD.

---

## Tech Stack

- Node.js  
- Express.js  
- MongoDB Atlas  
- Mongoose  
- JWT Authentication  
- Role-Based Access Control (RBAC)  
- dotenv  
- GitHub  

---

## Core Concepts Implemented

### Multi-Tenancy with Strict Isolation

- Single shared MongoDB database architecture  
- Every non-global entity is scoped by `orgId`  
- All queries enforce tenant boundaries  
- Prevents accidental or malicious cross-tenant data access  

---

### Authentication and Tenant Context

- JWT-based authentication  
- `orgId`, `userId`, and `role` are derived from signed JWT tokens  
- Client never supplies tenant identifiers directly  
- Tenant context is resolved server-side via middleware  

---

### Role-Based Access Control (RBAC)

- Supported roles:  
  - OWNER  
  - ADMIN  
  - MEMBER  
- Middleware-driven authorization  
- Centralized permission enforcement  
- Avoids scattered role checks and security bugs  

---

### Signup and Invite-Based Onboarding

- Organization is created only during signup  
- First user is automatically assigned the OWNER role  
- Additional users join via invite tokens  
- Invite tokens can be issued only by OWNER or ADMIN  
- Prevents orphan organizations and enforces clear ownership  

---

## High-ROI Production Features

### Audit Logging

- Non-blocking, append-only audit logs  
- Tracks critical actions such as:  
  - Organization creation  
  - User invitations  
  - Resource deletion and restoration  
- Remains valid even if referenced resources are deleted  

---

### Soft Deletes and Recovery

- Business data is never hard-deleted  
- Uses `deletedAt` timestamp for safe deletion  
- Deleted data is excluded from normal read operations  
- ADMIN and OWNER can restore deleted resources  

---

### Per-Tenant Rate Limiting

- Rate limiting enforced per organization (`orgId`)  
- Protects shared infrastructure from abusive tenants  
- Implemented as middleware before business logic  
- Easily replaceable with Redis for distributed deployments  

---

## Folder Structure
```
src/
├── config/
│   └── db.js
├── middleware/
│   ├── auth.js
│   ├── requireRole.js
│   └── rateLimit.js
├── models/
│   ├── orgModel.js
│   ├── userModel.js
│   ├── resourceModel.js
│   ├── inviteModel.js
│   └── auditLogModel.js
├── routes/
│   ├── authRoutes.js
│   ├── signupRoutes.js
│   ├── inviteRoutes.js
│   └── resourceRoutes.js
├── utils/
│   └── auditLogger.js
└── server.js
```



---

## Key Design Decisions

### Why orgId-Based Isolation

Tenant isolation is enforced at the data layer using `orgId` scoping. This prevents cross-organization access and mirrors real-world SaaS architectures.

### Why No Hard Deletes

Hard deletes break audit trails and make recovery impossible. Soft deletes preserve history and allow administrative recovery.

### Why Per-Tenant Rate Limiting

In SaaS systems, abuse originates from tenants rather than IPs. Rate limiting keyed by `orgId` ensures fairness across organizations.

### Why Centralized Middleware

Authentication, tenant resolution, authorization, and rate limiting are centralized in middleware to keep controllers clean and reduce security risks.

---

## What This Project Is Not

- Not a UI-focused application  
- Not a CRUD demo  
- Not a microservices system  
- Not over-engineered with unnecessary infrastructure  

This project is intentionally scoped to demonstrate production-ready backend patterns and correct SaaS architecture thinking.

---

## Possible Extensions

- Redis-backed rate limiting for multi-instance deployments  
- Usage quotas for free vs paid plans  
- Background jobs for cleanup and notifications  
- API versioning  

---

## Author

**Devarasetty Sairam**

- GitHub: https://github.com/sairam676  
- LinkedIn: https://linkedin.com/in/sairamdevarasetty676  
