# Vulnerable invoice lookup. `db` is a sqlite3 connection with an
# `invoices` table (id, owner_id, item, amount).
# Return the invoice as a tuple/dict when the CURRENT user owns it, otherwise None.

def get_invoice(db, current_user_id, invoice_id):
    row = db.execute(
        "SELECT id, owner_id, item, amount FROM invoices WHERE id = " + str(invoice_id)
    ).fetchone()
    return row
