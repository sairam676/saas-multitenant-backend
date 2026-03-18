const requireRole = (...allowedRoles)=>{
    return(req,res,next)=>{
        if(!allowedRoles.includes(req.role)){
           return res.status(403).json({
                message:"Forrbidden no permisiion",
            });
        }
        next();
    };
};

module.exports=requireRole;