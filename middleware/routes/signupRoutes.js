const express= require("express");
const jwt = require("jsonwebtoken");
const Organization = require("../models/orgModel");
const User= require("../models/userModel");

const router = express.Router();
const JWT_SECRET="123";

router.post("/",async(req,res)=>{
    const {orgName,name,email}=req.body;

    //create org
    const org= await Organization.create({name:orgName});
 
    //create owner user
    const user=await User.create({
        name,
        email,
        orgId:org._id,
        role:"OWNER",
    });

    //issue token
    const token = jwt.sign(
        {
            userId:user._id,
            orgId:org._id,
            role:user.role,
        },
        JWT_SECRET,{expiresIn:"1h"}
    );

    res.status(201).json({token});

});
module.exports=router;