const express=require("express");
const jwt=require("jsonwebtoken");
const User = require("../models/userModel");

const router=express.Router();

//temp secret env later
const JWT_SECRET=process.env.JWT_SECRET;

router.post("/login",async(req,res)=>{
    const{email}=req.body;

    const user =await User.findOne({email});

    if(!user){
        return res.status(404).json({message:"User not found"});
    }

    const token=jwt.sign(
        {
            userId:user._id,
            orgId:user.orgId,
            role:user.role,
        },JWT_SECRET,{expiresIn:"1h"}
    );

    res.json({token});
});

module.exports=router;
