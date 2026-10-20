# How IDOR works

An **Insecure Direct Object Reference** is a broken access control bug. The app uses an identifier from the request (like `/invoices/42`) and returns the object without checking that **the current user is allowed to see it**.

```
GET /api/invoices/1   -> your invoice
GET /api/invoices/2   -> someone else's invoice (200 OK!)
```

Changing one number should never expose another customer's data.

## Why it happens

- Authentication is checked ("is someone logged in?") but authorization is not ("is it *their* record?").
- Developers assume IDs are secret or hard to guess.

## Fixes

1. **Check ownership on every request**, in the server, using the identity from the session, never an id sent by the client.
2. Put the ownership condition **in the query**: `WHERE id = ? AND owner_id = ?`.
3. Return `404` (not `403`) so attackers cannot learn which ids exist.
4. Random ids (UUIDs) reduce guessing but do **not** replace authorization.

IDOR sits under *Broken Access Control*, number one in the OWASP Top 10.

Mark this lesson complete when you are ready for the challenge.
