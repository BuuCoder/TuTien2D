const mysql = require('mysql2/promise');

// Tạo connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // Thay đổi password của bạn
    database: 'tutien_2d',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✓ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
    });

module.exports = pool;
