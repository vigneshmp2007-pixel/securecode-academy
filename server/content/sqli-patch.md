# Challenge: patch the login

You have two jobs.

## 1. Exploit

Open the **Exploit** tab. The login form builds its query with string concatenation. Log in as `admin` without knowing the password.

Start with `' OR 1=1 --` in the username field.

## 2. Patch

Open the **Patch** tab. Rewrite `login(db, username, password)` so it uses **parameterized queries**.

Run the test suite. You pass when:

- real users can still log in (including `o'brien`)
- every exploit payload fails

Passing the challenge earns **50 XP**. Finish the module to unlock the **SQL Slayer** badge.
