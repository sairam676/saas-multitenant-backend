const jwt = require("jsonwebtoken");
const JWT_SECRET=process.env.JWT_SECRET;

const auth=(req,res,next)=>{
    const authHeader = req.headers.authorization;

    if(!authHeader||!authHeader.startsWith("Bearer ")){
        return res.status(401).json({message:"Unauthorized"});
    }

    const token =authHeader.split(" ")[1];

    try{
        const decoded=jwt.verify(token,JWT_SECRET);

        req.userId=decoded.userId;
        req.orgId=decoded.orgId;
        req.role=decoded.role;

        next();
    }catch(err){
        return res.status(401).json({message:"Invalid token"});
    }
};

module.exports=auth;