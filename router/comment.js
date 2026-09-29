const express = require('express')
const router = express.Router()
const verifyToken = require('../utils/verify')
const db = require('../sql-db/db')
const { UPLOAD_PREFIX, fileUrl } = require('../utils/url')
router.post('/comment/create', verifyToken, async (req,res) =>{
        const {content, post_id }= req.body
       try{
         if(!content){
            return res.status(400).json({
                code:400,
                message:'评论格式错误'
            })
        }
        const [row] = await db.query('SELECT * FROM post WHERE post.id = ?', [post_id])
        if(row.length === 0){
            return res.status(400).json({
                code:400,
                message:'没有这条帖子'
            })
        }
        const [eow] = await db.query('INSERT INTO comment (content, user_id, post_id) VALUES (?, ?, ?)', [content, req.user.id, post_id])
        if(eow.affectedRows === 1){
            return res.status(200).json({
                code:200,
                message:'发布成功'
            })
        }
        res.status(500).json({
            code:500,
            message:'评论发布失败'
        })
       }
       catch(err){
        console.error(err.message);
        
        res.status(500).json({
            code:500,
            message:'额,出了点问题'
        })
       }
})

router.get('/comment/list', verifyToken, async (req,res) =>{
    try{
         const post_id = req.query.post_id
         const page = Number(req.query.page) || 1
         const pageSize = Number(req.query.pageSize) || 15
         const offset = (page - 1) * pageSize
    if(!post_id){
        return res.status(400).json({
            code:400,
            message:'没正确传递帖子id'
        })
    }
    const [row] = await db.query('SELECT * FROM post WHERE post.id = ?', [post_id])
    if(row.length === 0){
        return res.status(400).json({
            code:400,
            message:'该帖子不存在,你无法看评论'
        })
    }
    const [comment] = await db.query('SELECT comment.content, comment.create_time, user.username, CONCAT(?, user.avatar) AS avatar FROM comment LEFT JOIN user ON comment.user_id = user.id WHERE comment.post_id = ? ORDER BY create_time ASC LIMIT ?, ?', [UPLOAD_PREFIX, post_id, offset, pageSize])
    const [commentS] = await  db.query('SELECT COUNT(*) as a FROM comment WHERE post_id = ?', [post_id])
    if(comment.length === 0){
                return res.status(200).json({
                    code:200,
                    message:'暂时没评论',
                    data:[],
                    total:0
                })
            }
            res.status(200).json({
                code:200,
                data:comment,
                total:commentS[0].a
            })
    }
    catch(err){
        console.error(err.message);
        res.status(500).json({
            code:500,
            message:'额,出了点问题'
        })
    }
})







module.exports = router