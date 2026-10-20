import json
import os
import sqlite3
import sys

TOKEN = os.environ.pop("RESULT_TOKEN", "")
results = []


def emit():
    sys.stdout.write("\n__RESULT__%s:%s\n" % (TOKEN, json.dumps(results)))
    sys.stdout.flush()


def case(name, fn, hint=""):
    try:
        ok, err = bool(fn()), None
    except Exception as e:  # noqa: BLE001
        ok, err = False, "%s: %s" % (type(e).__name__, e)
    results.append({"name": name, "passed": ok, "hint": "" if ok else hint, "error": err})


def fresh_db():
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE invoices (id INTEGER PRIMARY KEY, owner_id INTEGER, item TEXT, amount REAL)")
    db.executemany(
        "INSERT INTO invoices (id, owner_id, item, amount) VALUES (?, ?, ?, ?)",
        [(1, 1, "user1-laptop", 1299.0), (2, 2, "user2-confidential-contract", 8800.0), (3, 2, "user2-server-rack", 4200.0)],
    )
    return db


try:
    from user import get_invoice
except Exception as e:  # noqa: BLE001
    results.append({"name": "Your code loads", "passed": False, "hint": "Fix the error and run again.", "error": "%s: %s" % (type(e).__name__, e)})
    emit()
    sys.exit(0)

case("Owner can read their own invoice", lambda: "user1" in str(get_invoice(fresh_db(), 1, 1)),
     "User 1 must still be able to read invoice 1.")
case("Another user's invoice is denied (user 1 -> invoice 2)", lambda: get_invoice(fresh_db(), 1, 2) is None,
     "Check owner_id against current_user_id in the query.")
case("Another user's invoice is denied (user 1 -> invoice 3)", lambda: get_invoice(fresh_db(), 1, 3) is None,
     "Every invoice needs the ownership check, not just one.")
case("Second owner works (user 2 -> invoice 2)", lambda: "user2" in str(get_invoice(fresh_db(), 2, 2)),
     "Ownership is per user, do not hard-code user ids.")
case("Missing invoice returns None", lambda: get_invoice(fresh_db(), 1, 999) is None,
     "Return None when nothing matches.")
case("Injection in invoice_id leaks nothing", lambda: "user2" not in str(get_invoice(fresh_db(), 1, "1 OR 1=1")),
     "Also use a placeholder for invoice_id.")
emit()
