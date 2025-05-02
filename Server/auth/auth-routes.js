// Authentication routes
const express = require('express');
const { signup, login, getProfile } = require('./auth-controller');
const { authMiddleware } = require('./middleware');



// I'll explain in detail how the authentication controller file is executed and integrated with the rest of the application. Let me first explore the related files to get a complete picture.

// Read auth-routes.js

// Now let's look at the server.js file to see how these authentication routes are integrated into the main server application:

// Read server.js

// Let me explain in detail how the authentication controller file is executed in this application:

// How auth-controller.js is Executed in the Application
// The authentication system in your Quotation Management application is implemented through a series of interconnected files that follow the Model-View-Controller (MVC) pattern. Here's how it all works:

// 1. File Structure and Dependencies
// The authentication system consists of several key files:

// auth-controller.js: Contains the business logic for authentication (signup, login, profile)
// auth-routes.js: Defines the API endpoints for authentication
// middleware.js: Contains authentication middleware for protecting routes
// db-config.js: Database connection for authentication operations
// server.js: The main server file that integrates all components
// 2. Execution Flow
// When the server starts:

// Server Initialization:

// The server.js file is executed first, setting up the Express application
// It connects to the MySQL database and initializes tables
// It imports and mounts the authentication routes
// Route Registration:

// The line app.use('/api/auth', authRoutes); in server.js registers all auth routes under the /api/auth prefix
// This means authentication endpoints become available at:
// /api/auth/signup
// /api/auth/login
// /api/auth/profile
// Request Handling: When a client makes a request to an authentication endpoint, the following happens:

// 3. Detailed Example: Signup Process
// Let's trace exactly what happens when a user tries to sign up:

// Client sends a POST request to /api/auth/signup with user data:

// Server receives the request:

// Express routes it to the auth-routes.js handler: router.post('/signup', signup)
// This calls the signup function from auth-controller.js
// The signup controller executes:

// Validates the request data (username, email, password)
// Checks if the user already exists in the database
// If user doesn't exist:
// Hashes the password using bcrypt
// Inserts the new user into the database
// Generates a JWT token for authentication
// Returns success response with token
// Response sent back to client:

// 4. Authentication for Protected Routes
// For protected routes like /api/auth/profile:

// The route is defined with middleware: router.get('/profile', authMiddleware, getProfile)
// When a request comes in:
// authMiddleware executes first
// It extracts the JWT from the Authorization header
// Verifies the token is valid
// If valid, adds the decoded user info to req.user
// Then passes control to getProfile controller
// If invalid, returns a 401 Unauthorized error
// 5. Login Process
// Similar to signup, but:

// Client sends credentials (email + password)
// Controller retrieves the user from the database
// Compares password with stored hash using bcrypt
// If matched, generates and returns a JWT token
// Technical Implementation Details
// JWT Security:

// Tokens are signed with a secret key (from environment variable or fallback)
// Default expiration is 24 hours
// Contains user ID, username, email, and role
// Password Security:

// Passwords are hashed using bcrypt with salt rounds of 10
// Original passwords are never stored
// Database Operations:

// Uses prepared statements to prevent SQL injection
// Error handling at each database operation
// Proper validation of inputs before database operations

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes (require authentication)
router.get('/profile', authMiddleware, getProfile);

module.exports = router;