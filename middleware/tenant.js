const Organization = require("../models/orgModel");

const tenantContext = async(req,res,next)=>{
    const orgId = req.orgId || req.headers["x-org-id"];
    if(!orgId){
        return res.status(400).json({
            message:"Org context missing",
        });
    }

    try {
        const org = await Organization.findById(orgId);
        if(!org){
            return res.status(404).json({
                message:"Organization not found"
            });
        }

        req.orgId = orgId;
        req.org = org;
        next();
    } catch (err) {
        return res.status(400).json({ message: "Invalid organization ID format" });
    }
};

module.exports=tenantContext;