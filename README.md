# 🎓 Smart Student Expense Tracker

A full-stack web application for college students to manage daily expenses, set monthly budgets, and analyse spending habits — built with **Python Flask**, **SQLite**, **HTML/CSS/JavaScript**, and **Chart.js**.

---

## 📸 Features

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Real-time summary cards: monthly budget, spending, remaining budget, total expenses |
| ➕ **Add Expense** | Form with amount, category, date, description + full validation |
| 📋 **Expense History** | Paginated table with edit & delete for every expense |
| 🔍 **Filters** | Filter history by category and date range |
| 💰 **Budget Manager** | Set and update monthly spending limit |
| 📈 **Charts** | Category pie chart + 6-month bar chart powered by Chart.js |
| 📱 **Responsive** | Works on mobile, tablet, and desktop |
| 💾 **Persistent Storage** | All data saved in SQLite database |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python 3.x + Flask |
| Database | SQLite (via Python's built-in `sqlite3`) |
| Charts | Chart.js v4 |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts — Inter |

---

## 📁 Project Structure

```
smartstudent/
│
├── app.py              ← Flask application & REST API
├── database.py         ← Database initialization & queries
├── requirements.txt    ← Python dependencies
├── README.md           ← This file
│
├── templates/
│   └── index.html      ← Single-page HTML shell (served by Flask)
│
├── static/
│   ├── css/
│   │   └── style.css   ← Full design system
│   └── js/
│       ├── app.js      ← Main application logic
│       ├── charts.js   ← Chart.js rendering
│       └── utils.js    ← Utilities & helpers
│
└── data/
    └── expenses.db     ← SQLite database (auto-created on first run)
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Python 3.8+** installed ([python.org](https://python.org))
- pip (comes with Python)

### Step 1 — Clone or download the project
```bash
# If using git:
git clone <repo-url>
cd smartstudent

# Or simply open the project folder in your terminal
```

### Step 2 — Install dependencies
```bash
pip install -r requirements.txt
```

### Step 3 — Run the application
```bash
python app.py
```

You should see:
```
=======================================================
  Smart Student Expense Tracker  🎓
  Running at http://localhost:5000
=======================================================
```

### Step 4 — Open in browser
Navigate to: **http://localhost:5000**

> 💡 The SQLite database (`data/expenses.db`) is created automatically on first run. No database setup required!

---

## 🔌 API Reference

All endpoints return JSON.

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/expenses` | Get all expenses (supports `?category=`, `?start_date=`, `?end_date=`) |
| `GET` | `/api/expenses/<id>` | Get single expense |
| `POST` | `/api/expenses` | Add new expense |
| `PUT` | `/api/expenses/<id>` | Update expense |
| `DELETE` | `/api/expenses/<id>` | Delete expense |

### Budget

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/budget` | Get current monthly budget |
| `POST` | `/api/budget` | Set monthly budget |

### Summary & Charts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/summary` | Dashboard stats |
| `GET` | `/api/charts/category` | Category totals (current month) |
| `GET` | `/api/charts/monthly` | Monthly totals (last 6 months) |
| `GET` | `/api/categories` | List of valid categories |

### Example — Add an Expense (POST `/api/expenses`)
```json
{
  "amount": 250.00,
  "category": "Food & Dining",
  "date": "2024-11-25",
  "description": "Lunch at canteen"
}
```

---

## 📂 Expense Categories

- Food & Dining
- Transportation
- Education
- Entertainment
- Healthcare
- Shopping
- Utilities
- Rent
- Personal Care
- Other

---

## 🧪 Testing the API

You can test the API with **curl** or any REST client (Postman, Thunder Client):

```bash
# Get all expenses
curl http://localhost:5000/api/expenses

# Add an expense
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"amount":150,"category":"Food & Dining","date":"2024-11-26","description":"Coffee"}'

# Set budget
curl -X POST http://localhost:5000/api/budget \
  -H "Content-Type: application/json" \
  -d '{"monthly_budget":8000}'
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|---------|
| `ModuleNotFoundError: flask` | Run `pip install -r requirements.txt` |
| Port 5000 already in use | Change port: `app.run(port=5001)` in `app.py` |
| Database errors | Delete `data/expenses.db` and restart — it recreates automatically |
| Charts not loading | Ensure internet connection (Chart.js loads from CDN) |

---

## 👨‍💻 Project Information

- **Project Type:** College Full-Stack Web Application
- **Subject:** Web Development / Software Engineering
- **Tech Stack:** Python Flask + SQLite + HTML/CSS/JS + Chart.js
- **Purpose:** Personal finance management for students

---

## 📝 License

This project is for educational purposes.
