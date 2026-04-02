// src/middleware/auth.js
// Token-based authentication middleware

import { getTokensDb, getUsersDb } from "../utils/db.js"

/** DB / seed may use legacy names; admin routes accept these. */
function hasAdminPrivileges(role) {
  const r = String(role ?? "").toLowerCase()
  return r === "admin" || r === "superadmin"
}

/** Staff-tier and above (legacy `manager` = store manager). */
function hasStaffPrivileges(role) {
  const r = String(role ?? "").toLowerCase()
  return ["staff", "manager", "admin", "superadmin"].includes(r)
}

/**
 * Authenticate request using token from Authorization header
 * Expects: Authorization: Token {tokenKey}
 * Sets: req.user = { userId, ... }
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({
        error: "Missing authorization header",
        code: "MISSING_TOKEN"
      })
    }

    // Extract token from "Token {tokenKey}" format
    const parts = authHeader.split(" ")
    if (parts.length !== 2 || parts[0] !== "Token") {
      return res.status(401).json({
        error: "Invalid authorization header format. Use: Authorization: Token {tokenKey}",
        code: "INVALID_TOKEN_FORMAT"
      })
    }

    const tokenKey = parts[1]

    // Look up token in tokens-db
    const tokensDb = getTokensDb()
    const tokenEntry = await tokensDb.get(`token:${tokenKey}`)

    if (!tokenEntry) {
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN"
      })
    }

    // Check if token is expired (if expiration is implemented)
    if (tokenEntry.expiresAt) {
      const expiresAt = new Date(tokenEntry.expiresAt)
      if (expiresAt < new Date()) {
        return res.status(401).json({
          error: "Token has expired",
          code: "EXPIRED_TOKEN"
        })
      }
    }

    // Fetch user details
    const usersDb = getUsersDb()
    const user = await usersDb.get(`user:${tokenEntry.userId}`)

    if (!user) {
      return res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND"
      })
    }

    // Attach user and token to request
    req.user = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }
    req.token = tokenKey

    next()
  } catch (err) {
    console.error("Authentication error:", err)
    res.status(500).json({
      error: "Authentication error",
      code: "AUTH_ERROR",
      details: err.message
    })
  }
}

/**
 * Require admin/superuser permission
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "NOT_AUTHENTICATED"
    })
  }

  if (!hasAdminPrivileges(req.user.role)) {
    return res.status(403).json({
      error: "Admin privileges required",
      code: "NOT_ADMIN"
    })
  }

  next()
}

/**
 * Require super admin permission
 */
export function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "NOT_AUTHENTICATED"
    })
  }

  if (req.user.userRole !== "super_admin") {
    return res.status(403).json({
      error: "Super admin privileges required",
      code: "NOT_SUPER_ADMIN"
    })
  }

  next()
}

/**
 * Require manager or admin permission
 */
export function requireManager(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "NOT_AUTHENTICATED"
    })
  }

  if (req.user.userRole !== "manager" && req.user.userRole !== "admin" && req.user.userRole !== "super_admin") {
    return res.status(403).json({
      error: "Manager privileges required",
      code: "NOT_MANAGER"
    })
  }

  next()
}

/**
 * Require repair user permission
 */
export function requireRepair(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "NOT_AUTHENTICATED"
    })
  }

  if (req.user.userRole !== "repair") {
    return res.status(403).json({
      error: "Repair user privileges required",
      code: "NOT_REPAIR"
    })
  }

  next()
}

/**
 * Require store access (manager/admin must have store in assignedStores)
 */
export function requireStoreAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "NOT_AUTHENTICATED"
    })
  }

  // Super admin can access all stores
  if (req.user.userRole === "super_admin") {
    return next()
  }

  // Manager/admin must have store in assignedStores
  if (req.user.userRole === "manager" || req.user.userRole === "admin") {
    const storeId = parseInt(req.params.storeId || req.query.storeId)
    if (!storeId) {
      return res.status(400).json({
        error: "storeId parameter required",
        code: "MISSING_STORE_ID"
      })
    }

    if (!req.user.assignedStores.includes(storeId)) {
      return res.status(403).json({
        error: "Access denied to this store",
        code: "STORE_ACCESS_DENIED"
      })
    }
  }

  next()
}

/**
 * Require staff/manager permission
 */
export function requireStaff(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "NOT_AUTHENTICATED"
    })
  }

  if (!hasStaffPrivileges(req.user.role)) {
    return res.status(403).json({
      error: "Staff privileges required",
      code: "NOT_STAFF"
    })
  }

  next()
}

/**
 * Optional authentication - doesn't fail if no token, but attaches user if valid token
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      // No token provided, continue without user
      req.user = null
      return next()
    }

    const parts = authHeader.split(" ")
    if (parts.length !== 2 || parts[0] !== "Token") {
      req.user = null
      return next()
    }

    const tokenKey = parts[1]
    const tokensDb = getTokensDb()
    const tokenEntry = await tokensDb.get(`token:${tokenKey}`)

    if (!tokenEntry) {
      req.user = null
      return next()
    }

    // Check expiration
    if (tokenEntry.expiresAt) {
      const expiresAt = new Date(tokenEntry.expiresAt)
      if (expiresAt < new Date()) {
        req.user = null
        return next()
      }
    }

    // Fetch user
    const usersDb = getUsersDb()
    const user = await usersDb.get(`user:${tokenEntry.userId}`)

    if (user) {
      req.user = {
        userId: user.userId,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
      req.token = tokenKey
    } else {
      req.user = null
    }

    next()
  } catch (err) {
    console.error("Optional authentication error:", err)
    req.user = null
    next()
  }
}
