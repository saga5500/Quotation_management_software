// Database connection configuration for auth module
const mysql = require('mysql2');
require('dotenv').config();

// MySQL Connection Configuration 
const db = mysql.createConnection({
  host: 'localhost',
  user: 'Test',
  password: 'Test@123',
  database: 'quotation_management',
  connectTimeout: 10000,
  waitForConnections: true
});

// Handle MySQL disconnections
db.on('error', function(err) {
  console.log('MySQL error:', err);
  if(err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('MySQL connection lost. Reconnecting...');
    db = mysql.createConnection(db.config);
  } else {
    throw err;
  }
});

// Initialize user table
const initUserTable = () => {
  const fs = require('fs');
  const path = require('path');
  
  // Read the SQL file
  const sqlFile = fs.readFileSync(path.join(__dirname, 'user_schema.sql'), 'utf8');
  
  // Split the SQL file into individual statements
  const statements = sqlFile.split(';').filter(stmt => stmt.trim());
  
  // Execute each statement
  statements.forEach(statement => {
    if (statement.trim()) {
      db.query(statement, (err) => {
        if (err) {
          console.error('Error executing SQL statement:', err);
          console.error('Statement:', statement);
        }
      });
    }
  });
  
  console.log('User authentication tables initialized');
};

// Initialize DB tables
initUserTable();

module.exports = db;