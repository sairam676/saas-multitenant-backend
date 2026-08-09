const rateLimitMap = new Map();

const WINDOW_SIZE=60*1000;//1min
const MAX_REQUESTS=100;//per org per window

const rateLimit=(req,res,next)=>{
    const orgId = req.orgId || req.headers["x-org-id"];
    const now = Date.now();

    if(!orgId){
        return res.status(400).json({message:"Org context missing for rate limiter"});
    }

    const entry = rateLimitMap.get(String(orgId));

    if(!entry){
        rateLimitMap.set(String(orgId),{
            count: 1,
            windowStart: now,
        });
        res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
        res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - 1);
        return next();
    }

    if(now - entry.windowStart > WINDOW_SIZE){
        entry.count = 1;
        entry.windowStart = now;
        res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
        res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - 1);
        return next();
    }

    if(entry.count >= MAX_REQUESTS){
        res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
        res.setHeader("X-RateLimit-Remaining", 0);
        return res.status(429).json({
            message:"Rate limit exceeded for this tenant organization. Please try again later.",
            limit: MAX_REQUESTS,
            windowMs: WINDOW_SIZE
        });
    }

    entry.count++;
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - entry.count));
    next();
};

module.exports=rateLimit;

