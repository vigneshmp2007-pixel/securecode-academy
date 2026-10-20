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
    db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)")
    db.executemany(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        [("admin", "S3cr3t!pass", "admin"), ("alice", "wonderland", "user"), ("o'brien", "p@ss'word", "user")],
    )
    return db


try:
    from user import login
except Exception as e:  # noqa: BLE001
    results.append({"name": "Your code loads", "passed": False, "hint": "Fix the error and run again.", "error": "%s: %s" % (type(e).__name__, e)})
    emit()
    sys.exit(0)

case("Valid credentials still work", lambda: bool(login(fresh_db(), "alice", "wonderland")),
     "Legitimate users must be able to log in.")
case("Wrong password is rejected", lambda: not bool(login(fresh_db(), "alice", "nope")),
     "A wrong password should return False.")
case("Exploit 1: ' OR 1=1 -- is blocked", lambda: not bool(login(fresh_db(), "' OR 1=1 --", "x")),
     "User input is still being interpreted as SQL. Use ? placeholders.")
case("Exploit 2: admin'-- comment bypass is blocked", lambda: not bool(login(fresh_db(), "admin'--", "")),
     "Never concatenate input into the query string.")
case("Exploit 3: tautology in password is blocked", lambda: not bool(login(fresh_db(), "alice", "' OR '1'='1")),
     "Both fields must be passed as bound parameters.")
case("Quotes in real data still work (o'brien)", lambda: bool(login(fresh_db(), "o'brien", "p@ss'word")),
     "Parameterized queries handle quotes correctly. Stripping quotes breaks real users.")
emit()
