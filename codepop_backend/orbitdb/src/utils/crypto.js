// src/utils/crypto.js
// Cryptographic utilities: password hashing, token generation

import crypto from "crypto"
import bcrypt from "bcrypt"
import { v4 as uuidv4 } from "uuid"

const SALT_ROUNDS = 10

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  if (!password) {
    throw new Error("Password cannot be empty")
  }
  try {
    return await bcrypt.hash(password, SALT_ROUNDS)
  } catch (err) {
    throw new Error(`Failed to hash password: ${err.message}`)
  }
}

/**
 * Compare a plain text password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password from database
 * @returns {Promise<boolean>} True if password matches
 */
export async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false
  }
  try {
    return await bcrypt.compare(password, hash)
  } catch (err) {
    console.error("Password comparison error:", err)
    return false
  }
}

/**
 * Generate a secure authentication token
 * Uses crypto.randomBytes + SHA256 hash
 * @returns {string} Secure token (64 hex characters)
 */
export function generateToken() {
  const randomBytes = crypto.randomBytes(32)
  const token = randomBytes.toString("hex")
  return token
}

/**
 * Generate a UUID (for entity IDs if needed)
 * @returns {string} UUID v4
 */
export function generateUUID() {
  return uuidv4()
}

/**
 * Validate token format (basic check)
 * @param {string} token - Token to validate
 * @returns {boolean} True if token looks valid
 */
export function isValidTokenFormat(token) {
  // Token should be 64 hex characters
  if (!token || typeof token !== "string") return false
  return /^[a-f0-9]{64}$/.test(token)
}

/**
 * Hash a string (for internal use, not passwords)
 * @param {string} str - String to hash
 * @returns {string} SHA256 hash
 */
export function hashString(str) {
  return crypto.createHash("sha256").update(str).digest("hex")
}
