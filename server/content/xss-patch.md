# Challenge: write the sanitizer

## 1. Exploit

Open the **Exploit** tab. The page below renders your input with `innerHTML`. Make `alert()` fire. The page runs in a sandboxed iframe, so it cannot touch this site.

## 2. Patch

Open the **Patch** tab and complete `sanitize(input)`. It must return a string that is safe in HTML text and in quoted attributes.

- Use **Preview in sandbox** to run your function in a Web Worker and render the result in a sandboxed iframe.
- Use **Run tests** to verify against the full suite on the server.

Passing earns **50 XP** and moves you toward the **XSS Hunter** badge.
