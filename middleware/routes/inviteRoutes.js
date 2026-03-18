const express= require("express");
const crypto=require("crypto");
const Invite=require("../models/inviteModel");
const requireRole = require("../middleware/requireRole")
const User = require("../models/userModel");
const router=express.Router();
const auth = require("../middleware/auth");
const logAudit = require("../utils/auditLogger");


router.post("/",auth,requireRole("OWNER","ADMIN"),async(req,res)=>{
    const token=crypto.randomBytes(20).toString("hex");

    const invite=await Invite.create({
        email:req.body.email,
        orgId:req.orgId,
        role:req.body.role||"MEMBER",
        token,
    })
    
    //audit logging
    await logAudit({
  orgId: req.orgId,
  actorId: req.userId,
  action: "USER_INVITED",
  resourceType: "Invite",
  resourceId: invite._id,
  metadata: {
    email: invite.email,
    role: invite.role,
  },
});

    //in real SAAS mail link will be used we are using token 
    res.json({
        inviteToken:token,
        message:"Invite created(simulate email)",
    });
});

router.post("/accept",async(req,res)=>{
    const {token,name}=req.body;

    const invite = await Invite.findOne({token,acccepted:false});


    if(!invite){
       return res.status(400).json({message:"Invalid invite"});
    }

    //create User
    const user = await User.create({
        name,
        email:invite.email,
        orgId:invite.orgId,
        role:invite.role,
    })
    invite.acccepted=true;
    await invite.save();

    res.json({message:"Invite accepted"});
})
module.exports=router;
