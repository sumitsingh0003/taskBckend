const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'w2r_taskscheduler',
    connectionLimit: 10,
  });

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
  });

// const pool = mysql.createPool({
//     host: '82.180.143.251',
//     user: 'u761864209_loginapi',
//     password: 'Kapil@$4666',
//     database: 'u761864209_loginapi',
//     connectionLimit: 10,
//   });

module.exports = {pool, connection};