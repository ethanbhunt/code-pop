
from rest_framework.views import APIView
from .views import refund_order
from .models import Order, Revenue
from django.http import JsonResponse
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import re
import threading

# Load Flan-T5 model and tokenizer
tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")

class Chatbot(APIView):

    def post(self, request, *args, **kwargs):
        user_input = request.data.get("message", "")
        wrong_drink_phase = request.data.get("wrong_drink_phase")
        refund_phase = request.data.get("refund_phase")
        order_num = request.data.get("order_num")
        drink_nums = request.data.get("drink_nums")
        grounding_info = "Hi! I'm Bob from CodePop, a soda customization shop. I can help with refunds, drink remakes, or answer questions about our drinks! I'm here to assist you in your questions and concerns. How can I help you with your order today? Was it incorrect or do you have another issue? "

        def wrongDrinkLogic (user_input, wrong_drink_phase, order_num, drink_nums):
            if "cancel" in user_input.lower():
                return JsonResponse({
                            "responses": "Ok, canceling... \nplease let me know how I can further help you!",
                            "wrong_drink_phase": "none",
                            "refund_phase": "none",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
            match wrong_drink_phase:
                case "none":
                    return None
                case "init":
                    if "refund" in user_input.lower():
                        return JsonResponse({
                            "responses": "Please provide us with your order number to proceed with refund!",
                            "wrong_drink_phase": "none",
                            "refund_phase": "1",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                    elif "remade" in user_input.lower():
                        return JsonResponse({
                            "responses": "Please provide us with your order number to remake your drink!",
                            "wrong_drink_phase": "1",
                            "refund_phase": "none",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                    else:
                        return JsonResponse({
                            "responses": "I'm sorry please clearly state wether you want a refund for a drink or if you want a drink remade. \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "init",
                            "refund_phase": "init",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                case "1":
                    order_numbers = [int(num) for num in re.findall(r'\d+', user_input)]
                    if(len(order_numbers) != 1):
                        return JsonResponse({
                            "responses": "I'm sorry I couldn't find your order from that information! Please clearly enter a single order number! \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "1",
                            "refund_phase": "none",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                    else:
                        order = Order.objects.filter(OrderID = int(order_numbers[0])).first()
                        if not order:
                            return JsonResponse({
                            "responses": "I'm sorry that order doesn't exist. \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "1",
                            "refund_phase": "none",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                        else:
                            drinks = order.Drinks.all()
                            print(drinks)
                            drinks_info = ""
                            drink_ids = ""
                            counter = 1
                            for drink in drinks:
                                drinks_info = drinks_info + f"[{counter}]: Drink Name: {drink.Name}\n"
                                string_soda_used = ", ".join(drink.SodaUsed)
                                drinks_info = drinks_info + f"Soda Used: {string_soda_used}\n"
                                string_syrups = ", ".join(drink.SyrupsUsed)
                                drinks_info = drinks_info + f"Syrups: {string_syrups}\n"
                                string_add_ins = ", ".join(drink.AddIns)
                                drinks_info = drinks_info + f"Add ins: {string_add_ins}\n"
                                drinks_info = drinks_info + f"Price: ${drink.Price:.2f}\n\n"
                                counter = counter + 1
                                drink_ids = drink_ids + f"{drink.DrinkID}, "
                            print(drink_ids)
                            return JsonResponse({
                            "responses": "We found your order! Please tell us which drink(s) we can remake for you?\nif you want all drinks remade say \"all\"\n\n" + drinks_info + "If you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "2",
                            "refund_phase": "none",
                            "order_num": order_numbers[0],
                            "drink_nums": drink_ids
                            })
                case "2":
                    drink_numbers = [int(num) for num in re.findall(r'\d+', user_input)]
                    drink_list = drink_nums.split(", ")
                    if "all" in user_input.lower():
                        # Convert to integers, ignoring empty or invalid values
                        drink_list = [int(num) for num in drink_list if num.strip().isdigit()]
                        new_order = Order.objects.create(
                            OrderStatus='pending',
                            PaymentStatus='remade'
                        )

                        new_order.Drinks.add(drink_list)

                        new_order.save()
                        new_order_id = new_order.OrderID
                        return JsonResponse({
                            "responses": "Sucessfully started remaking order, please continute by saying \"I accept\".",
                            "wrong_drink_phase": "3",
                            "refund_phase": "none",
                            "order_num": new_order_id,
                            "drink_nums": drink_nums
                            })
                    elif len(drink_nums) == 0:
                        return JsonResponse({
                            "responses": "You didn't enter a valid drink number...\nplease try again! \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "2",
                            "refund_phase": "none",
                            "order_num": order_num,
                            "drink_nums": drink_nums
                            })
                    elif len(drink_numbers) > len(drink_list):
                        return JsonResponse({
                            "responses": "You entered too many drinks to remake...\nplease try again! \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "2",
                            "refund_phase": "none",
                            "order_num": order_num,
                            "drink_nums": drink_nums
                            })
                    else:
                        drinks_to_reorder = []
                        for drink in drink_numbers:
                            if drink > len(drink_list):
                                return JsonResponse({
                                    "responses": "One of the drinks entered was not in the list...\nplease try again! \n\nIf you want to cancel this process please say cancel at any time!",
                                    "wrong_drink_phase": "2",
                                    "refund_phase": "none",
                                    "order_num": order_num,
                                    "drink_nums": drink_nums
                                    })
                            else:
                                drinks_to_reorder.append(drink_list[drink-1])
        
                        new_order = Order.objects.create(
                            OrderStatus='pending',
                            PaymentStatus='remade'
                        )

                        new_order.Drinks.add(*drinks_to_reorder)

                        new_order.save()
                        new_order_id = new_order.OrderID
                        return JsonResponse({
                            "responses": "Sucessfully started remaking drinks, please continute by saying \"I accept\".",
                            "wrong_drink_phase": "3",
                            "refund_phase": "none",
                            "order_num": new_order_id,
                            "drink_nums": drink_nums
                            })
                case "3":
                    if "i accept" in user_input.lower():
                        return JsonResponse({
                            "responses": "Thank you! your drink will be remade shortly",
                            "wrong_drink_phase": "4",
                            "refund_phase": "none",
                            "order_num": order_num,
                            "drink_nums": "none"
                            })
                    else:
                        return JsonResponse({
                            "responses": "Sorry you must say \"I accept\" before we can finish remaking your drink(s) \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "3",
                            "refund_phase": "none",
                            "order_num": order_num,
                            "drink_nums": drink_nums
                            })
                case "4":
                    return None
                    



        def refundLogic (user_input, refund_phase, order_num, drink_nums):
            if "cancel" in user_input.lower():
                return JsonResponse({
                            "responses": "Ok, canceling... \nplease let me know how I can further help you!",
                            "wrong_drink_phase": "none",
                            "refund_phase": "none",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
            match refund_phase:
                case "none":
                    return None
                case "init":
                    if "refund" in user_input.lower():
                        return JsonResponse({
                            "responses": "Please provide us with your order number to proceed with refund!",
                            "wrong_drink_phase": "none",
                            "refund_phase": "1",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                    elif "remade" in user_input.lower():
                        return JsonResponse({
                            "responses": "Please provide us with your order number to remake your drink!",
                            "wrong_drink_phase": "1",
                            "refund_phase": "none",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                    else:
                        return JsonResponse({
                            "responses": "I'm sorry please clearly state wether you want a refund for a drink or if you want a drink remade. \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "init",
                            "refund_phase": "init",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                case "1":
                    order_numbers = [int(num) for num in re.findall(r'\d+', user_input)]
                    if(len(order_numbers) != 1):
                        return JsonResponse({
                            "responses": "I'm sorry I couldn't find your order from that information! Please clearly enter a single order number! \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "none",
                            "refund_phase": "1",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                    else:
                        order = Order.objects.filter(OrderID = int(order_numbers[0])).first()
                        if not order:
                            return JsonResponse({
                            "responses": "I'm sorry that order doesn't exist. \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "none",
                            "refund_phase": "1",
                            "order_num": "none",
                            "drink_nums": "none"
                            })
                        else:
                            drinks = order.Drinks.all()
                            print(drinks)
                            drinks_info = ""
                            drink_ids = ""
                            counter = 1
                            for drink in drinks:
                                drinks_info = drinks_info + f"[{counter}]: Drink Name: {drink.Name}\n"
                                string_soda_used = ", ".join(drink.SodaUsed)
                                drinks_info = drinks_info + f"Soda Used: {string_soda_used}\n"
                                string_syrups = ", ".join(drink.SyrupsUsed)
                                drinks_info = drinks_info + f"Syrups: {string_syrups}\n"
                                string_add_ins = ", ".join(drink.AddIns)
                                drinks_info = drinks_info + f"Add ins: {string_add_ins}\n"
                                drinks_info = drinks_info + f"Price: ${drink.Price:.2f}\n\n"
                                counter = counter + 1
                                drink_ids = drink_ids + f"{drink.DrinkID}, "
                            print(drink_ids)
                            return JsonResponse({
                            "responses": "Is this the order you want refunded?\nConfirm by saying yes\n\n" + drinks_info + "If you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "none",
                            "refund_phase": "2",
                            "order_num": order_numbers[0],
                            "drink_nums": drink_ids
                            })
                case "2":
                    drink_numbers = [int(num) for num in re.findall(r'\d+', user_input)]
                    drink_list = drink_nums.split(", ")
                    if "yes" in user_input.lower():
                        order_to_refund = Order.objects.get(OrderID = order_num)
                        stripe_id = order_to_refund.StripeID
                        print(stripe_id)
                        refund_success = refund_order(stripe_id)
                        orderRevenue = Revenue.objects.get(OrderID = order_num)
                        orderRevenue.Refunded = True
                        orderRevenue.save()
                        if(refund_success):
                            return JsonResponse({
                                "responses": "Sucessfully started refund, please continute by saying \"I accept\".",
                                "wrong_drink_phase": "none",
                                "refund_phase": "3",
                                "order_num": order_num,
                                "drink_nums": drink_nums
                                })
                        else:
                            return JsonResponse({
                                "responses": "Sorry, There was a problem processing the refund. Please try again later!",
                                "wrong_drink_phase": "none",
                                "refund_phase": "2",
                                "order_num": order_num,
                                "drink_nums": drink_nums
                                })
                    else:
                        return JsonResponse({
                            "responses": "Please say yes to confirm this is the order you want to refund! \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "none",
                            "refund_phase": "2",
                            "order_num": order_num,
                            "drink_nums": drink_nums
                            })
                case "3":
                    if "i accept" in user_input.lower():
                        return JsonResponse({
                            "responses": "Thank you! your refund has been proccessed",
                            "wrong_drink_phase": "none",
                            "refund_phase": "4",
                            "order_num": order_num,
                            "drink_nums": "none"
                            })
                    else:
                        return JsonResponse({
                            "responses": "Sorry you must say \"I accept\" before we can finish the refund! \n\nIf you want to cancel this process please say cancel at any time!",
                            "wrong_drink_phase": "none",
                            "refund_phase": "3",
                            "order_num": order_num,
                            "drink_nums": drink_nums
                            })
                case "4":
                    return None
                    



        wrongDrinkResponse = wrongDrinkLogic(user_input, wrong_drink_phase, order_num, drink_nums)
        refundResponse = refundLogic(user_input, refund_phase, order_num, drink_nums)

        if(wrongDrinkResponse != None):
            return wrongDrinkResponse
        if(refundResponse != None):
            return refundResponse

        drink_made_wrong_keywords = [
            "wrong drink", "incorrect drink", "bad drink", "mistake", "not what I ordered",
            "not what i asked for", "mixed up my order", "switched my order", "got the wrong one",
            "that's not mine", "this isn't mine", "wrong order", "incorrect order", "order mixup",
            "order mix up", "swapped my drink", "gave me someone else", "someone else's drink",
            "different drink", "wrong drink name", "mistaken order", "mixed up", "switched",
            "not my drink", "this isn't what i wanted", "not what i expected", "incorrect",
            "tastes wrong", "tastes bad", "tastes off", "tastes funny", "tastes weird",
            "too sweet", "not sweet enough", "too bitter", "too sour", "too salty",
            "wrong flavor", "missing flavor", "added flavor", "wrong syrup", "wrong sweetness",
            "overpowering flavor", "bland", "flavorless", "no flavor", "tasteless",
            "off flavor", "odd aftertaste", "unpleasant aftertaste", "weird aftertaste",
            "chemical taste", "metallic taste", "burnt taste", "sour taste", "bitter taste",
            "funky taste", "weird taste", "unusual taste", "strange taste", "awful taste",
            "horrible taste", "terrible taste", "nasty taste", "yucky", "not tasty",
            "doesn't taste right", "doesn't taste good", "taste is off",
            "extra syrup", "not enough syrup", "no syrup", "too much syrup", "missing syrup",
            "wrong syrup flavor", "forgot syrup", "skipped syrup", "double syrup",
            "wrong base", "wrong soda", "wrong ingredients", "missing ingredient",
            "forgot ingredient", "extra ingredient", "wrong add-in", "missing add-in",
            "forgot add-in", "no add-in", "wrong topping", "missing toppings",
            "extra toppings", "wrong toppings", "forgot toppings",
            "too much ice", "not enough ice", "no ice", "extra ice", "ice melted",
            "too fizzy", "not fizzy", "not fizzy enough", "flat", "no carbonation",
            "lost carbonation", "too carbonated", "warm", "cold", "lukewarm", "room temperature",
            "not cold enough", "too warm", "wrong temperature",
            "too creamy", "not creamy enough", "incorrect consistency", "too thick",
            "too thin", "strange consistency", "wrong texture", "wrong ratio", "chunky",
            "gritty", "lumpy", "separated", "curdled", "watery",
            "gross", "disgusting", "not fresh", "stale", "expired", "spoiled",
            "odd smell", "bad smell", "smells bad", "smells off", "smells weird", "funky smell",
            "too diluted", "watered down", "not stirred", "bad mix", "poorly mixed",
            "overfilled", "underfilled", "half full", "not full", "barely any",
            "too strong", "not strong enough", "wrong cream",
            "wrong size", "too small", "too big", "not the size i ordered",
            "smaller than expected", "short pour", "missing shot", "extra shot",
            "missing drink", "didn't receive drink", "forgot drink", "drink never arrived",
            "missing item", "order incomplete", "drink was left out", "never got my drink",
            "drink wasn't included", "drink not in bag", "left out my drink",
            "didn't deliver drink", "didn't get drink", "didn't get my drink",
            "didn't get a drink", "where's my drink", "where is my drink",
            "still waiting", "never came", "not in my order", "left something out",
            "forgot part of my order", "incomplete order", "only got one",
            "missing one of my drinks", "short one drink",
            "drink made wrong", "drink was made wrong", "drink is wrong",
            "drink is made wrong", "made wrong", "drink remade", "remake",
            "redo my drink", "make it again", "can you redo", "please redo",
            "fix my drink", "replace my drink", "new drink", "another one",
            "make a new one", "i need a replacement", "replacement drink",
            "messed up", "screwed up", "botched", "ruined", "not right",
            "unsatisfied", "not as ordered", "off", "something is wrong",
            "there's a problem", "issue with my drink", "problem with my order",
            "complaint about my drink", "unhappy with my drink", "not good",
            "really bad", "inedible", "undrinkable", "can't drink this",
            "threw it away", "had to dump it", "couldn't finish it",
            "hair in my drink", "something in my drink", "found something",
            "foreign object", "dirty", "unclean", "contaminated", "bug in my drink",
            "lipstick on cup", "used cup", "cracked cup", "leaking",
            "lid wasn't on", "lid fell off", "spilled", "cup was damaged", "isn't right",
            "not right", "incorrect"
        ]

        refund_keywords = [
            "refund", "money back", "return my money", "get a refund", "give me a refund",
            "want my money back", "give me my money", "give me my money back",
            "request refund", "ask for refund", "need a refund", "want a refund",
            "demand a refund", "refund request", "claim refund", "issue refund",
            "full refund", "partial refund", "process a refund", "process my refund",
            "refund me", "refund my order", "refund this", "i want refunded",
            "how do i get a refund", "can i get a refund", "i'd like a refund",
            "requesting a refund", "please refund",
            "reimbursement", "reimburse me", "compensation", "compensate me",
            "seek reimbursement", "entitled to refund", "need compensation",
            "compensation for inconvenience", "make it right", "make this right",
            "credit", "request credit", "store credit", "credit my account",
            "charge back", "chargeback", "dispute charge", "reverse charge",
            "reverse the charge", "cancel charge", "undo charge",
            "overcharged", "incorrect charge", "wrong billing", "charged wrong",
            "charged too much", "double charged", "charged twice", "extra charge",
            "wrong amount", "wrong price", "price was wrong", "billed wrong",
            "not satisfied", "not happy", "not worth it", "poor quality",
            "bad experience", "unsatisfactory", "didn't like it", "didn't enjoy it",
            "waste of money", "rip off", "ripoff", "scam", "ripped off",
            "not worth the money", "not good value", "terrible experience",
            "worst experience", "horrible experience", "awful experience",
            "never ordering again", "last time i order", "regret ordering",
            "want my money", "i paid for", "i spent money on",
            "disappointed", "unhappy with service", "unsatisfactory experience",
            "unsatisfied with product", "not as expected", "didn't meet expectations",
            "not what i paid for", "false advertising", "misleading",
            "unacceptable", "bad service", "poor service", "terrible service",
            "inconvenienced", "request resolution", "resolve this",
            "how can you fix this", "what are you going to do about this",
            "cancel my order", "cancel order", "cancel this", "i want to cancel",
            "order cancellation", "cancelled", "canceled",
            "return", "return policy", "exchange", "swap",
            "money back guarantee", "request money back",
            "discount", "voucher", "coupon", "promo code", "free drink",
            "complimentary", "on the house", "freebie",
        ]
        
         # Check if user request has to do with wanting a refund or wanting a drink remade.
        made_wrong_found = any(keyword in user_input.lower() for keyword in drink_made_wrong_keywords)
        refund_keyword_found = any(keyword in user_input.lower() for keyword in refund_keywords)
        
        if(made_wrong_found or refund_keyword_found):
            print("drink made wrong or refund requested")
            return JsonResponse({
                "responses": "Oh no, I'm sorry that happend to you. To confirm do you want the drink remade or do you want a refund?",
                "wrong_drink_phase": "init",
                "refund_phase": "init",
                "order_num": "none",
                "drink_nums": "none"
                })

    
        full_input = grounding_info + user_input

        new_user_input_ids = tokenizer.encode(full_input + tokenizer.eos_token, return_tensors='pt')
        attention_mask = torch.ones_like(new_user_input_ids)

        bot_input_ids = new_user_input_ids

        result = [None]

        def generate():
            result[0] = model.generate(
                bot_input_ids,
                max_new_tokens=100,
                pad_token_id=tokenizer.eos_token_id,
                temperature=1.0,
                top_k=50,
                do_sample=True,
                attention_mask=attention_mask,
                top_p=0.9,
            )

        thread = threading.Thread(target=generate)
        thread.start()
        thread.join(timeout=30)

        if result[0] is None:
            response = "I'm sorry, I'm taking too long to think. Could you try again?"
        else:
            chat_history_ids = result[0]
            response = tokenizer.decode(chat_history_ids[:, bot_input_ids.shape[-1]:][0], skip_special_tokens=True)

        if not response.strip():
            response = "I'm sorry, I didn't quite understand that. Could you rephrase your question?"

        print("Model response:", response)

        return JsonResponse({
            "responses": response,
            "wrong_drink_phase": "none",
            "refund_phase": "none",
            "order_num": "none",
            "drink_nums": "none"
        })