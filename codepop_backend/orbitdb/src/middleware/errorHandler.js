// src/middleware/errorHandler.js
// Centralized error handling middleware

/**
 * Express error handling middleware
 * Must be registered AFTER all other middleware and routes
 */
export function errorHandler(err, req, res, next) {
  console.error("Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  })

  // Default error response
  let statusCode = err.statusCode || 500
  let errorCode = err.code || "INTERNAL_ERROR"
  let message = err.message || "An internal server error occurred"

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400
    errorCode = "VALIDATION_ERROR"
  } else if (err.name === "NotFoundError") {
    statusCode = 404
    errorCode = "NOT_FOUND"
  } else if (err.name === "UnauthorizedError") {
    statusCode = 401
    errorCode = "UNAUTHORIZED"
  } else if (err.name === "ForbiddenError") {
    statusCode = 403
    errorCode = "FORBIDDEN"
  }

  res.status(statusCode).json({
    error: message,
    code: errorCode,
    ...(process.env.NODE_ENV === "development" && { details: err.stack })
  })
}

/**
 * Catch unhandled promise rejections and pass to error handler
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, code = "ERROR") {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = "ApiError"
  }
}

/**
 * Validation error
 */
export class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 400, "VALIDATION_ERROR")
    this.details = details
  }
}

/**
 * Not found error
 */
export class NotFoundError extends ApiError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND")
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED")
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN")
  }
}
