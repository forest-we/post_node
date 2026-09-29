const express = require('express')
const router = express.Router()
const verifyToken = require('../utils/verify')
const db = require('../sql-db/db')
const { UPLOAD_PREFIX, fileUrl } = require('../utils/url')
router.post('/post/create', verifyToken, async (req, res) =>{   //发布帖子
    try{
          const {title, content} = req.body
          console.log('用户:' + req.user.username, '发布:' + title + '正文:' + content);
    if(!title || !content){
        return res.status(400).json({
            code:400,
            message:'标题和正文不得为空'
        })
    }
    const [row] = await db.query('INSERT INTO post (title, content, user_id) VALUES (?, ?, ?)', [title, content, req.user.id])
        if(row.affectedRows === 1){
            return res.status(200).json({
                code:200,
                message:'帖子发布成功'
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
router.get('/post/list', verifyToken, async (req,res) =>{   //主页贴子展示
        try{
            console.log(req.headers['x-real-ip']);
            const page = Number(req.query.page) || 1   //页数
             const  pageSize = Number(req.query.pageSize) || 10   //查询多少条数据
    const offset = (page - 1) * pageSize   
    console.log('查询总数量:' + offset, '查询第' + page);
    const [row] = await db.query('SELECT post.id, post.title, post.create_time, user.username, CONCAT(?, user.avatar) AS avatar, COUNT(post_like.id) AS post_like_COUNT FROM post LEFT JOIN user ON post.user_id = user.id LEFT JOIN post_like ON post_like.post_id = post.id GROUP BY post.id, post.title, post.create_time, user.username, user.avatar ORDER BY post.create_time DESC LIMIT ?, ?; ', [UPLOAD_PREFIX, offset, pageSize])
    const [totle] = await db.query('SELECT COUNT(*) AS total FROM post')
    console.log(row);
    const total = totle[0].total
    if(row.length > 0){
        res.status(200).json({
            code:200,
            message:'查询成功',
            data:row,
            total:total
        })
    } else {
        res.status(200).json({
            code:200,
            message:'暂无帖子',
            data:[]
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
router.get('/post/detail', verifyToken, async (req,res) =>{     //帖子详情页
        try{
            const post_id = req.query.post_id
     console.log('详情页post.id' + post_id);
    if(!post_id){
        return res.status(400).json({
            code:400,
            message:'没正确传帖子id'
        })
    }
    const [row] = await db.query('SELECT post.title, post.content, user.id, user.username, CONCAT(?, user.avatar) AS avatar FROM post LEFT JOIN user ON post.user_id = user.id WHERE post.id = ?', [UPLOAD_PREFIX, post_id])
    console.log(row[0]);
    if(row.length === 0){
        console.log(post_id);
        return res.status(400).json({
            code:400,
            message:'该帖子都没人发'
        })
    }
    
    res.status(200).json({
        code:200,
        data:row[0]
    })
        }
        catch(err){
            res.status(500).json({
                code:500
            })
            console.log(err.message);
            
        }
})
//帖子点赞功能
router.post('/like', verifyToken, async (req,res) =>{
    const {post_id} = req.body
    try{
         if(!post_id){
        
        return res.status(400).json({
            code:400,
            message:'没有提供帖子id'
        })
    }
    const [tro] = await db.query('SELECT * FROM post_like WHERE user_id = ? AND post_id = ?', [req.user.id, post_id])
    if(tro.length > 0){
        await db.query('DELETE FROM post_like WHERE user_id=? AND post_id=?', [req.user.id, post_id])
         return res.status(200).json({code:200, message:'取消点赞成功'})
    }else{
        await db.query('INSERT INTO post_like(user_id,post_id) VALUES(?,?)',[req.user.id,post_id])
        return res.status(200).json({code:200, message:'点赞成功'}) 
    }
    }
        catch(err){
            if(err.code === 'ER_DUP_ENTRY'){
                return res.status(200).json({
                    code:200,
                    message:'已经点过赞了'
                })
            }
            console.log(err.message);
            res.status(500).json({
                code:500,
                message:'点赞时出现问题'
            })
        }

})


router.get('/follow/post', verifyToken, async (req,res) =>{
    try{
         const page = Number(req.query.page) || 1   //页数
    const  pageSize = Number(req.query.pageSize) || 10   //查询多少条数据
    const offset = (page - 1) * pageSize                                                  
    const [row] = await db.query('SELECT post.id, post.title, post.create_time, user.username, CONCAT(?, user.avatar) AS avatar, COUNT(post_like.id) AS post_like_COUNT FROM follow JOIN post ON follow.follow_user_id = post.user_id JOIN user ON post.user_id = user.id LEFT JOIN post_like ON post_like.post_id = post.id WHERE follow.user_id = ? GROUP BY post.id, post.title, post.create_time, user.username, user.avatar ORDER BY post.create_time DESC LIMIT ?, ?', [UPLOAD_PREFIX, req.user.id, offset, pageSize])
    const [eee] = await db.query('SELECT COUNT(*) AS total FROM post WHERE user_id IN (SELECT follow_user_id FROM follow WHERE user_id = ?)', [req.user.id])
    const wer = eee[0].total                                                    //列子查询 in  在指定的集合范围内
    // 之前只在 row.length > 0 时 return,空结果时没有任何响应 → 请求一直挂起直到客户端超时
    res.status(200).json({
        code:200,
        data:row,
        total:wer
    })
    }
    catch(err){
        console.log(err.message);
        res.status(500).json({
            code:500,
            message:'查询关注用户帖子时出了点问题'
        })
    }
})
router.get('/like/win', verifyToken, async (req,res) =>{
     const [row] = await db.query('SELECT post.id, post.title, count(post_like.id) as a FROM post LEFT JOIN post_like ON post.id = post_like.post_id GROUP BY post.title, post.id ORDER BY a DESC LIMIT ?, ?', [0, 9])
           res.status(200).json({
            code:200,
            data:row
           })
    })

router.delete('/post/delete', verifyToken, async (req,res) =>{
    const {post_id} = req.body
    if(!post_id){
        return res.status(400).json({
            code:400,
            message:'没能正确传递帖子id'
        })
    }
    const connection = await db.getConnection()
    try{
        await connection.beginTransaction()
        await connection.query('DELETE FROM comment WHERE post_id = ?', [post_id])
        await connection.query('DELETE FROM post_like WHERE post_id = ?', [post_id])
        const [row] = await connection.query('DELETE FROM post WHERE id = ? AND user_id = ?', [post_id, req.user.id])
        if(row.affectedRows === 0){
            await connection.rollback()
            connection.release()
            return res.status(400).json({
                code:400,
                message:'你正尝试删除不属于你的帖子'
            })
        }
        await connection.commit()
        connection.release()
        res.status(200).json({
            code:200,
            message:'删除成功'
        })
    }
    catch(err){
        console.log(err.message);
        try { await connection.rollback() } catch(e) {}
        connection.release()
        res.status(500).json({
            code:500,
            message:'删除时出了点问题'
        })
    }
})

router.post('/post/search', verifyToken, async (req,res) =>{
    const title = String(req.body.title || '').trim()
    const page = Number(req.body.page) || 1
    const  pageSize = Number(req.body.pageSize) || 10
    const offset = (page - 1) * pageSize
    try{
         if(!title){
        return res.status(400).json({
            code:400,
            message:'关键词格式错误'
        })
    }
    const keyword = `%${title}%`
    const [row] = await db.query(`SELECT post.id, post.title, post.create_time, user.username, CONCAT(?, user.avatar) AS avatar, COUNT(post_like.id) AS post_like_COUNT FROM post LEFT JOIN user ON user.id = post.user_id LEFT JOIN post_like ON post_like.post_id = post.id WHERE post.title LIKE ? GROUP BY post.id, post.title, post.create_time, user.username, user.avatar ORDER BY post.create_time DESC LIMIT ?, ?`, [UPLOAD_PREFIX, keyword, offset, pageSize])
    const [total]  = await db.query('SELECT COUNT(*) as a FROM post WHERE title LIKE ?', [keyword])
    return res.status(200).json({
        code:200,
        message: row.length > 0 ? '查询成功' : '没有找到相关帖子',
        data:row,
        total:total[0].a
    })
    }
    catch(err){
        console.error(err);
        res.status(500).json({
            code:500,
            message:'额,搜索时出现错误'
        })
    }
})

    

module.exports = router