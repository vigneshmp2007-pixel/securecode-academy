# Vulnerable login. The query is built by gluing strings together.
# `db` is a sqlite3 connection with a `users` table (id, username, password, role).
# Return True when the credentials are valid, otherwise False.

def login(db, username, password):
    query = (
        "SELECT id FROM users WHERE username = '" + username +
        "' AND password = '" + password + "'"
    )
    row = db.execute(query).fetchone()
    return row is not None
