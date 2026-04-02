# Live Order Journey Demo Runbook

## Goal
Deliver a clean 4-6 minute show-and-tell that demonstrates:
- Real-time customer tracking with ETA
- Manager-controlled order progression
- Resilience under unstable network conditions

## Preflight (10 minutes before demo)

1. Backend terminal
- Open terminal in `codepop_backend`
- Activate environment
- Run:
  - `python manage.py migrate`
  - `python manage.py runserver <YOUR_IP>:8000`

2. Frontend terminal
- Open terminal in `codepop`
- Confirm `ip_address.js` points to backend IP
- Run:
  - `npm install`
  - `npm run android`

3. Login accounts
- Customer flow account: `test` / `password`
- Manager flow account: `staff` / `password`

4. Data sanity check
- Ensure at least one drink can be added to cart
- Ensure manager dashboard opens without API errors

## Live Demo Script (Target: 5 minutes)

### 0:00-0:40 Intro
Say:
- "We implemented a live order journey so customers can track exactly where their order is and when it will be ready."
- "Managers can update prep stages in real time, and customers see those updates instantly."

Screen:
- Start on customer app home/cart path

### 0:40-1:45 Create order
Actions:
1. Add drink(s) to cart
2. Go to cart
3. Complete payment flow
4. Land on `PostCheckout`

Callout:
- "The tracker initializes with live status and ETA from backend order state."

### 1:45-3:20 Show live tracking wow moment
Actions:
1. Keep customer app visible (or split view)
2. Open manager account in manager dashboard
3. Open `Live Order Controls`
4. Find latest order
5. Click `Next: processing`
6. Show customer timeline updating to Mixing
7. Click `+2 min`
8. Show customer ETA shifting
9. Click `Next: completed`
10. Show customer status turning Ready

Callout:
- "This is a true end-to-end lifecycle update from manager actions to customer visibility."
- "ETA is dynamic and can adjust when operations change."

### 3:20-4:30 Shareholder value punchline
Say:
- "For customers, this reduces uncertainty and improves trust."
- "For operations, it reduces support friction from status questions."
- "For business outcomes, we expect better repeat orders and fewer complaint tickets tied to wait uncertainty."

### 4:30-5:00 Reliability close
Say:
- "If connectivity drops briefly during service, the UI enters presentation fallback mode and keeps the journey understandable while reconnecting."

## Backup Paths (If Something Fails)

1. Payment issue
- Keep pre-created order available in database from rehearsal.
- Open manager controls and walk through live status progression anyway.

2. API/network hiccup
- Wait one poll cycle (5 seconds).
- If fallback badge appears, narrate resilience behavior and continue.

3. Emulator lag
- Use fewer transition clicks, keep only one order in focus.

## Rehearsal Checklist

1. Dry run A: full happy path
- Completed payment to ready status in < 3 minutes
- Timeline and ETA visible and readable

2. Dry run B: degraded network simulation
- Disable network briefly or induce timeout
- Confirm fallback label appears
- Confirm app resumes live updates after network returns

3. Dry run C: presentation pacing
- Practice script with stopwatch
- Keep total under 6 minutes
- Ensure each wow moment happens once, clearly

## Visual Delivery Tips

1. Keep customer tracker on-screen for most of demo.
2. Use manager controls sparingly: one status jump, one ETA delay, final completion.
3. Pause 2-3 seconds after each click so audience sees the update.
4. Verbally narrate cause/effect each time:
- "Manager action here"
- "Customer sees this immediately"

## Final Go/No-Go

Go only if all are true:
- Backend and frontend both running
- Customer can reach `PostCheckout`
- Manager `Live Order Controls` can update at least one order
- Customer tracker status changes within one polling cycle
