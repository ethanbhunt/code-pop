// src/services/authService.js
// User authentication service - register, login, logout

import { getUsersDb, getTokensDb, getNextId, getTimestamp } from "../utils/db.js"
import { hashPassword, comparePassword, generateToken } from "../utils/crypto.js"
import { validateEmail, validateUsername, validatePassword } from "../utils/validation.js"

/**
 * Register a new user
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @param {string} email - Email address
 * @param {string} userRole - User's role default is 'customer'
 * @param {string} firstName - First name (optional)
 * @param {string} lastName - Last name (optional)
 * @returns {Object} User data without password + token
 */
export async function registerUser(username, password, email, userRole = "customer",  firstName = "", lastName = "") {
  // Validate inputs
  if (!validateUsername(username)) {
    throw new Error("Invalid username. Must be 3-50 characters, alphanumeric and underscores only")
  }
  if (!validatePassword(password)) {
    throw new Error("Invalid password. Must be at least 8 characters")
  }
  if (!validateEmail(email)) {
    throw new Error("Invalid email address")
  }

  const usersDb = getUsersDb()

  // Check if username already exists
  const allUsers = await usersDb.all()
  const userExists = allUsers.some(entry => {
    const user = entry.value
    return user && user.username && user.username.toLowerCase() === username.toLowerCase()
  })

  if (userExists) {
    throw new Error("Username already exists")
  }

  // Check if email already exists
  const emailExists = allUsers.some(entry => {
    const user = entry.value
    return user && user.email && user.email.toLowerCase() === email.toLowerCase()
  })

  if (emailExists) {
    throw new Error("Email already exists")
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Generate user ID
  const userId = await getNextId(usersDb, "user")

  // Create user object
  const user = {
    userId,
    username,
    passwordHash,
    email,
    firstName,
    lastName,
    userRole,
    dateJoined: getTimestamp(),
    lastLogin: null
  }

  // Save user to database
  await usersDb.put(`user:${userId}`, user)

  // Create token
  const tokenKey = generateToken()
  const token = {
    tokenKey,
    userId,
    createdAt: getTimestamp(),
    expiresAt: null
  }

  const tokensDb = getTokensDb()
  await tokensDb.put(`token:${tokenKey}`, token)

  // Return user data without password hash
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    enum: user.enum,
    token: tokenKey
  }
}

/**
 * Login user - authenticate and return token
 * @param {string} username - Username or email
 * @param {string} password - Plain text password
 * @returns {Object} User data without password + token
 */
export async function loginUser(username, password) {
  if (!username || !password) {
    throw new Error("Username and password are required")
  }

  const usersDb = getUsersDb()
  const allUsers = await usersDb.all()

  // Find user by username or email
  let userEntry = null
  for (const entry of allUsers) {
    const user = entry.value
    if (user && user.userId) {
      if (user.username && user.username.toLowerCase() === username.toLowerCase()) {
        userEntry = { key: entry.key, value: user }
        break
      }
      if (user.email && user.email.toLowerCase() === username.toLowerCase()) {
        userEntry = { key: entry.key, value: user }
        break
      }
    }
  }

  if (!userEntry) {
    throw new Error("Invalid username or password")
  }

  const user = userEntry.value

  // Check password
  const passwordMatch = await comparePassword(password, user.passwordHash)
  if (!passwordMatch) {
    throw new Error("Invalid username or password")
  }

  // Update last login
  user.lastLogin = getTimestamp()
  await usersDb.put(userEntry.key, user)

  // Create token
  const tokenKey = generateToken()
  const token = {
    tokenKey,
    userId: user.userId,
    createdAt: getTimestamp(),
    expiresAt: null
  }

  const tokensDb = getTokensDb()
  await tokensDb.put(`token:${tokenKey}`, token)

  // Return user data without password hash
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    userRole: user.userRole,
    token: tokenKey
  }
}

/**
 * Logout user - delete token
 * @param {string} tokenKey - Token to invalidate
 * @returns {boolean} True if logout successful
 */
export async function logoutUser(tokenKey) {
  if (!tokenKey) {
    throw new Error("Token is required")
  }

  const tokensDb = getTokensDb()
  
  // Check if token exists
  const tokenExists = await tokensDb.get(`token:${tokenKey}`)
  if (!tokenExists) {
    throw new Error("Token not found")
  }

  // Delete token
  await tokensDb.del(`token:${tokenKey}`)

  return true
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Object} User data without password
 */
export async function getUserById(userId) {
  const usersDb = getUsersDb()
  const user = await usersDb.get(`user:${userId}`)

  if (!user) {
    throw new Error("User not found")
  }

  // Return user data without password hash
  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    userRole: user.userRole,
    dateJoined: user.dateJoined,
    lastLogin: user.lastLogin
  }
}

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {Object} updates - Fields to update (firstName, lastName, email)
 * @returns {Object} Updated user data
 */
export async function updateUser(userId, updates) {
  const usersDb = getUsersDb()
  const user = await usersDb.get(`user:${userId}`)

  if (!user) {
    throw new Error("User not found")
  }

  // Only allow certain fields to be updated
  if (updates.firstName) user.firstName = updates.firstName
  if (updates.lastName) user.lastName = updates.lastName
  if (updates.userRole) user.userRole = updates.userRole

  // Email can be updated but must be unique
  if (updates.email) {
    if (!validateEmail(updates.email)) {
      throw new Error("Invalid email address")
    }

    const allUsers = await usersDb.all()
    const emailTaken = allUsers.some(entry => {
      const u = entry.value
      return u && u.userId !== userId && u.email && u.email.toLowerCase() === updates.email.toLowerCase()
    })

    if (emailTaken) {
      throw new Error("Email already in use")
    }

    user.email = updates.email
  }

  // Save updated user
  await usersDb.put(`user:${userId}`, user)

  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    userRole: user.userRole
  }
}

/**
 * Delete user (admin only)
 * @param {number} userId - User ID to delete
 * @returns {boolean} True if deleted
 */
export async function deleteUser(userId) {
  const usersDb = getUsersDb()
  const user = await usersDb.get(`user:${userId}`)

  if (!user) {
    throw new Error("User not found")
  }

  // Delete user
  await usersDb.del(`user:${userId}`)

  // Delete all tokens for this user
  const tokensDb = getTokensDb()
  const allTokens = await tokensDb.all()
  for (const entry of allTokens) {
    const token = entry.value
    if (token && token.userId === userId) {
      await tokensDb.del(entry.key)
    }
  }

  return true
}

/**
 * List all users (admin only)
 * @param {number} limit - Max number of users to return (default 100)
 * @returns {Array} Array of user objects without passwords
 */
export async function listUsers(limit = 100) {
  const usersDb = getUsersDb()
  const allUsers = await usersDb.all()

  const users = []
  for (const entry of allUsers) {
    const user = entry.value
    if (user && user.userId) {
      users.push({
        userId: user.userId,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userRole: user.userRole,
        dateJoined: user.dateJoined,
        lastLogin: user.lastLogin
      })
    }
    if (users.length >= limit) break
  }

  return users
}
