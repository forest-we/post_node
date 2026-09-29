const express = require('express')
const router = express.Router()
require('dotenv').config({ quiet: true })
const db = require('../sql-db/db')
const {hashPwd} = require('../utils/pws')
const { verifyPwd} = require('../utils/pws')
const jwt = require('jsonwebtoken')
const verifyToken = require('../utils/verify')
const { UPLOAD_PREFIX, fileUrl } = require('../utils/url')
router.post('/register', async (req,res) =>{
    const {username, password} = req.body
   try{
     if(!username || !password){
        return res.status(400).json({
            code:400,
            message:'用户名或密码格式错误'
        })
    }
    const [row] = await db.query('SELECT * FROM user WHERE username = ?', [username])
    if(row.length > 0){
        return res.status(400).json({
            code:400,
            message:'额,换一个账号吧'
        })
    }
    const pws = await hashPwd(password)
    const [rpo] = await db.query('INSERT INTO user (username, password) VALUES (?, ?)', [username, pws])
    if(rpo.affectedRows === 1){
        return res.status(200).json({
            code:200,
            message:'注册成功'
        })
    }
   }
   catch(err){
    res.status(500).json({
        code:500,
        message:'额,出点问题'
    })
    console.error(err.message);
   }
})  
router.post('/login', async (req,res) =>{
    const {username, password} = req.body
    if(!username || !password){
        return res.status(400).json({
            code:400,
            message:'账号或密码格式错误'
        })
    }
    const [row] = await db.query('SELECT * FROM user WHERE username = ?', [username])
        if(row.length === 0){
            return res.status(400).json({
                code:400,
                message:'账号或密码错误'
            })
        }
        const user = row[0]
        const ok = await verifyPwd(password, user.password)
        //密码对比失败返回空
        if(!ok){
            return res.status(400).json({
                code:400,
                message:'账号或密码错误'
            })
        }
        const token = jwt.sign(
            {username:user.username, role:user.role, id:user.id},
            process.env.JWT_SECRET,
            {expiresIn: '10h'}
        )
        res.status(200).json({
            code:200,
            message:'登录成功',
            token:token,
            data:{
                id:user.id,
                username:user.username,
                role:user.role,
                avatar:user.avatar,
                profile:user.profile
            }
        })
})

router.post('/follow', verifyToken, async (req,res) =>{  //逻辑 存入关注者和被关注者
    try{
         const {post_user_id} = req.body
        if(!post_user_id){
            return res.status(400).json({
                code:400,
                message:'没正确传递要关注的用户id'
            })
        }
        if(post_user_id === req.user.id){
            return res.status(400).json({
                code:400,
                message:'不能自己关注自己'
            })
        }
    const [tou] = await db.query('SELECT * FROM follow WHERE follow_user_id = ? AND user_id = ?', [post_user_id, req.user.id])
            if(tou.length > 0){
                await db.query('DELETE FROM follow WHERE user_id = ? AND follow_user_id = ?', [req.user.id, post_user_id])
                    return res.status(200).json({code:200, message:'取关成功', is_follow:false})
            }
    const [row] = await db.query('INSERT INTO follow (user_id, follow_user_id) VALUES (?, ?)', [req.user.id, post_user_id])
        if(row.affectedRows === 1){
            return res.status(200).json({
                code:200,
                message:'关注成功',
                is_follow:true
            })
        }
        
    }
    catch(err){
        console.error(err.message);
        res.status(500).json({
            code:500,
            message:'关注时出现问题'
        })
    }
})
router.get('/follow/status', verifyToken, async (req,res) =>{
    try{
        const post_user_id = req.query.post_user_id
        if(!post_user_id){
            return res.status(400).json({
                code:400,
                message:'没传用户id'
            })
        }
        const [row] = await db.query('SELECT * FROM follow WHERE user_id = ? AND follow_user_id = ?', [req.user.id, post_user_id])
        res.status(200).json({
            code:200,
            is_follow: row.length > 0
        })
    }
    catch(err){
        console.error(err.message)
        res.status(500).json({
            code:500,
            message:'查询关注状态时出现问题'
        })
    }
})
router.get('/follow/post-list', verifyToken, async (req,res) =>{
    try{
        const page = Number(req.query.page) || 1
        const pageSize = Number(req.query.pageSize) || 10
        const offset = (page - 1) * pageSize
        const [row] = await db.query(`SELECT post.id, post.title, post.create_time, user.username, CONCAT(?, user.avatar) AS avatar, COUNT(post_like.id) AS post_like_COUNT FROM follow JOIN post ON post.user_id = follow.follow_user_id JOIN user ON user.id = post.user_id LEFT JOIN post_like ON post_like.post_id = post.id WHERE follow.user_id = ? GROUP BY post.id, post.title, post.create_time, user.username, user.avatar ORDER BY post.create_time DESC LIMIT ?, ?`, [UPLOAD_PREFIX, req.user.id, offset, pageSize])
        const [eee] = await db.query('SELECT COUNT(*) AS total FROM post WHERE user_id IN (SELECT follow_user_id FROM follow WHERE user_id = ?)', [req.user.id])
        const total = eee[0].total
        res.status(200).json({code:200, message:'查询成功', data:row, total:total})
    }
    catch(err){
        console.error(err.message)
        res.status(500).json({code:500, message:'查询关注帖子时出现问题'})
    }
})

router.get('/post/my', verifyToken, async (req,res)=>{
        try{
            const page = Number(req.query.page) || 1
             const pageSize = Number(req.query.pageSize) || 10
            const offset = (page - 1) * pageSize
            const [wo] = await db.query('SELECT post.id, post.title, post.create_time, user.username, CONCAT(?, user.avatar) AS avatar_url, user.profile, COUNT(post_like.id) AS post_like_COUNT FROM post LEFT JOIN user ON user.id = post.user_id LEFT JOIN post_like ON post_like.post_id = post.id WHERE post.user_id = ? GROUP BY post.id, post.title, post.create_time, user.username, user.avatar, user.profile ORDER BY post.create_time DESC LIMIT ?, ?', [UPLOAD_PREFIX, req.user.id, offset, pageSize])
            const [t] = await db.query('SELECT COUNT(post.id) as a FROM post WHERE user_id = ?', [req.user.id])
             const total = t[0].a
        res.status(200).json({
            code:200,
            data:wo,
            total:total
        })
        }
        catch(err){
          console.error(err);  
            res.status(500).json({
                code:500,
                message:'额,出了点问题'
            })
        }
})  
router.get('/post/user_follow', verifyToken, async (req,res)=>{
        try{
            const [fen] = await db.query('SELECT user.id, user.username, CONCAT(?, user.avatar) AS avatar, user.profile FROM follow JOIN user ON user.id = follow.user_id WHERE follow.follow_user_id = ? ORDER BY follow.create_time DESC', [UPLOAD_PREFIX, req.user.id])
            const [yuy] = await db.query('SELECT COUNT(*) as a FROM follow WHERE follow_user_id = ?', [req.user.id])
            if(fen.length > 0){
                return res.status(200).json({
                    code:200,
                    data:fen,
                    fanslike:yuy[0].a
                })
            }
            return res.status(200).json({
                code:200,
                message:'暂时没人关注你哦',
                data:[]
            })
        }
        catch(err){
            console.error(err);
            res.status(500).json({
                code:500,
                message:'额,出了点问题'
            })
        }
})
router.get('/post/follow_user', verifyToken, async (req,res) =>{
    try{
         const [ef]  = await db.query('SELECT user.id, user.username, CONCAT(?, user.avatar) as a, user.profile FROM follow JOIN user ON user.id = follow.follow_user_id WHERE follow.user_id = ? ORDER BY follow.create_time DESC', [UPLOAD_PREFIX, req.user.id])
    const [asx] = await db.query('SELECT COUNT(*) as a FROM follow WHERE follow.user_id = ?', [req.user.id])
    if(ef.length > 0){
        return res.status(200).json({
            code:200,
            data:ef,
            userLike:asx[0].a
        })
    }
    return res.status(200).json({
        code:200,
        data:[]
    })
    }
    catch(err){
        console.error(err);
        res.status(500).json({
            code:500,
            message:'额,出了点问题'
        })
    }
})
module.exports = router

