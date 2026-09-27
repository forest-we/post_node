const express = require('express')
require('dotenv').config()
const mysql = require('mysql2/promise')

const db = mysql.createPool({
    host:process.env.HOST,
    user:process.env.USER,
    password:process.env.PASSWORD,
    database:process.env.DB_NAME,
    port: process.env.SQLPORT
})
  module.exports = db