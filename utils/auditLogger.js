const AuditLog = require("../models/auditLogModel");

const logAudit=async({
    orgId,
    actorId,
    action,
    resourceType,
    resourceId,
    metadata={},
})=>{
    try {
        await AuditLog.create({
            orgId,
            actorId,
            action,
            resourceType,
            resourceId,
            metadata,
        });
    } catch (error) {
        console.log("Audit log failed:",error.message);
    }
};

module.exports=logAudit;