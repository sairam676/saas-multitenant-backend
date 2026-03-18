require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

const app = express();
connectDB();

app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.use("/api/resources",require("./routes/resourceRoutes"));
app.use("/api/auth",require("./routes/authRoute"))
app.use("/api/signup",require("./routes/signupRoutes"));
app.use("/api/invites",require("./routes/inviteRoutes"));


app.listen(process.env.PORT||5000,()=>{
    console.log(`Server running on port ${process.env.PORT||5000}`);
})
