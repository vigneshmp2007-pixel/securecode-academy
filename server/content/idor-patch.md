# Challenge: enforce ownership

## 1. Exploit

You are logged in as **alice** (user 1). Open the **Exploit** tab and request invoices that belong to other people by changing the id.

## 2. Patch

Open the **Patch** tab. Fix `get_invoice(db, current_user_id, invoice_id)` so only the owner gets a result. Everyone else gets `None`.

Use placeholders for **both** values. The tests also try an injection through `invoice_id`.

Passing earns **50 XP** and completes the track toward the **IDOR Inspector** badge.
