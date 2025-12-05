const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config();

// Tạo connection pool với environment variables
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'tutien_2d',
    waitForConnections: true,
    connectionLimit: 50, // Tăng từ 10 lên 50 cho multiplayer game
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✓ Database connected successfully');
        console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`  Database: ${process.env.DB_NAME || 'tutien_2d'}`);
        console.log(`  User: ${process.env.DB_USER || 'root'}`);
        connection.release();
    })
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
        console.error(`  Host: ${process.env.DB_HOST || 'localhost'}`);
        console.error(`  Database: ${process.env.DB_NAME || 'tutien_2d'}`);
    });

module.exports = pool;
