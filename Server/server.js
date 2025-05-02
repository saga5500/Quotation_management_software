// server.js

const express = require('express');
const mysql = require('mysql2');
const app = express();

// Middleware to parse JSON bodies - ensure this is properly set up
app.use(express.json());
// Add URL-encoded middleware which might be needed for some clients
app.use(express.urlencoded({ extended: true }));

// Enable CORS to prevent cross-origin issues
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// MySQL Connection Configuration with enhanced options
const db = mysql.createConnection({
  host: 'localhost',
  user: 'Test',
  password: 'Test@123',
  database: 'quotation_management',
  // Add timeout settings
  connectTimeout: 10000,
  waitForConnections: true
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Create the quotations table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS quotations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      items JSON NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating quotations table:', err);
    } else {
      console.log('Quotations table initialized');
      
      // Check if status column exists, and add it if it doesn't
      const checkColumnQuery = `
        SELECT COUNT(*) AS column_exists 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'quotations' 
        AND COLUMN_NAME = 'status'
      `;
      
      db.query(checkColumnQuery, [db.config.database], (err, results) => {
        if (err) {
          console.error('Error checking for status column:', err);
          return;
        }
        
        const columnExists = results[0].column_exists > 0;
        if (!columnExists) {
          console.log('Status column does not exist. Adding it to the table...');
          
          const addColumnQuery = `
            ALTER TABLE quotations 
            ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
          `;
          
          db.query(addColumnQuery, (err) => {
            if (err) {
              console.error('Error adding status column:', err);
            } else {
              console.log('Status column added successfully');
            }
          });
        } else {
          console.log('Status column already exists');
        }
      });
    }
  });
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

// Import authentication routes
const authRoutes = require('./auth/auth-routes');

// Mount authentication routes
app.use('/api/auth', authRoutes);

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the Quotation Management API',
    version: '1.0.0',
    endpoints: {
      auth: {
        signup: '/api/auth/signup',
        login: '/api/auth/login',
        profile: '/api/auth/profile'
      },
      quotations: {
        get: '/api/quotations',
        post: '/api/quotations',
        patch: '/api/quotations/:id',
        delete: '/api/quotations/:id',
        status: '/api/quotations/:id/status'
      }
    }
  });
});

// Example API endpoint to get all quotations
app.get('/api/quotations', (req, res) => {
  console.log('GET /api/quotations endpoint hit');
  
  try {
    const query = 'SELECT * FROM quotations ORDER BY created_at DESC';
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching quotations:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      console.log(`Successfully fetched ${results.length} quotations`);
      
      // Parse the items field if it's stored as JSON string
      const parsedResults = results.map(quotation => {
        try {
          if (typeof quotation.items === 'string') {
            quotation.items = JSON.parse(quotation.items);
          }
        } catch (e) {
          console.error('Error parsing items JSON:', e);
        }
        return quotation;
      });
      
      return res.json(parsedResults);
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/quotations:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Example API endpoint to create a new quotation
app.post('/api/quotations', (req, res) => {
  console.log('POST /api/quotations endpoint hit');
  console.log('Received POST request body:', req.body);
  
  try {
    // Check if req.body exists and has required properties
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const { customer_name, items, total_amount, status } = req.body;
    
    // Validate required fields
    if (!customer_name || !items || total_amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields: customer_name, items, or total_amount' });
    }
    
    // Use the provided status or default to 'pending'
    const quotationStatus = status || 'pending';
    
    const query = 'INSERT INTO quotations (customer_name, items, total_amount, status) VALUES (?, ?, ?, ?)';
    
    db.query(query, [customer_name, JSON.stringify(items), total_amount, quotationStatus], (err, result) => {
      if (err) {
        console.error('Error creating quotation:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      return res.status(201).json({ id: result.insertId, message: 'Quotation created successfully' });
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/quotations:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// API endpoint to update a quotation
app.patch('/api/quotations/:id', (req, res) => {
  console.log(`PATCH /api/quotations/${req.params.id} endpoint hit`);
  console.log('Received PATCH request body:', req.body);
  
  try {
    // Check if req.body exists and has required properties
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const id = req.params.id;
    const { customer_name, items, total_amount, status } = req.body;
    
    // Build update query dynamically based on provided fields
    let updateFields = [];
    let values = [];
    
    if (customer_name !== undefined) {
      updateFields.push('customer_name = ?');
      values.push(customer_name);
    }
    
    if (items !== undefined) {
      updateFields.push('items = ?');
      values.push(JSON.stringify(items));
    }
    
    if (total_amount !== undefined) {
      updateFields.push('total_amount = ?');
      values.push(total_amount);
    }
    
    if (status !== undefined) {
      updateFields.push('status = ?');
      values.push(status);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Add the id to the values array for the WHERE clause
    values.push(id);
    
    const query = `UPDATE quotations SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error updating quotation:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      
      return res.json({ id: id, message: 'Quotation updated successfully' });
    });
  } catch (error) {
    console.error(`Unexpected error in PATCH /api/quotations/${req.params.id}:`, error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// API endpoint to delete a quotation
app.delete('/api/quotations/:id', (req, res) => {
  console.log(`DELETE /api/quotations/${req.params.id} endpoint hit`);
  
  try {
    const id = req.params.id;
    const query = 'DELETE FROM quotations WHERE id = ?';
    
    db.query(query, [id], (err, result) => {
      if (err) {
        console.error('Error deleting quotation:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      
      return res.json({ id: id, message: 'Quotation deleted successfully' });
    });
  } catch (error) {
    console.error(`Unexpected error in DELETE /api/quotations/${req.params.id}:`, error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// API endpoint to update quotation status
app.patch('/api/quotations/:id/status', (req, res) => {
  console.log(`PATCH /api/quotations/${req.params.id}/status endpoint hit`);
  console.log('Received status update request body:', req.body);
  
  try {
    // Check if req.body exists and has required properties
    if (!req.body || !req.body.status) {
      return res.status(400).json({ error: 'Missing status field in request body' });
    }
    
    const id = req.params.id;
    const { status } = req.body;
    
    // Validate status value
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value. Must be one of: pending, approved, rejected' });
    }
    
    const query = 'UPDATE quotations SET status = ? WHERE id = ?';
    
    db.query(query, [status, id], (err, result) => {
      if (err) {
        console.error('Error updating quotation status:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Quotation not found' });
      }
      
      return res.json({ id: id, status: status, message: 'Quotation status updated successfully' });
    });
  } catch (error) {
    console.error(`Unexpected error in PATCH /api/quotations/${req.params.id}/status:`, error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const server = app.listen(4000, () => {
  console.log('🚀 Express server running on http://localhost:4000');
});

// Add proper error handling for the server
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    db.end();
  });
});
