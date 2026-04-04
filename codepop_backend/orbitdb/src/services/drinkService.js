// src/services/drinkService.js
// Drink recipes and menu items service

import { getDrinksDb, getNextId, getTimestamp } from "../utils/db.js"
import { validateDrinkSize, validateDrinkIce, validateStringArray } from "../utils/validation.js"

/**
 * Create a new drink
 */
export async function createDrink(data) {
  const {
    name,
    syrupsUsed,
    sodaUsed,
    addIns,
    syrups,
    sodas,
    ingredients,
    price,
    size,
    ice,
    userCreated,
    description,
    isVegan,
    isGlutenFree,
    calories,
    rating
  } = data

  if (!name || !sodaUsed && !sodas || !price) {
    throw new Error("Name, soda/sodas, and price are required")
  }

  if (!validateDrinkSize(size || "16oz")) {
    throw new Error("Invalid drink size")
  }

  if (!validateDrinkIce(ice || "regular")) {
    throw new Error("Invalid ice level")
  }

  if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
    throw new Error("Price must be a positive number")
  }

  const drinksDb = getDrinksDb()
  const drinkId = await getNextId(drinksDb, "drink")

  // Support both old (syrupsUsed) and new (syrups) field names
  const finalSyrups = syrups || syrupsUsed || []
  const finalSodas = sodas || sodaUsed || []
  const finalAddIns = addIns || []
  const finalIngredients = ingredients || []

  const drink = {
    drinkId,
    name,
    description: description || "",
    syrups: validateStringArray(finalSyrups) ? finalSyrups : [],
    sodas: validateStringArray(finalSodas) ? finalSodas : [],
    addIns: validateStringArray(finalAddIns) ? finalAddIns : [],
    ingredients: validateStringArray(finalIngredients) ? finalIngredients : [],
    // Keep old field names for backward compatibility
    syrupsUsed: validateStringArray(finalSyrups) ? finalSyrups : [],
    sodaUsed: validateStringArray(finalSodas) ? finalSodas : [],
    price: parseFloat(price),
    size: size || "16oz",
    ice: ice || "regular",
    userCreated: Boolean(userCreated),
    isVegan: Boolean(isVegan) || false,
    isGlutenFree: Boolean(isGlutenFree) || false,
    calories: calories ? parseInt(calories, 10) : null,
    rating: rating ? parseFloat(rating) : null,
    favorites: [],
    createdAt: getTimestamp()
  }

  await drinksDb.put(`drink:${drinkId}`, drink)

  return drink
}

/**
 * Get drink by ID
 */
export async function getDrinkById(drinkId) {
  const drinksDb = getDrinksDb()
  const drink = await drinksDb.get(`drink:${drinkId}`)

  if (!drink) {
    throw new Error("Drink not found")
  }

  return drink
}

/**
 * List all non-user-created drinks
 */
export async function listMenuDrinks(limit = 100) {
  const drinksDb = getDrinksDb()
  const allDrinks = await drinksDb.all()

  const drinks = []
  for (const entry of allDrinks) {
    const drink = entry.value
    if (drink && drink.drinkId && !drink.userCreated) {
      drinks.push(drink)
    }
    if (drinks.length >= limit) break
  }

  return drinks
}

/**
 * List all user-created drinks for a user
 */
export async function getUserDrinks(userId) {
  const drinksDb = getDrinksDb()
  const allDrinks = await drinksDb.all()

  const drinks = []
  for (const entry of allDrinks) {
    const drink = entry.value
    if (drink && drink.drinkId && drink.userCreated && drink.userId === userId) {
      drinks.push(drink)
    }
  }

  return drinks
}

/**
 * List all drinks
 */
export async function listAllDrinks(limit = 1000) {
  const drinksDb = getDrinksDb()
  const allDrinks = await drinksDb.all()

  const drinks = []
  for (const entry of allDrinks) {
    const drink = entry.value
    if (drink && drink.drinkId) {
      drinks.push(drink)
    }
    if (drinks.length >= limit) break
  }

  return drinks
}

/**
 * Update drink
 */
export async function updateDrink(drinkId, updates) {
  const drinksDb = getDrinksDb()
  const drink = await drinksDb.get(`drink:${drinkId}`)

  if (!drink) {
    throw new Error("Drink not found")
  }

  // Validate and update fields
  if (updates.name) drink.name = updates.name
  if (updates.description !== undefined) drink.description = updates.description || ""

  // Handle new and old field names for syrups
  if (updates.syrups !== undefined) {
    drink.syrups = validateStringArray(updates.syrups) ? updates.syrups : []
    drink.syrupsUsed = drink.syrups
  } else if (updates.syrupsUsed !== undefined) {
    drink.syrupsUsed = validateStringArray(updates.syrupsUsed) ? updates.syrupsUsed : []
    drink.syrups = drink.syrupsUsed
  }

  // Handle new and old field names for sodas
  if (updates.sodas !== undefined) {
    drink.sodas = validateStringArray(updates.sodas) ? updates.sodas : []
    drink.sodaUsed = drink.sodas
  } else if (updates.sodaUsed !== undefined) {
    drink.sodaUsed = validateStringArray(updates.sodaUsed) ? updates.sodaUsed : []
    drink.sodas = drink.sodaUsed
  }

  if (updates.addIns !== undefined) {
    drink.addIns = validateStringArray(updates.addIns) ? updates.addIns : []
  }
  if (updates.ingredients !== undefined) {
    drink.ingredients = validateStringArray(updates.ingredients) ? updates.ingredients : []
  }
  if (updates.price !== undefined) {
    const price = parseFloat(updates.price)
    if (isNaN(price) || price < 0) {
      throw new Error("Price must be a positive number")
    }
    drink.price = price
  }
  if (updates.size !== undefined) {
    if (!validateDrinkSize(updates.size)) {
      throw new Error("Invalid drink size")
    }
    drink.size = updates.size
  }
  if (updates.ice !== undefined) {
    if (!validateDrinkIce(updates.ice)) {
      throw new Error("Invalid ice level")
    }
    drink.ice = updates.ice
  }
  if (updates.rating !== undefined) {
    const rating = parseFloat(updates.rating)
    if (!isNaN(rating) && rating >= 0 && rating <= 5) {
      drink.rating = rating
    }
  }
  if (updates.isVegan !== undefined) {
    drink.isVegan = Boolean(updates.isVegan)
  }
  if (updates.isGlutenFree !== undefined) {
    drink.isGlutenFree = Boolean(updates.isGlutenFree)
  }
  if (updates.calories !== undefined) {
    drink.calories = updates.calories ? parseInt(updates.calories, 10) : null
  }

  await drinksDb.put(`drink:${drinkId}`, drink)

  return drink
}

/**
 * Delete drink
 */
export async function deleteDrink(drinkId) {
  const drinksDb = getDrinksDb()
  const drink = await drinksDb.get(`drink:${drinkId}`)

  if (!drink) {
    throw new Error("Drink not found")
  }

  await drinksDb.del(`drink:${drinkId}`)

  return true
}

/**
 * Add user to favorites
 */
export async function addFavorite(drinkId, userId) {
  const drinksDb = getDrinksDb()
  const drink = await drinksDb.get(`drink:${drinkId}`)

  if (!drink) {
    throw new Error("Drink not found")
  }

  if (!drink.favorites.includes(userId)) {
    drink.favorites.push(userId)
    await drinksDb.put(`drink:${drinkId}`, drink)
  }

  return drink
}

/**
 * Remove user from favorites
 */
export async function removeFavorite(drinkId, userId) {
  const drinksDb = getDrinksDb()
  const drink = await drinksDb.get(`drink:${drinkId}`)

  if (!drink) {
    throw new Error("Drink not found")
  }

  drink.favorites = drink.favorites.filter(id => id !== userId)
  await drinksDb.put(`drink:${drinkId}`, drink)

  return drink
}

/**
 * Get user's favorite drinks
 */
export async function getUserFavoriteDrinks(userId) {
  const drinksDb = getDrinksDb()
  const allDrinks = await drinksDb.all()

  const favorites = []
  for (const entry of allDrinks) {
    const drink = entry.value
    if (drink && drink.drinkId && drink.favorites.includes(userId)) {
      favorites.push(drink)
    }
  }

  return favorites
}
