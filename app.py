"""
app.py — Flask REST API for Smart Student Expense Tracker
Run:  python app.py
API base: http://localhost:5000/api/
"""

from flask import Flask, jsonify, request, render_template, abort
from flask_cors import CORS
import database as db

app = Flask(__name__)
CORS(app)  # Allow frontend on same origin; also works with Live Server dev setups

# Valid expense categories
CATEGORIES = [
    "Food & Dining",
    "Transportation",
    "Education",
    "Entertainment",
    "Healthcare",
    "Shopping",
    "Utilities",
    "Rent",
    "Personal Care",
    "Other"
]

# ───────────────────────── Frontend Route ──────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ───────────────────────── Expenses API ────────────────────────────────────

@app.route("/api/expenses", methods=["GET"])
def api_get_expenses():
    category   = request.args.get("category", None)
    start_date = request.args.get("start_date", None)
    end_date   = request.args.get("end_date", None)
    expenses = db.get_all_expenses(category, start_date, end_date)
    return jsonify({"success": True, "data": expenses, "count": len(expenses)})


@app.route("/api/expenses/<int:expense_id>", methods=["GET"])
def api_get_expense(expense_id):
    expense = db.get_expense_by_id(expense_id)
    if not expense:
        return jsonify({"success": False, "error": "Expense not found"}), 404
    return jsonify({"success": True, "data": expense})


@app.route("/api/expenses", methods=["POST"])
def api_add_expense():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "error": "Invalid JSON body"}), 400

    # Validate required fields
    errors = _validate_expense(data)
    if errors:
        return jsonify({"success": False, "error": errors}), 422

    new_id = db.add_expense(
        amount=float(data["amount"]),
        category=data["category"].strip(),
        date=data["date"].strip(),
        description=data.get("description", "").strip()
    )
    expense = db.get_expense_by_id(new_id)
    return jsonify({"success": True, "data": expense, "message": "Expense added successfully"}), 201


@app.route("/api/expenses/<int:expense_id>", methods=["PUT"])
def api_update_expense(expense_id):
    if not db.get_expense_by_id(expense_id):
        return jsonify({"success": False, "error": "Expense not found"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "error": "Invalid JSON body"}), 400

    errors = _validate_expense(data)
    if errors:
        return jsonify({"success": False, "error": errors}), 422

    db.update_expense(
        expense_id=expense_id,
        amount=float(data["amount"]),
        category=data["category"].strip(),
        date=data["date"].strip(),
        description=data.get("description", "").strip()
    )
    updated = db.get_expense_by_id(expense_id)
    return jsonify({"success": True, "data": updated, "message": "Expense updated successfully"})


@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def api_delete_expense(expense_id):
    if not db.get_expense_by_id(expense_id):
        return jsonify({"success": False, "error": "Expense not found"}), 404
    db.delete_expense(expense_id)
    return jsonify({"success": True, "message": "Expense deleted successfully"})


# ───────────────────────── Budget API ──────────────────────────────────────

@app.route("/api/budget", methods=["GET"])
def api_get_budget():
    return jsonify({"success": True, "monthly_budget": db.get_budget()})


@app.route("/api/budget", methods=["POST"])
def api_set_budget():
    data = request.get_json(silent=True)
    if not data or "monthly_budget" not in data:
        return jsonify({"success": False, "error": "monthly_budget field is required"}), 400
    try:
        budget = float(data["monthly_budget"])
        if budget <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "monthly_budget must be a positive number"}), 422

    db.set_budget(budget)
    return jsonify({"success": True, "monthly_budget": budget, "message": "Budget updated successfully"})


# ───────────────────────── Summary & Charts API ────────────────────────────

@app.route("/api/summary", methods=["GET"])
def api_summary():
    return jsonify({"success": True, "data": db.get_summary()})


@app.route("/api/charts/category", methods=["GET"])
def api_chart_category():
    return jsonify({"success": True, "data": db.get_category_chart_data()})


@app.route("/api/charts/monthly", methods=["GET"])
def api_chart_monthly():
    return jsonify({"success": True, "data": db.get_monthly_chart_data()})


@app.route("/api/categories", methods=["GET"])
def api_categories():
    return jsonify({"success": True, "data": CATEGORIES})


# ───────────────────────── Helpers ────────────────────────────────────────

def _validate_expense(data):
    """Return error string or None."""
    errors = []

    amount = data.get("amount")
    try:
        if amount is None or float(amount) <= 0:
            errors.append("Amount must be a positive number.")
    except (ValueError, TypeError):
        errors.append("Amount must be a valid number.")

    category = data.get("category", "").strip()
    if not category:
        errors.append("Category is required.")
    elif category not in CATEGORIES:
        errors.append(f"Invalid category '{category}'.")

    date = data.get("date", "").strip()
    if not date:
        errors.append("Date is required.")
    else:
        import re
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            errors.append("Date must be in YYYY-MM-DD format.")

    return " | ".join(errors) if errors else None


# ───────────────────────── Error Handlers ─────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Resource not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "error": "Method not allowed"}), 405


@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error"}), 500


# ───────────────────────── Entry Point ────────────────────────────────────

if __name__ == "__main__":
    db.init_db()
    print("=" * 55)
    print("  Smart Student Expense Tracker  🎓")
    print("  Running at http://localhost:5000")
    print("=" * 55)
    app.run(debug=True, port=5000, use_reloader=False)
