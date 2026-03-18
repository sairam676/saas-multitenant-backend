const mongoose=require("mongoose");

const resourceSchema = new mongoose.Schema(
    {
        title:{
            type:String,
            required:true,
        },
        orgId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Organization",
            required:true,
        },
        deletedAt:{
            type:Date,
            default:null,
        }
    },
    {timestamps:true}
);

module.exports = mongoose.model("Resource",resourceSchema);