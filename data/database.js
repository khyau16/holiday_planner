const mysql = require('mysql2/promise')

const pool = mysql.createPool({
    host: 'localhost',
    database: 'holiday_planner',
    user: 'root',
    password: 'rootuser'
});

module.exports = pool;