const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
app.use(cors())
app.use(express.json())
const user = require('./router/user')
const post = require('./router/post')
const comment = require('./router/comment')
const userAdd = require('./router/userAdd')
const image = require('./router/image')
app.use('/uploads', express.static('uploads'))
// 所有接口统一挂到 /api 下（router 内部不要再写 /api 前缀，否则会变成 /api/api/xxx）
// nginx 只需一条 location /api/ 就能反代
app.use('/api', user)
app.use('/api', post)
app.use('/api', comment)
app.use('/api', userAdd)
app.use('/api', image)
app.listen( process.env.PORT || 5600, () =>{
        console.log('后端开放');
        
})