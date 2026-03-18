const express=require("express");
const Resource = require("../models/resourceModel");
const auth=require("../middleware/auth")
const requireRole = require("../middleware/requireRole");
const router=express.Router();
const rateLimit=require("../middleware/rateLimit");
const {logAudit}=require("../utils/auditLogger");

//Auth now provides orgId
router.use(auth);
router.use(rateLimit);


router.post("/",async(req,res)=>{
    const resource = await Resource.create({
        title:req.body.title,
        orgId:req.orgId,
    });

    res.json(resource);
});

router.get("/",async(req,res)=>{
    const resources = await Resource.find({orgId:req.orgId,deletedAt:null});

    res.json(resources);
});

router.delete("/:id",auth,requireRole("OWNER","ADMIN"),async(req,res)=>{
  const result = await Resource.updateOne({
    _id: req.params.id,
    orgId: req.orgId,
    deletedAt: null,
  },{deletedAt:new Date(),});

  
if(result.modifiedCount === 0) {
  return res.status(404).json({
    message: "Resource not found",
  });
}
  await logAudit({
  orgId: req.orgId,
  actorId: req.userId,
  action: "RESOURCE_DELETED",
  resourceType: "RESOURCE",
  resourceId: req.params.id,
  metadata: {
    email: req.email,
    role: req.role,
  },
});
    res.json({message:"Deleted"});
});


//to resotre the deleted ones
router.post("/:id/restore",auth,requireRole("OWNER","ADMIN"),async(req,res)=>{
     const result = await Resource.updateOne({
    _id: req.params.id,
    orgId: req.orgId,
    deletedAt: {$ne:null},
  },{deletedAt:null});
  if(result.modifiedCount===0){
    return res.status(404).json({
      message:"Resource not found or not deleted"
    })
  }
  
    await logAudit({
      orgId: req.orgId,
      actorId: req.userId,
      action: "RESOURCE_RESTORED",
      resourceType: "Resource",
      resourceId: req.params.id,
    });
    res.json({ message: "Restored" });
})











module.exports=router;