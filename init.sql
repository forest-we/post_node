-- ============================================================
-- post_node 数据库初始化脚本
-- 说明：字段与索引均依据 router/*.js 与 utils/*.js 的实际 SQL 用法反推
-- 执行：mysql -uroot -p < sql-db/init.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `post_show`
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `post_show`;

-- 需要重建时按依赖倒序删除（谨慎使用）
-- DROP TABLE IF EXISTS `post_like`, `comment`, `image`, `follow`, `post`, `user`;

-- ------------------------------------------------------------
-- 用户表
-- 依据：user.js 注册/登录（username、password、role、avatar、profile）
--       userAdd.js 修改资料与头像（avatar 存文件名，profile 是签名）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    `username`    VARCHAR(50)  NOT NULL                COMMENT '用户名（唯一）',
    `password`    VARCHAR(255) NOT NULL                COMMENT 'bcrypt 加密后的密码',
    `role`        VARCHAR(20)  NOT NULL DEFAULT 'user' COMMENT '角色：user / admin',
    `avatar`      VARCHAR(255)     NULL DEFAULT NULL   COMMENT '头像文件名，拼接 /uploads/ 访问',
    `profile`     VARCHAR(255)     NULL DEFAULT NULL   COMMENT '个人签名',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_username` (`username`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户表';

-- ------------------------------------------------------------
-- 帖子表
-- 依据：post.js 发布/列表/详情/我的帖子（title、content、user_id、create_time）
--       user_id 记录该帖子属于哪个用户
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `post` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '帖子ID',
    `title`       VARCHAR(255) NOT NULL                COMMENT '标题',
    `content`     TEXT         NOT NULL                COMMENT '正文',
    `user_id`     INT UNSIGNED NOT NULL                COMMENT '发帖用户ID -> user.id',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
    PRIMARY KEY (`id`),
    KEY `idx_post_user_id` (`user_id`),
    KEY `idx_post_create_time` (`create_time`),
    CONSTRAINT `fk_post_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '帖子表';

-- ------------------------------------------------------------
-- 评论表
-- 依据：comment.js 发表评论/评论列表（content、user_id、post_id、create_time）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comment` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评论ID',
    `content`     VARCHAR(500) NOT NULL                COMMENT '评论内容',
    `user_id`     INT UNSIGNED NOT NULL                COMMENT '评论者ID -> user.id',
    `post_id`     INT UNSIGNED NOT NULL                COMMENT '所属帖子ID -> post.id',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '评论时间',
    PRIMARY KEY (`id`),
    KEY `idx_comment_post_id` (`post_id`),
    KEY `idx_comment_user_id` (`user_id`),
    CONSTRAINT `fk_comment_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_comment_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '评论表';

-- ------------------------------------------------------------
-- 点赞表（表名与代码保持一致为 post_like，注意不是保留字 like）
-- 依据：post.js /like 点赞、取消点赞、点赞排行、删除帖子时清空点赞
--       (user_id, post_id) 建立唯一索引，用于防重复点赞与 ER_DUP_ENTRY 容错
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `post_like` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '点赞ID',
    `user_id`     INT UNSIGNED NOT NULL                COMMENT '点赞用户ID -> user.id',
    `post_id`     INT UNSIGNED NOT NULL                COMMENT '被点赞帖子ID -> post.id',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_like_user_post` (`user_id`, `post_id`),
    KEY `idx_like_post_id` (`post_id`),
    CONSTRAINT `fk_like_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_like_post` FOREIGN KEY (`post_id`) REFERENCES `post` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '帖子点赞表';

-- ------------------------------------------------------------
-- 关注表
-- 依据：user.js /api/follow 关注/取关、关注状态、我的关注、我的粉丝
--       user_id = 关注者（我自己），follow_user_id = 被关注者（对方）
--       create_time 用于关注列表按时间倒序
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `follow` (
    `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '关注记录ID',
    `user_id`        INT UNSIGNED NOT NULL                COMMENT '关注者ID（主动关注的人）-> user.id',
    `follow_user_id` INT UNSIGNED NOT NULL                COMMENT '被关注者ID（被关注的人）-> user.id',
    `create_time`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '关注时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_follow_pair` (`user_id`, `follow_user_id`),
    KEY `idx_follow_user_id` (`user_id`),
    KEY `idx_follow_follow_user_id` (`follow_user_id`),
    CONSTRAINT `fk_follow_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_follow_target` FOREIGN KEY (`follow_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户关注表';

-- ------------------------------------------------------------
-- 图片表（图片墙功能）
-- 依据：image.js 上传图片（image_path 存文件名）与图片列表（按时间倒序分页）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `image` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '图片ID',
    `user_id`     INT UNSIGNED NOT NULL                COMMENT '上传者ID -> user.id',
    `image_path`  VARCHAR(255) NOT NULL                COMMENT '图片文件名，拼接 /uploads/ 访问',
    `create_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    PRIMARY KEY (`id`),
    KEY `idx_image_user_id` (`user_id`),
    KEY `idx_image_create_time` (`create_time`),
    CONSTRAINT `fk_image_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '图片表';
