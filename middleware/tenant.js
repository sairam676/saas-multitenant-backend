const Organization = require("../models/orgModel");

const tenantContext = async(req,res,next)=>{
    const orgId = req.headers["x-org-id"];
    if(!orgId){
        return res.status(400).json({
            message:"org context missing",
        });
    }

    const org = Organization.findById(orgId);
    if(!org){
        return res.status(404).json({
            message:"Org not found"
        })
    }

    //attach to req
    req.orgId=orgId;
    req.org=org;

    next();
};

module.exports=tenantContext;