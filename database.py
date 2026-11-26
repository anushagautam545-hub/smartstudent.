"""
database.py — SQLite database setup and helper functions
Smart Student Expense Tracker
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "expenses.db")


def get_connection():
    """Create and return a database connection with row_factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Allows dict-like row access
    conn.execute("PRAGMA journal_mode=WAL")  # Better concurrent access
    return conn


def init_db():
    """Initialize the database: create tables if they don't exist."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()

    # Expenses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            amount      REAL    NOT NULL CHECK(amount > 0),
            category    TEXT    NOT NULL,
            date        TEXT    NOT NULL,
            description TEXT    DEFAULT '',
            created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
        )
    """)

    # Budget table (single row — always upsert id=1)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budget (
            id          INTEGER PRIMARY KEY,
            monthly     REAL    NOT NULL DEFAULT 5000.0,
            updated_at  TEXT    DEFAULT (datetime('now', 'localtime'))
        )
    """)

    # Seed default budget if none exists
    cursor.execute("INSERT OR IGNORE INTO budget (id, monthly) VALUES (1, 5000.0)")

    conn.commit()
    conn.close()


# ─────────────────────────── Expense CRUD ──────────────────────────────────

def get_all_expenses(category=None, start_date=None, end_date=None):
    conn = get_connection()
    query = "SELECT * FROM expenses WHERE 1=1"
    params = []

    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    query += " ORDER BY date DESC, id DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_expense_by_id(expense_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def add_expense(amount, category, date, description=""):
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO expenses (amount, category, date, description) VALUES (?, ?, ?, ?)",
        (amount, category, date, description)
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id


def update_expense(expense_id, amount, category, date, description=""):
    conn = get_connection()
    conn.execute(
        """UPDATE expenses
           SET amount=?, category=?, date=?, description=?
           WHERE id=?""",
        (amount, category, date, description, expense_id)
    )
    conn.commit()
    conn.close()


def delete_expense(expense_id):
    conn = get_connection()
    conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
    conn.close()


# ─────────────────────────── Budget ────────────────────────────────────────

def get_budget():
    conn = get_connection()
    row = conn.execute("SELECT monthly FROM budget WHERE id = 1").fetchone()
    conn.close()
    return row["monthly"] if row else 5000.0


def set_budget(monthly):
    conn = get_connection()
    conn.execute(
        """INSERT INTO budget (id, monthly, updated_at)
           VALUES (1, ?, datetime('now','localtime'))
           ON CONFLICT(id) DO UPDATE SET monthly=excluded.monthly,
                                         updated_at=excluded.updated_at""",
        (monthly,)
    )
    conn.commit()
    conn.close()


# ─────────────────────────── Summary / Charts ──────────────────────────────

def get_summary():
    """Return dashboard summary statistics."""
    conn = get_connection()

    # Total all-time
    total = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM expenses").fetchone()[0]

    # This month
    monthly_total = conn.execute(
        """SELECT COALESCE(SUM(amount), 0) FROM expenses
           WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')"""
    ).fetchone()[0]

    # Budget
    budget = conn.execute("SELECT monthly FROM budget WHERE id=1").fetchone()
    monthly_budget = budget["monthly"] if budget else 5000.0
    remaining = max(0.0, monthly_budget - monthly_total)

    # Total number of expenses
    count = conn.execute("SELECT COUNT(*) FROM expenses").fetchone()[0]

    conn.close()
    return {
        "total_expenses":   round(total, 2),
        "monthly_total":    round(monthly_total, 2),
        "monthly_budget":   round(monthly_budget, 2),
        "remaining_budget": round(remaining, 2),
        "expense_count":    count,
        "over_budget":      monthly_total > monthly_budget
    }


def get_category_chart_data():
    """Sum of expenses grouped by category (current month)."""
    conn = get_connection()
    rows = conn.execute(
        """SELECT category, COALESCE(SUM(amount), 0) AS total
           FROM expenses
           WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now', 'localtime')
           GROUP BY category
           ORDER BY total DESC"""
    ).fetchall()
    conn.close()
    return [{"category": r["category"], "total": round(r["total"], 2)} for r in rows]


def get_monthly_chart_data():
    """Sum of expenses for the last 6 months."""
    conn = get_connection()
    rows = conn.execute(
        """SELECT strftime('%Y-%m', date) AS month,
                  COALESCE(SUM(amount), 0) AS total
           FROM expenses
           WHERE date >= date('now', '-6 months')
           GROUP BY month
           ORDER BY month ASC"""
    ).fetchall()
    conn.close()
    return [{"month": r["month"], "total": round(r["total"], 2)} for r in rows]
