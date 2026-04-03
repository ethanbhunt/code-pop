// Complaint / support chatbot — order lookup, remakes, refunds (OrbitDB + Stripe).
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import Stripe from "stripe"
import * as drinkService from "./drinkService.js"
import * as orderService from "./orderService.js"
import * as revenueService from "./revenueService.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const { drinkMadeWrong: DRINK_WRONG_KW, refund: REFUND_KW } = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/chatbot-keywords.json"), "utf8")
)

function normPhase(v) {
  if (v === undefined || v === null || v === "" || v === "none") return "none"
  return String(v)
}

function parseOrderNums(input) {
  const m = String(input).match(/\d+/g)
  return m ? m.map((x) => parseInt(x, 10)) : []
}

function parseDrinkIdsFromState(drink_nums) {
  const s = normPhase(drink_nums)
  if (s === "none") return []
  return s.split(",").map((x) => x.trim()).filter((x) => x.length > 0)
}

async function refundStripePayment(clientSecretOrId) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !clientSecretOrId) return false
  try {
    const stripe = new Stripe(key, { apiVersion: "2023-10-16" })
    let pi = String(clientSecretOrId)
    if (pi.includes("_secret_")) {
      pi = pi.split("_secret_")[0]
    }
    await stripe.refunds.create({ payment_intent: pi })
    return true
  } catch (e) {
    console.error("Stripe refund error:", e.message)
    return false
  }
}

async function loadOrderDrinks(order) {
  const drinks = []
  for (const id of order.drinkIds || []) {
    try {
      drinks.push(await drinkService.getDrinkById(id))
    } catch {
      // skip missing drink rows
    }
  }
  return drinks
}

function formatOrderDrinksSummary(drinks) {
  let drinks_info = ""
  let drink_ids = ""
  let counter = 1
  for (const drink of drinks) {
    const sodaUsed = (drink.sodaUsed || drink.sodas || []).join(", ")
    const syrups = (drink.syrupsUsed || drink.syrups || []).join(", ")
    const addins = (drink.addIns || []).join(", ")
    drinks_info += `[${counter}]: Drink Name: ${drink.name}\n`
    drinks_info += `Soda Used: ${sodaUsed}\n`
    drinks_info += `Syrups: ${syrups}\n`
    drinks_info += `Add ins: ${addins}\n`
    drinks_info += `Price: $${Number(drink.price).toFixed(2)}\n\n`
    counter += 1
    drink_ids += `${drink.drinkId}, `
  }
  return { drinks_info, drink_ids }
}

function cancelResp() {
  return {
    responses: "Ok, canceling... \nplease let me know how I can further help you!",
    wrong_drink_phase: "none",
    refund_phase: "none",
    order_num: "none",
    drink_nums: "none",
  }
}

async function wrongDrinkLogic(user_input, wrong_drink_phase, order_num, drink_nums) {
  const lower = user_input.toLowerCase()
  if (lower.includes("cancel")) return cancelResp()

  switch (wrong_drink_phase) {
    case "none":
      return null
    case "init":
      if (lower.includes("refund")) {
        return {
          responses: "Please provide us with your order number to proceed with refund!",
          wrong_drink_phase: "none",
          refund_phase: "1",
          order_num: "none",
          drink_nums: "none",
        }
      }
      if (lower.includes("remade") || lower.includes("remake")) {
        return {
          responses: "Please provide us with your order number to remake your drink!",
          wrong_drink_phase: "1",
          refund_phase: "none",
          order_num: "none",
          drink_nums: "none",
        }
      }
      return {
        responses:
          "I'm sorry please clearly state whether you want a refund for a drink or if you want a drink remade. \n\nIf you want to cancel this process please say cancel at any time!",
        wrong_drink_phase: "init",
        refund_phase: "init",
        order_num: "none",
        drink_nums: "none",
      }
    case "1": {
      const order_numbers = parseOrderNums(user_input)
      if (order_numbers.length !== 1) {
        return {
          responses:
            "I'm sorry I couldn't find your order from that information! Please clearly enter a single order number! \n\nIf you want to cancel this process please say cancel at any time!",
          wrong_drink_phase: "1",
          refund_phase: "none",
          order_num: "none",
          drink_nums: "none",
        }
      }
      let order
      try {
        order = await orderService.getOrderById(order_numbers[0])
      } catch {
        order = null
      }
      if (!order) {
        return {
          responses:
            "I'm sorry that order doesn't exist. \n\nIf you want to cancel this process please say cancel at any time!",
          wrong_drink_phase: "1",
          refund_phase: "none",
          order_num: "none",
          drink_nums: "none",
        }
      }
      const drinks = await loadOrderDrinks(order)
      const { drinks_info, drink_ids } = formatOrderDrinksSummary(drinks)
      return {
        responses:
          'We found your order! Please tell us which drink(s) we can remake for you?\nif you want all drinks remade say "all"\n\n' +
          drinks_info +
          "If you want to cancel this process please say cancel at any time!",
        wrong_drink_phase: "2",
        refund_phase: "none",
        order_num: order_numbers[0],
        drink_nums: drink_ids || "none",
      }
    }
    case "2": {
      const drink_numbers = parseOrderNums(user_input)
      const idStrings = parseDrinkIdsFromState(drink_nums)
      const onum = order_num === "none" || order_num == null ? null : Number(order_num)

      if (lower.includes("all")) {
        const allIds = idStrings.filter((x) => /^\d+$/.test(x)).map((x) => parseInt(x, 10))
        if (allIds.length === 0 || onum == null) {
          return {
            responses:
              "You didn't enter a valid drink number...\nplease try again! \n\nIf you want to cancel this process please say cancel at any time!",
            wrong_drink_phase: "2",
            refund_phase: "none",
            order_num: onum ?? "none",
            drink_nums,
          }
        }
        let orig
        try {
          orig = await orderService.getOrderById(onum)
        } catch {
          return {
            responses: "Order not found. Say cancel to start over.",
            wrong_drink_phase: "2",
            refund_phase: "none",
            order_num: onum,
            drink_nums,
          }
        }
        const newOrder = await orderService.createOrder(
          orig.userId,
          orig.storeId,
          allIds,
          orig.quantities || {},
          orig.specialInstructions || "",
          orig.estimatedPickupTime
        )
        await orderService.updateOrder(newOrder.orderId, {
          paymentStatus: "remade",
          orderStatus: "pending",
        })
        return {
          responses: 'Successfully started remaking order, please continue by saying "I accept".',
          wrong_drink_phase: "3",
          refund_phase: "none",
          order_num: newOrder.orderId,
          drink_nums,
        }
      }

      if (idStrings.length === 0) {
        return {
          responses:
            "You didn't enter a valid drink number...\nplease try again! \n\nIf you want to cancel this process please say cancel at any time!",
          wrong_drink_phase: "2",
          refund_phase: "none",
          order_num: onum ?? "none",
          drink_nums,
        }
      }

      if (drink_numbers.length > idStrings.length) {
        return {
          responses:
            "You entered too many drinks to remake...\nplease try again! \n\nIf you want to cancel this process please say cancel at any time!",
          wrong_drink_phase: "2",
          refund_phase: "none",
          order_num: onum ?? "none",
          drink_nums,
        }
      }

      const drinks_to_reorder = []
      for (const d of drink_numbers) {
        if (d > idStrings.length) {
          return {
            responses:
              "One of the drinks entered was not in the list...\nplease try again! \n\nIf you want to cancel this process please say cancel at any time!",
            wrong_drink_phase: "2",
            refund_phase: "none",
            order_num: onum ?? "none",
            drink_nums,
          }
        }
        drinks_to_reorder.push(parseInt(idStrings[d - 1], 10))
      }

      if (onum == null) {
        return {
          responses: "Missing order context. Say cancel and start again with your order number.",
          wrong_drink_phase: "none",
          refund_phase: "none",
          order_num: "none",
          drink_nums: "none",
        }
      }

      let orig
      try {
        orig = await orderService.getOrderById(onum)
      } catch {
        return {
          responses: "Original order not found.",
          wrong_drink_phase: "2",
          refund_phase: "none",
          order_num: onum,
          drink_nums,
        }
      }

      const newOrder = await orderService.createOrder(
        orig.userId,
        orig.storeId,
        drinks_to_reorder,
        orig.quantities || {},
        orig.specialInstructions || "",
        orig.estimatedPickupTime
      )
      await orderService.updateOrder(newOrder.orderId, {
        paymentStatus: "remade",
        orderStatus: "pending",
      })

      return {
        responses: 'Successfully started remaking drinks, please continue by saying "I accept".',
        wrong_drink_phase: "3",
        refund_phase: "none",
        order_num: newOrder.orderId,
        drink_nums,
      }
    }
    case "3":
      if (lower.includes("i accept")) {
        return {
          responses: "Thank you! your drink will be remade shortly",
          wrong_drink_phase: "4",
          refund_phase: "none",
          order_num,
          drink_nums: "none",
        }
      }
      return {
        responses:
          'Sorry you must say "I accept" before we can finish remaking your drink(s) \n\nIf you want to cancel this process please say cancel at any time!',
        wrong_drink_phase: "3",
        refund_phase: "none",
        order_num,
        drink_nums,
      }
    case "4":
      return null
    default:
      return null
  }
}

async function refundLogic(user_input, refund_phase, order_num, drink_nums) {
  const lower = user_input.toLowerCase()
  if (lower.includes("cancel")) return cancelResp()

  switch (refund_phase) {
    case "none":
      return null
    case "init":
      if (lower.includes("refund")) {
        return {
          responses: "Please provide us with your order number to proceed with refund!",
          wrong_drink_phase: "none",
          refund_phase: "1",
          order_num: "none",
          drink_nums: "none",
        }
      }
      if (lower.includes("remade") || lower.includes("remake")) {
        return {
          responses: "Please provide us with your order number to remake your drink!",
          wrong_drink_phase: "1",
          refund_phase: "none",
          order_num: "none",
          drink_nums: "none",
        }
      }
      return {
        responses:
          "I'm sorry please clearly state whether you want a refund for a drink or if you want a drink remade. \n\nIf you want to cancel this process please say cancel at any time!",
        wrong_drink_phase: "init",
        refund_phase: "init",
        order_num: "none",
        drink_nums: "none",
      }
    case "1": {
      const order_numbers = parseOrderNums(user_input)
      if (order_numbers.length !== 1) {
        return {
          responses:
            "I'm sorry I couldn't find your order from that information! Please clearly enter a single order number! \n\nIf you want to cancel this process please say cancel at any time!",
          wrong_drink_phase: "none",
          refund_phase: "1",
          order_num: "none",
          drink_nums: "none",
        }
      }
      let order
      try {
        order = await orderService.getOrderById(order_numbers[0])
      } catch {
        order = null
      }
      if (!order) {
        return {
          responses:
            "I'm sorry that order doesn't exist. \n\nIf you want to cancel this process please say cancel at any time!",
          wrong_drink_phase: "none",
          refund_phase: "1",
          order_num: "none",
          drink_nums: "none",
        }
      }
      const drinks = await loadOrderDrinks(order)
      const { drinks_info, drink_ids } = formatOrderDrinksSummary(drinks)
      return {
        responses:
          "Is this the order you want refunded?\nConfirm by saying yes\n\n" +
          drinks_info +
          "If you want to cancel this process please say cancel at any time!",
        wrong_drink_phase: "none",
        refund_phase: "2",
        order_num: order_numbers[0],
        drink_nums: drink_ids || "none",
      }
    }
    case "2": {
      const onum = order_num === "none" || order_num == null ? null : Number(order_num)
      if (lower.includes("yes")) {
        if (onum == null) {
          return {
            responses: "Missing order number. Say cancel to start over.",
            wrong_drink_phase: "none",
            refund_phase: "2",
            order_num: "none",
            drink_nums,
          }
        }
        let order_to_refund
        try {
          order_to_refund = await orderService.getOrderById(onum)
        } catch {
          return {
            responses: "Order not found.",
            wrong_drink_phase: "none",
            refund_phase: "2",
            order_num: onum,
            drink_nums,
          }
        }
        const stripe_id = order_to_refund.stripeId
        const refund_success = await refundStripePayment(stripe_id)
        try {
          await revenueService.updateRevenueForOrder(onum, { refunded: true })
        } catch (e) {
          console.warn("No revenue row to mark refunded:", e.message)
        }
        if (refund_success) {
          return {
            responses: 'Successfully started refund, please continue by saying "I accept".',
            wrong_drink_phase: "none",
            refund_phase: "3",
            order_num: onum,
            drink_nums,
          }
        }
        return {
          responses: "Sorry, There was a problem processing the refund. Please try again later!",
          wrong_drink_phase: "none",
          refund_phase: "2",
          order_num: onum,
          drink_nums,
        }
      }
      return {
        responses:
          "Please say yes to confirm this is the order you want to refund! \n\nIf you want to cancel this process please say cancel at any time!",
        wrong_drink_phase: "none",
        refund_phase: "2",
        order_num: onum ?? "none",
        drink_nums,
      }
    }
    case "3":
      if (lower.includes("i accept")) {
        return {
          responses: "Thank you! your refund has been processed",
          wrong_drink_phase: "none",
          refund_phase: "4",
          order_num,
          drink_nums: "none",
        }
      }
      return {
        responses:
          'Sorry you must say "I accept" before we can finish the refund! \n\nIf you want to cancel this process please say cancel at any time!',
        wrong_drink_phase: "none",
        refund_phase: "3",
        order_num,
        drink_nums,
      }
    case "4":
      return null
    default:
      return null
  }
}

export async function processChatbotMessage(body) {
  const user_input = String(body.message || "")
  const wrong_drink_phase = normPhase(body.wrong_drink_phase)
  const refund_phase = normPhase(body.refund_phase)
  const order_num = body.order_num
  const drink_nums = body.drink_nums

  if (user_input.toLowerCase().includes("cancel")) {
    return cancelResp()
  }

  const w = await wrongDrinkLogic(user_input, wrong_drink_phase, order_num, drink_nums)
  if (w) return w

  const r = await refundLogic(user_input, refund_phase, order_num, drink_nums)
  if (r) return r

  const lower = user_input.toLowerCase()
  const madeWrong = DRINK_WRONG_KW.some((k) => lower.includes(k))
  const refundAsk = REFUND_KW.some((k) => lower.includes(k))

  if (madeWrong || refundAsk) {
    return {
      responses:
        "Oh no, I'm sorry that happened to you. To confirm do you want the drink remade or do you want a refund?",
      wrong_drink_phase: "init",
      refund_phase: "init",
      order_num: "none",
      drink_nums: "none",
    }
  }

  return {
    responses:
      "I'm here to help with refunds, remakes, and order problems. Tell me what went wrong, or say whether you want a refund or a remake.",
    wrong_drink_phase: "none",
    refund_phase: "none",
    order_num: "none",
    drink_nums: "none",
  }
}
