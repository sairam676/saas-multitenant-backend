const mongoose = require("mongoose");

const inviteSchema=new mongoose.Schema(
    {
        email:{
            type:String,
            required:true,
            unique:true,
        },
        orgId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Organization",
            required:true,
        },
        role:{
            type:String,
            enum:["ADMIN","MEMBER"],
            default:"MEMBER",
        },
        token:{
            type:String,
            required:true
        },
        accepted:{
            type:Boolean,
            default:false,
        },
    },{timestamps:true}
);

module.exports=mongoose.model("Invite",inviteSchema)