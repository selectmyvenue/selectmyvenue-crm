# SMV WhatsApp Lead Workflow — Free Starter

## Scope and safety

This is a zero-new-subscription, manual-first workflow for the existing WhatsApp Business app and Select My Venue CRM. It does **not** connect the WhatsApp API, send messages automatically, modify Supabase, or deploy anything. WhatsApp Business app settings must be configured manually on the phone.

Do not promise that this is a fully automated 24/7 AI bot. Official API, AI inference, hosting, and provider fees may apply to full automation.

## 1. Configure in WhatsApp Business app

1. Open WhatsApp Business on the existing business phone.
2. Open **Business tools** (menu names may vary by app version).
3. Set a short **Greeting message** and, if useful, an **Away message**.
4. Add these **Quick replies** using the shortcuts below.
5. Test from another phone before sharing the number widely.
6. Keep the existing number/account; do not migrate it or register it with a provider as part of this starter workflow.

### Greeting message

Namaste! 👋 Select My Venue mein welcome hai.

Hum aapke event ke liye suitable venues shortlist karne mein help karenge. Please apni requirement share karein:

1. Event/occasion
2. City aur preferred area
3. Approx. guest count
4. Event date (ya dates flexible hain?)
5. Budget per person ya total budget

Aap jitni details abhi share kar sakte hain bhej dein. Hamari team requirement review karke aapse contact karegi.

### Quick reply: `/details`

Thanks! 😊 Suitable options find karne ke liye please ye details share karein:

• Occasion:
• City/area:
• Guests:
• Event date:
• Budget (per plate ya total):
• Venue type (banquet/lawn/farmhouse/hotel/other):
• Food preference:
• Any must-have (parking/rooms/indoor-outdoor):

Jo details abhi confirm nahi hain, unhe blank chhod sakte hain.

### Quick reply: `/followup`

Namaste! Select My Venue se follow-up kar rahe hain. Kya aapki venue requirement abhi active hai? Agar haan, please event date, guest count aur preferred area confirm kar dein. Thank you.

### Quick reply: `/human`

Bilkul, hamari team ka member aapse personally baat karega. Aap apna convenient callback time share kar sakte hain.

### Quick reply: `/privacy`

Aapki details sirf aapki venue enquiry ko handle karne aur relevant follow-up ke liye use ki jayengi. Agar aap follow-up nahi chahte, please bata dein.

## 2. Manual lead handling SOP

1. Reply to the customer using the greeting/details quick reply.
2. Confirm only missing details; do not ask the customer to repeat information already sent.
3. In the existing CRM, create the enquiry through the currently approved CRM workflow. Do not use direct public Supabase writes.
4. Use the existing `customer_enquiries` fields where available:
   - `customer_name`, `mobile`
   - `occasion`, `location` / `preferred_city` / `preferred_area`
   - `guests`, `event_date`, `budget_per_person`
   - `food_preference`, `venue_type_preference`, `requirements`
   - `source`: use a consistent value such as `WhatsApp` only if accepted by the current CRM form/workflow.
5. Put a short, factual conversation summary in the approved requirements/notes field. Never store OTPs, passwords, payment details, or unrelated sensitive data.
6. Match venues only using existing approved/active venue records. Never invent availability, prices, facilities, or verification.
7. Send shortlist manually, clearly marking prices/availability as subject to venue confirmation.
8. Update CRM status and next follow-up using existing CRM controls. Respect opt-outs and stop promotional follow-up when requested.

## 3. Free pilot checklist

- [ ] Configure greeting and quick replies in the phone app.
- [ ] Test the flow from a second number.
- [ ] Confirm the existing CRM accepts a WhatsApp enquiry through its normal workflow.
- [ ] Confirm the lead appears once, with correct source and details.
- [ ] Confirm the sales team can follow up from the CRM.
- [ ] Test an opt-out request and stop further follow-up.
- [ ] Review 10 real, consented enquiries before deciding whether to automate.

Use synthetic/test enquiries only in a non-production test environment. Do not create dummy leads in production.

## 4. What is deliberately not enabled

- WhatsApp Cloud API / provider connection
- Automatic message sending or webhook processing
- AI API calls
- New Supabase tables, columns, policies, secrets, or Edge Functions
- Changes to the production website or CRM
- Paid subscriptions or usage-based services

Any future automation should be separately cost-checked and security-reviewed, tested off-production, and explicitly approved before deployment.
