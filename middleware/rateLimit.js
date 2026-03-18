const rateLimitMap = new Map();

const WINDOW_SIZE=60*1000;//1min
const MAX_REQUESTS=100;//per org per window

const rateLimit=(req,res,next)=>{
    const orgId=req.orgID;
    const now = Date.now();

    if(!orgId){
        //shhould never happen if auth coorecr
        return res.status(400).json({message:"Org context missing"});
    }

    const entry = rateLimitMap.get(orgId);

    //first req from org
    if(!entry){
        rateLimitMap.set(orgId,{
            count:1,
            windowStart:now,
        });
        return next();
    }

    if(now-entry.windowStart>WINDOW_SIZE){
       entry.count=1;
       windowStart=now;
       return next();
    }

    if(entry.count>=MAX_REQUESTS){
        return res.status(429).json({message:"Rate limit exceeded. Try again later."});
    }

    entry.count++;
    next();
}

module.exports=rateLimit;

