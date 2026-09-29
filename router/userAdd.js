const express = require('express')
const router = express.Router()
const verifyToken = require('../utils/verify')
const multer = require('multer')
const sharp = require('sharp')
const db = require('../sql-db/db')
const { fileUrl } = require('../utils/url')

const upload = multer({
    dest: 'uploads/'
})

router.post('/upload',  verifyToken, upload.single('avatar'), async (req,res) =>{
   try{
     if(!req.file){
        return res.status(400).json({
            code:400,
            message:'图片格式错误'
        })
    }
    if(!req.file.filename){
        return res.status(400).json({
            code:400,
            message:'图片格式错误'
        })
    }
    await sharp(req.file.path).metadata()
    const avatarPath = req.file.filename
    const [row] = await db.query('UPDATE user SET avatar = ? WHERE id = ?', [avatarPath, req.user.id])
    if(row.affectedRows === 1){
        return res.status(200).json({
            code:200,
            message:'更换成功',
            url: fileUrl(avatarPath)
        })
    }
   }
   catch(err){
    console.log(err.message);
    res.status(500).json({
        code:500,
        message:'额,出了点问题'
    })
   }
})


router.get('/upload', verifyToken,  async (req,res) =>{
    const id = req.user.id
   try{
     const [row] = await db.query('SELECT avatar FROM user WHERE id = ?', [id])
      const avatar = row[0].avatar
     console.log('用户头像:' + avatar);
        if(!row[0] || !row[0].avatar){
           return res.status(200).json({
            code:200,
            message:'头像为空',
            data:[]
           })
        }
         return res.status(200).json({
                code:200,
                url: fileUrl(avatar)
            })
   }
   catch(err){
    res.status(500).json({
        code:500,
        message:'额'
    })
    console.log(err.message);
   }
})

router.put('/user/add', verifyToken, async (req,res) =>{
    const { profile, username} = req.body
    try{
         if(!profile || !username){
        return res.status(400).json({
            code:400,
            message:'修改内容不得为空'
        })
    }
    const [wow] = await db.query('SELECT * FROM user WHERE id = ?', [req.user.id])
    if(wow.length === 0){
        return  res.status(404).json({
            code:404,
            message:'该账号不存在'
        })
    }
    const name = wow[0].username
    if(username !== name){    //新名字不等于旧名字时查询新名字是否跟已被他人使用
        const [dff] = await db.query('SELECT * FROM user WHERE username = ?', [username])
        if(dff.length > 0){
            return res.status(400).json({
                code:400,
                message:'该账号已被使用'
            })
        }
    }
    const [row] = await db.query('UPDATE user SET username = ?, profile = ? WHERE id = ?;', [username, profile, req.user.id])
        if(row.affectedRows === 1){
            return res.status(200).json({
                code:200,
                message:'修改成功',
                data:{
                    id:req.user.id,
                    username:username,
                    profile:profile
                }
            })
        }
    }
    catch(err){
        console.log(err.message);
        res.status(500).json({
            code:500,
            message:'修改时出现错误'
        })
    }
})







module.exports = router