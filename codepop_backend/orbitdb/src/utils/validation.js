// src/utils/validation.js
// Input validation utilities

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/
const PASSWORD_MIN_LENGTH = 8

/**
 * Validate email address
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") return false
  return EMAIL_REGEX.test(email)
}

/**
 * Validate username format
 * 3-50 characters, alphanumeric + underscores
 */
export function validateUsername(username) {
  if (!username || typeof username !== "string") return false
  return USERNAME_REGEX.test(username)
}

/**
 * Validate password strength
 * Minimum 8 characters
 */
export function validatePassword(password) {
  if (!password || typeof password !== "string") return false
  return password.length >= PASSWORD_MIN_LENGTH
}

/**
 * Validate positive integer
 */
export function validatePositiveInteger(value) {
  const num = parseInt(value, 10)
  return !isNaN(num) && num > 0
}

/**
 * Validate float/number
 */
export function validateNumber(value) {
  const num = parseFloat(value)
  return !isNaN(num)
}

/**
 * Validate preference string
 * From Django serializer allowed list
 */
export function validatePreference(preference) {
  if (!preference || typeof preference !== "string") return false
  
  const allowedPreferences = [
    "mtn. dew", "diet mtn. dew", "dr. pepper", "diet dr. pepper", "dr. pepper zero",
    "dr pepper cream soda", "sprite", "sprite zero", "coke", "diet coke", "coke zero",
    "pepsi", "diet pepsi", "rootbeer", "fanta", "big red", "powerade", "lemonade",
    "light lemonade", "coconut", "pineapple", "passion fruit", "mango", "guava", "banana",
    "strawberry", "raspberry", "blackberry", "pomegranate", "cranberry", "grape", "kiwi",
    "huckleberry", "peach", "watermelon", "green apple", "pear", "cherry", "orange",
    "blood orange", "grapefruit", "sweetened lime", "lemon", "lime", "vanilla", "cupcake",
    "salted caramel", "chocolate milano", "cinnamon", "choc chip cookie dough",
    "brown sugar cinnamon", "hazelnut", "white chocolate", "butterscotch", "blue raspberry",
    "sour", "blue curacao", "bubble gum", "cotton candy", "mojito", "cucumber", "lavender",
    "pumpkin spice", "peppermint", "irish cream", "gingerbread", "butterbrew mix", "cream",
    "coconut cream", "whip", "lemon wedge", "lime wedge", "french vanilla creamer", "candy",
    "sprinkles", "strawberry puree", "peach puree", "mango puree", "raspberry puree",
    "candy sprinkles", "chocolate"
  ]

  return allowedPreferences.includes(preference.toLowerCase())
}

/**
 * Validate drink size
 */
export function validateDrinkSize(size) {
  if (!size || typeof size !== "string") return false
  const allowedSizes = ["16oz", "24oz", "32oz", "m", "l", "xl"]
  return allowedSizes.includes(size.toLowerCase())
}

/**
 * Validate drink ice level
 */
export function validateDrinkIce(ice) {
  if (!ice || typeof ice !== "string") return false
  const allowedIce = ["none", "light", "normal", "extra"]
  return allowedIce.includes(ice.toLowerCase())
}

/**
 * Validate inventory item type
 */
export function validateInventoryItemType(itemType) {
  if (!itemType || typeof itemType !== "string") return false
  const allowedTypes = ["Soda", "Syrup", "Add In", "Physical"]
  return allowedTypes.includes(itemType)
}

/**
 * Validate order status
 */
export function validateOrderStatus(status) {
  if (!status || typeof status !== "string") return false
  const allowedStatuses = ["pending", "processing", "completed", "cancelled"]
  return allowedStatuses.includes(status.toLowerCase())
}

/**
 * Validate payment status
 */
export function validatePaymentStatus(status) {
  if (!status || typeof status !== "string") return false
  const allowedStatuses = ["pending", "paid", "failed", "remade"]
  return allowedStatuses.includes(status.toLowerCase())
}

/**
 * Validate ISO 8601 date string
 */
export function validateISODate(dateString) {
  if (!dateString || typeof dateString !== "string") return false
  try {
    const date = new Date(dateString)
    return !isNaN(date.getTime()) && dateString === date.toISOString()
  } catch {
    return false
  }
}

/**
 * Validate array of strings (e.g., syrups, add-ins)
 */
export function validateStringArray(arr) {
  if (!Array.isArray(arr)) return false
  return arr.every(item => typeof item === "string" && item.trim().length > 0)
}

/**
 * Sanitize string input (trim whitespace)
 */
export function sanitizeString(str) {
  if (typeof str !== "string") return ""
  return str.trim()
}

/**
 * Validate required fields object
 * @param {Object} obj - Object to validate
 * @param {Array} requiredFields - Array of field names that are required
 * @returns {Array} Array of missing field names, empty if all present
 */
export function validateRequiredFields(obj, requiredFields) {
  const missing = []
  for (const field of requiredFields) {
    const value = obj[field]
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      missing.push(field)
    }
  }
  return missing
}

/**
 * Validate preference type
 */
export function validatePreferenceType(type) {
  if (!type || typeof type !== "string") return false
  const allowedTypes = ["favorite", "allergic", "dislike", "recommended", "ingredient_preference"]
  return allowedTypes.includes(type.toLowerCase())
}

/**
 * Validate sweetness level
 */
export function validateSweetness(sweetness) {
  if (!sweetness || typeof sweetness !== "string") return false
  const allowedLevels = ["low", "medium", "high"]
  return allowedLevels.includes(sweetness.toLowerCase())
}

/**
 * Validate temperature
 */
export function validateTemperature(temperature) {
  if (!temperature || typeof temperature !== "string") return false
  const allowedTemperatures = ["hot", "cold", "iced"]
  return allowedTemperatures.includes(temperature.toLowerCase())
}

/**
 * Validate transfer status
 */
export function validateTransferStatus(status) {
  if (!status || typeof status !== "string") return false
  const allowedStatuses = ["pending", "scheduled", "in_transit", "delivered", "cancelled"]
  return allowedStatuses.includes(status.toLowerCase())
}

/**
 * Validate machine status
 */
export function validateMachineStatus(status) {
  if (!status || typeof status !== "string") return false
  const allowedStatuses = ["operational", "in_service", "out_of_service"]
  return allowedStatuses.includes(status.toLowerCase())
}

/**
 * Validate assignment status
 */
export function validateAssignmentStatus(status) {
  if (!status || typeof status !== "string") return false
  const allowedStatuses = ["scheduled", "in_transit", "delivered", "cancelled"]
  return allowedStatuses.includes(status.toLowerCase())
}

/**
 * Validate reorder notification status
 */
export function validateReorderStatus(status) {
  if (!status || typeof status !== "string") return false
  const allowedStatuses = ["pending", "acknowledged", "fulfilled"]
  return allowedStatuses.includes(status.toLowerCase())
}

/**
 * Validate user role/enum
 */
export function validateUserRole(role) {
  if (!role || typeof role !== "string") return false
  const allowedRoles = ["customer", "staff", "repair", "manager", "admin", "super_admin"]
  return allowedRoles.includes(role.toLowerCase())
}
