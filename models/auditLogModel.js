const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    orgId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organization",
        required:true,
    },
    actorId:{
        type:String,
        ref:"User",
    },
    action:{
        type:String,
        required:true,
    },
    resourceType:{
        type:String,
    },
    resourceId:{
        type:mongoose.Schema.Types.ObjectId,
    },
    metadata:{
        type:Object,
    },
},{timestamps:true});

module.exports=mongoose.model("AuditLog",auditLogSchema);