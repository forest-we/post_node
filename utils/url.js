// 静态资源（头像 / 图片墙图片）的对外访问地址
//
// 数据库里只存文件名（如 user.avatar、image.image_path），接口返回时再拼成完整 URL。
// 部署到别的机器或域名时，只改 .env 里的 BASE_URL 即可，不用动任何业务代码。
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5600}`

// 上传目录的访问前缀，末尾带斜杠，拼文件名就能用
const UPLOAD_PREFIX = `${BASE_URL}/uploads/`

// 给 JS 侧拼地址用（SQL 里用参数传 UPLOAD_PREFIX）
const fileUrl = (name) => (name ? `${UPLOAD_PREFIX}${name}` : '')

module.exports = { BASE_URL, UPLOAD_PREFIX, fileUrl }
