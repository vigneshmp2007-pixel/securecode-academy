# How cross-site scripting (XSS) works

XSS happens when an application **puts untrusted input into a page without encoding it**. The browser cannot tell your markup from the attacker's, so it runs both.

## Reflected example

A search page prints the query back:

```html
<h2>Results for: {{ query }}</h2>
```

If `query` is `<img src=x onerror=alert(1)>`, the browser creates an image, fails to load it, and runs the `onerror` code. In a real attack that code steals session data or performs actions as the victim.

## The fix: encode for the output context

| Context | Dangerous characters | Encode as |
| --- | --- | --- |
| HTML text | `& < >` | `&amp; &lt; &gt;` |
| Quoted attribute | `" '` also | `&quot; &#39;` |

Encode `&` **first**. Otherwise you encode your own `&lt;` into `&amp;lt;` twice.

## Other defenses

- Prefer `textContent` over `innerHTML`.
- Use a framework that escapes by default (React does).
- Add a Content-Security-Policy to limit damage.
- Set session cookies as `HttpOnly`.
- If you must allow HTML, use a maintained sanitizer such as DOMPurify. Never write your own allow-list.

Mark this lesson complete when you are ready for the challenge.
