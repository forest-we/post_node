const express = require('express')
require('dotenv').config({ quiet: true })
const mysql = require('mysql2/promise')

const db = mysql.createPool({
    host:process.env.HOST,
    user:process.env.DB_USER,
    password:process.env.PASSWORD,
    database:process.env.DB_NAME,
    port: process.env.SQLPORT
})
  module.exports = db