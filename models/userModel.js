const mongoose=require("mongoose")

const userSchema=new mongoose.Schema(
    {
        name:{
            type:String,
            required:true,
        },
        email:{
            type:String,
            unique:true,
        },
        orgId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Organization",
            required:true,
        },
        role:{
            type:String,
            enum:["OWNER","ADMIN","MEMBER"],
            default:"MEMBER",
        },
    },{timestamps:true}
);

module.exports =mongoose.model("User",userSchema);