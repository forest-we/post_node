const express = require('express')
const router = express.Router()
const verifyToken = require('../utils/verify')
const multer = require('multer')
const db = require('../sql-db/db')
const fs = require('fs')
const path = require('path')
const { UPLOAD_PREFIX, fileUrl } = require('../utils/url')

const upload = multer({
    dest: 'uploads/'
})

// 上传图片：multer 存到 uploads/，数据库只记文件名
router.post('/image/upload', verifyToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                code: 400,
                message: '请选择要上传的图片'
            })
        }
        const imagePath = req.file.filename
        console.log(imagePath);
        await db.query('INSERT INTO image (user_id, image_path) VALUES (?, ?)', [req.user.id, imagePath])
        res.status(200).json({
            code: 200,
            message: '上传成功',
            url: fileUrl(imagePath)
        })
    } catch (err) {
        console.log(err.message)
        res.status(500).json({
            code: 500,
            message: '上传时出现问题'
        })
    }
})

// 图片墙列表：所有图片 + 上传者，按时间倒序
router.get('/image/list', verifyToken, async (req, res) => {
    try {
        const page = Number(req.query.page) || 1
        const pageSize = Number(req.query.pageSize) || 15
        const offset = (page - 1) * pageSize
        const [row] = await db.query(`SELECT image.id, image.image_path, image.create_time, user.username, CONCAT(?, image.image_path) AS url FROM image JOIN user ON image.user_id = user.id ORDER BY image.create_time DESC LIMIT ?, ?`, [UPLOAD_PREFIX, offset, pageSize])
        const [www] = await db.query(`SELECT COUNT(*) as a FROM image`)
        const total = www[0].a
        res.status(200).json({
            code: 200,
            message: '查询成功',
            data: row,
            total:total
        })
    } catch (err) {
        console.log(err.message)
        res.status(500).json({
            code: 500,
            message: '查询图片列表时出现问题'
        })
    }
})
router.get('/image/user', verifyToken, async (req,res)=>{
       try{
         const page = Number(req.query.page) || 1
        const pageSize = Number(req.query.pageSize) || 10
        const offset = (page - 1) * pageSize
        const [row] = await db.query('SELECT id, image_path, CONCAT(?, image_path) AS url FROM image WHERE user_id = ? ORDER BY create_time DESC LIMIT ?, ?', [UPLOAD_PREFIX, req.user.id, offset, pageSize])
        const [total] = await db.query('SELECT COUNT(*) as a FROM image WHERE user_id = ?', [req.user.id])
        //总数是 COUNT 查出来的,不受 LIMIT 影响:页码越界时 data 为空但 total 仍然是真实总数
        //否则前端会显示"没有图片"而数量栏却不是 0
        return res.status(200).json({
            code:200,
            message: row.length === 0 ? '暂时没发布图片' : '查询成功',
            data:row,
            total:total[0].a
        })
       }
       catch(err){
        console.error(err);
        res.status(500).json({
            code:500,
            message:'查询发布的图片时出了点问题'
        })
       }
})
// 删除图片：只能删自己上传的，同时清理 uploads/ 里的物理文件
router.delete('/image/delete', verifyToken, async (req, res) => {
    const id = Number(req.body.id)
    if (!id) {
        return res.status(400).json({
            code: 400,
            message: '没能正确传递图片id'
        })
    }
    try {
        // 带上 user_id 条件，防止删掉别人的图片
        const [row] = await db.query('SELECT id, image_path FROM image WHERE id = ? AND user_id = ?', [id, req.user.id])
        if (row.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '图片不存在或不是你上传的'
            })
        }
        await db.query('DELETE FROM image WHERE id = ? AND user_id = ?', [id, req.user.id])
        // 数据库记录已经删掉，物理文件删不掉也只记日志，不影响接口返回成功
        const fileName = row[0].image_path
        if (fileName && !fileName.includes('/') && !fileName.includes('\\')) {
            fs.unlink(path.join(__dirname, '..', 'uploads', fileName), (err) => {
                if (err) console.log('删除图片文件失败:', err.message)
            })
        }
        res.status(200).json({
            code: 200,
            message: '删除成功'
        })
    } catch (err) {
        console.log(err.message)
        res.status(500).json({
            code: 500,
            message: '删除图片时出现问题'
        })
    }
})

module.exports = router
