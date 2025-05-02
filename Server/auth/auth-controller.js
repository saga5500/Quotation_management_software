// Authentication controllers for signup and login

// 1. File Structure and Dependencies
// The authentication system consists of several key files:

// auth-controller.js: Contains the business logic for authentication (signup, login, profile)
// auth-routes.js: Defines the API endpoints for authentication
// middleware.js: Contains authentication middleware for protecting routes
// db-config.js: Database connection for authentication operations
// server.js: The main server file that integrates all components









// I'll explain in detail how the authentication system in your application works, specifically focusing on which file is executed first and the flow of execution through the authentication process.

// Let me first examine the authentication files to get a better understanding:

// Read auth-controller.js

// Let me continue explaining the authentication system based on the auth-controller.js file I've examined.

// Authentication System Execution Flow
// In your application located at auth, the execution flow works as follows:

// 1. Entry Point - Server.js
// When your server starts, the main server.js file is executed first. This file:

// Sets up the Express application
// Connects to the database
// Imports and mounts the authentication routes
// The key line in server.js that connects to authentication is:

// 2. Route Registration - auth-routes.js
// The auth-routes.js file is loaded when the server imports it. This file:

// Defines which URLs are available for authentication
// Maps each URL to the corresponding controller function
// Specifies which routes need authentication middleware
// For example:

// 3. Controller Functions - auth-controller.js
// The actual authentication logic is in auth-controller.js, which I examined. This file is NOT executed first - it's only executed when a request comes in. It contains:

// signup: Creates new users with hashed passwords
// login: Verifies credentials and issues tokens
// getProfile: Returns authenticated user data
// 4. Database Connection - db-config.js
// The db-config.js file is imported by the controller to connect to your MySQL database.

// 5. Authentication Middleware - middleware.js
// The middleware verifies JWT tokens for protected routes.

// Execution Example
// Let's walk through a concrete example of what happens when a user signs up:

// User sends a POST request to /api/auth/signup with:

// Express receives the request and routes it based on the URL pattern

// It matches /api/auth/signup to the handler in auth-routes.js
// The signup function in auth-controller.js executes:

// Validates the input data (username, email, password format)
// Checks if the user already exists in the database
// Hashes the password using bcrypt
// Creates a new user record in the database
// Generates a JWT token with user information
// Sends back a response with the token and user details
// The client receives the response and stores the token for future authenticated requests

// For subsequent protected requests:

// The client includes the token in the Authorization header
// The authMiddleware function verifies the token
// If valid, the request proceeds to the protected route handler
// If invalid, an error response is sent
// Order of Execution Summary
// server.js (loaded first when server starts)
// auth-routes.js (loaded when imported by server.js)
// db-config.js (loaded when imported by auth-controller.js)
// middleware.js (loaded when imported by auth-routes.js)
// auth-controller.js (functions executed when requests are received)
// The key thing to understand is that while files are loaded in a certain order when the server starts, the actual authentication logic in the controller functions only executes when specific HTTP requests are received.

// This modular approach separates concerns and makes the code more maintainable:

// Routes define what endpoints are available
// Controllers contain the business logic
// Middleware handles cross-cutting concerns like authentication
// Database configuration is isolated for easier management

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db-config');

const JWT_SECRET = process.env.JWT_SECRET || 'quotation_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// User signup controller
const signup = (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength (at least 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username],
      async (err, results) => {
        if (err) {
          console.error('Database error during user check:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }

        if (results.length > 0) {
          return res.status(409).json({ error: 'User with this email or username already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Set user role (default to 'user' if not provided or invalid)
        const userRole = (role === 'admin') ? 'admin' : 'user';

        // Insert user into database
        db.query(
          'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          [username, email, hashedPassword, userRole],
          (err, result) => {
            if (err) {
              console.error('Error creating user:', err);
              return res.status(500).json({ error: 'Error creating user', details: err.message });
            }

            // Generate JWT token
            const token = jwt.sign(
              { id: result.insertId, username, email, role: userRole },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRES_IN }
            );

            // Return success response with token
            return res.status(201).json({
              message: 'User registered successfully',
              token,
              user: {
                id: result.insertId,
                username,
                email,
                role: userRole
              }
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Unexpected error in signup:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// User login controller
const login = (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    db.query(
      'SELECT * FROM users WHERE email = ?',
      [email],
      async (err, results) => {
        if (err) {
          console.error('Database error during login:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }

        // Check if user exists
        if (results.length === 0) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = results[0];

        // Compare password with hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user.id, username: user.username, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        // Return success response with token
        return res.status(200).json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    console.error('Unexpected error in login:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Get current user profile
const getProfile = (req, res) => {
  // req.user is set by the auth middleware
  return res.status(200).json({ user: req.user });
};

module.exports = {
  signup,
  login,
  getProfile
};