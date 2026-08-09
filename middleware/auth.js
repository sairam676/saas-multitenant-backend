const jwt = require("jsonwebtoken");
const JWT_SECRET=process.env.JWT_SECRET;

const auth=(req,res,next)=>{
    const authHeader = req.headers.authorization;

    if(!authHeader||!authHeader.startsWith("Bearer ")){
        return res.status(401).json({message:"Unauthorized: No token provided"});
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "default_super_secret_key_12345";

    try{
        const decoded = jwt.verify(token, secret);

        req.userId = decoded.userId;
        req.orgId = decoded.orgId;
        req.role = decoded.role;
        req.email = decoded.email;
        req.name = decoded.name;

        next();
    }catch(err){
        return res.status(401).json({message:"Invalid or expired token"});
    }
};

module.exports=auth;