const bcrypt = require('bcryptjs')
// 加盐轮数，10 是生产常用值，越大越慢越安全
const saltRounds = 10

// 注册：把明文密码生成哈希，存入mysql
async function hashPwd(plainPwd) {
  return await bcrypt.hash(plainPwd, saltRounds)
}

// 登录：比对前端传过来的明文 和 数据库里存的哈希
async function verifyPwd(plainPwd, hashPwd) {
  return await bcrypt.compare(plainPwd, hashPwd)
}

module.exports = {
  hashPwd,
  verifyPwd
}
