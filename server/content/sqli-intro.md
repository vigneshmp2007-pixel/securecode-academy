# How SQL injection works

SQL injection (SQLi) happens when **user input becomes part of the SQL command** instead of staying data.

## The vulnerable pattern

```python
query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
```

If the attacker types `' OR 1=1 --` as the username, the database receives:

```sql
SELECT * FROM users WHERE username = '' OR 1=1 --' AND password = ''
```

`OR 1=1` is always true and `--` comments out the password check. The login succeeds for the first user in the table, often the admin.

## The fix: parameterized queries

Send the SQL structure and the values **separately**. The database never parses the values as code.

```python
db.execute("SELECT id FROM users WHERE username = ? AND password = ?", (username, password))
```

## What does not work

- Removing or escaping quotes by hand. Attackers have many encodings, and real names like `O'Brien` break.
- Blocklists of words like `OR` or `DROP`.
- Client-side validation only.

## Defense in depth

1. Parameterized queries everywhere (including ORDER BY values via allow-lists).
2. Least-privilege database accounts.
3. Hash passwords (bcrypt/argon2). Never compare plain text.

When you finish reading, mark the lesson complete and move to the challenge.
