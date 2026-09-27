const jwt = require('jsonwebtoken')
require('dotenv').config()

const verifyToken = (req, res, next) =>{
   try{
     const authHeader = req.headers.authorization
    if(!authHeader){
        return res.status(401).json({
            code:401,
            message:'你没提供有效token'
        })
    }
    const [type, token] = authHeader.split(' ')  //调用 .split(' ')，按空格切割字符串，变成数组  结果：["Bearer", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxx.xxxx"]  
    if(type !== 'Bearer' || !token){
            return res.status(401).json({
                code:401,
                message:'token格式错误'
            })
        }
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.user = payload
        next()
   }
   catch(err){
    console.log(err.message);
    res.status(401).json({
        code:401,
        message:'token无效或过期'
    })
   }
}


module.exports = verifyToken