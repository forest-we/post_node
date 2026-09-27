# post_node

基于 Node.js + Express + MySQL 的社交帖子后端服务，提供用户注册登录、发帖、评论、点赞、关注、图片/头像上传等接口。

## 技术栈

- **Node.js** + **Express 5** — Web 框架
- **MySQL**（`mysql2/promise` 连接池）— 数据存储
- **JWT**（`jsonwebtoken`）— 登录鉴权
- **bcryptjs** — 密码加密
- **multer** — 图片 / 头像文件上传
- **cors** / **dotenv** — 跨域与配置管理

## 目录结构

```
.
├── app.js                # 应用入口，注册路由与静态资源
├── router/               # 路由模块
│   ├── user.js           # 注册、登录、关注、我的帖子等
│   ├── userAdd.js        # 用户资料、头像上传
│   ├── post.js           # 发帖、帖子列表、详情、点赞、删除
│   ├── comment.js        # 评论创建与列表
│   └── image.js          # 图片上传与列表
├── sql-db/
│   └── db.js             # MySQL 连接池
├── init.sql              # 建库建表脚本（post_show 库）
├── utils/
│   ├── pws.js            # 密码加密与校验
│   └── verify.js         # JWT 鉴权中间件
├── uploads/              # 上传文件存放目录（运行时生成，不入库）
├── .env.example          # 环境变量模板
└── .gitignore
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，按自己的环境填写：

```bash
cp .env.example .env
```

| 变量 | 说明 |
| --- | --- |
| `PORT` | 服务监听端口，默认 `5600` |
| `HOST` | MySQL 主机地址 |
| `SQLPORT` | MySQL 端口，默认 `3306` |
| `USER` | MySQL 用户名 |
| `PASSWORD` | MySQL 密码 |
| `DB_NAME` | 数据库名 |
| `JWT_SECRET` | JWT 签名密钥，请使用随机长字符串 |

### 3. 初始化数据库

在 MySQL 中创建数据库与数据表，直接执行项目根目录的 `init.sql`（含建库 + 建表 + 索引 + 外键）：

```bash
mysql -uroot -p < init.sql
```

数据表：`user`、`post`、`comment`、`post_like`、`follow`、`image`。

### 4. 启动服务

```bash
npm start
# 或
node app.js
```

服务启动后监听 `http://localhost:5600`。

## 接口概览

所有接口默认返回 JSON，需要鉴权的接口请在请求头携带：

```
Authorization: Bearer <token>
```

### 用户

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/user/register` | 否 | 用户注册 |
| POST | `/user/login` | 否 | 用户登录，返回 token |
| POST | `/api/follow` | 是 | 关注 / 取关 |
| GET | `/api/follow/status` | 是 | 查询关注状态 |
| GET | `/api/follow/post-list` | 是 | 关注者的帖子列表 |
| GET | `/post/my` | 是 | 我的帖子 |
| GET | `/post/user_follow` | 是 | 我的关注列表 |
| GET | `/post/follow_user` | 是 | 我的粉丝列表 |

### 资料与头像

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/upload` | 是 | 上传头像（字段名 `avatar`） |
| GET | `/upload` | 是 | 获取头像信息 |
| PUT | `/user/add` | 是 | 修改用户资料 |

### 帖子

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/post/create` | 是 | 发布帖子 |
| GET | `/post/list` | 是 | 帖子列表（首页） |
| GET | `/post/detail` | 是 | 帖子详情 |
| DELETE | `/post/delete` | 是 | 删除帖子 |
| POST | `/like` | 是 | 点赞 / 取消点赞 |
| GET | `/like` | 是 | 点赞状态 |
| GET | `/like/win` | 是 | 点赞排行 |

### 评论

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/comment/create` | 是 | 发表评论 |
| GET | `/comment/list` | 是 | 评论列表 |

### 图片

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/image/upload` | 是 | 上传图片（字段名 `image`） |
| GET | `/image/list` | 是 | 图片列表 |

上传后的文件通过 `/uploads/<文件名>` 静态访问。

## 安全说明

- `.env`、日志文件与 `uploads/` 内的运行时文件已通过 `.gitignore` 排除，不会提交到仓库。
- 请勿将真实数据库密码、`JWT_SECRET` 写入代码或提交到版本库。
- 部署到生产环境前，建议补充接口参数校验、上传文件类型与大小限制、请求频率限制等措施。

## License

ISC
