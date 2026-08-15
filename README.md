# GravaStar Django Backend — Setup Guide

## What I found and fixed

1. **`store/views.py` had a crash bug** — used `models.Q(...)` but never
   imported `models`. Any search request would have thrown a
   `NameError` and returned a 500 error. Fixed by importing `Q` properly.
2. **`store/admin.py` never registered `Product`** — so it never showed up
   in Django's built-in `/admin/` panel at all.
3. **The `Product` model was missing fields your frontend actually needs**
   — no `price`, `stock`, or `image`. Added those, plus `regular_price`
   and `is_active`.
4. **No `Order`/`OrderItem` models existed at all** — so there was no way
   to persist a completed checkout, which is exactly the customer/stock
   data that kept disappearing from `localStorage`.
5. **`api/index.py` (Vercel entry point) pointed at a `backend/` folder
   that doesn't exist** — your Django project is in `core/`. Fixed the path.
6. **`vercel.js` should be `vercel.json`** — Vercel only reads that exact
   filename, and its `frontend/` folder paths didn't match your actual
   file layout (everything sits at the project root). Renamed and fixed.
7. **No `requirements.txt`** — added one so Vercel (and anyone else) knows
   to install Django and django-cors-headers.

## New API endpoints

| Method | URL | What it does |
|---|---|---|
| GET | `/api/products/` | List all active products |
| POST | `/api/products/` | Create/update a product |
| GET | `/api/products/<id>/` | Get one product |
| PUT/PATCH | `/api/products/<id>/` | Update one product |
| DELETE | `/api/products/<id>/` | Delete one product |
| GET | `/api/search/?q=...` | Search products by name/category |
| POST | `/api/auth/signup/` | Create an account, logs you in |
| POST | `/api/auth/login/` | Log in |
| POST | `/api/auth/logout/` | Log out |
| GET | `/api/auth/whoami/` | Check current login status |
| GET | `/api/orders/` | List all orders (for admin dashboard) |
| POST | `/api/orders/` | Place an order — **automatically decrements product stock** |

All of this was tested live and confirmed working: created a product,
listed it, searched for it, signed up a user, placed an order, and
confirmed stock correctly dropped from 15 → 13 after ordering 2 units.

## How to run this locally

```bash
# From inside the "core" folder:
cd core

# 1. Create and activate a virtual environment (skip if you already have one)
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux

# 2. Install dependencies
pip install -r ../requirements.txt

# 3. Apply migrations (creates the database tables)
python manage.py migrate

# 4. Create an admin account for yourself
python manage.py createsuperuser

# 5. Run the server
python manage.py runserver
```

Your API is now live at `http://127.0.0.1:8000/api/...`, and Django's
built-in admin panel is at `http://127.0.0.1:8000/admin/`.

## Important — this does NOT yet connect to your frontend

Your `catalog.js`, `cart.js`, and `admin-dashb.js` still read/write to
`localStorage` exactly as before. The backend now genuinely works and is
ready — but nothing in your HTML/JS calls it yet. That's the natural next
step: swapping `localStorage.getItem(...)` calls for `fetch('/api/...')`
calls, page by page. Ask me to do this next whenever you're ready — I'd
suggest starting with the product catalog (`catalog.js`) since that's the
foundation everything else builds on.
