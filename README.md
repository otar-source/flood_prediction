# 🌊 Flood Safe Routes

**Web-Based Community Flood Prediction and Reporting Safe Route Recommender System**  
for **Rivers State, Nigeria**.

A full-stack Node.js + Express + MongoDB application that lets communities report flooding, view verified flood reports and prediction zones on an interactive map, and find safe routes that avoid flooded or high-risk roads.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **Authentication** | Register / login with bcrypt-hashed passwords and JWT stored in httpOnly cookies. Admin and user roles. |
| **Flood Reporting** | Community users submit reports with photo, severity, and map-picked coordinates. Reports are `pending` until an admin verifies or rejects them. |
| **Admin Module** | Dashboard with stats, user activation/deactivation, report verification/rejection, system logs, and prediction records. |
| **Weather & Prediction** | Rainfall fetched from OpenWeatherMap for 8 monitored Rivers State locations. A **rule-based prediction engine** (clearly marked for ML swap) computes risk levels with confidence scores, boosted by nearby verified reports. |
| **Flood Map (GIS)** | Leaflet map centered on Port Harcourt. Verified reports as colored pins, prediction zones as colored circles. Legend, layer toggles, auto-refresh every 60s. |
| **Safe Route Recommendation** | Dijkstra over a connected road graph. Excludes affected/closed/High-risk roads; ×3 weight on Moderate-risk roads. Saves route history, warns on high-risk proximity. |
| **Notifications** | Bell panel with unread count and 30s polling. Triggered by verified High-severity reports near monitored locations and by safe routes passing near High-risk zones. |
| **Security** | Helmet CSP, three rate limiters, express-validator on every form, upload restrictions, server-side role checks. |

---

## 🧱 Tech Stack

- **Backend:** Node.js (LTS ≥ 18), Express.js
- **Database:** MongoDB + Mongoose
- **Frontend:** Vanilla HTML5 / CSS3 / JavaScript, EJS templates
- **Maps:** Leaflet + OpenStreetMap tiles
- **Auth:** bcryptjs + jsonwebtoken (httpOnly cookie)
- **Weather:** OpenWeatherMap API
- **Security:** helmet, express-rate-limit, express-validator
- **File uploads:** multer (5 MB, images only)

---

## 🚀 Setup

### 1. Prerequisites

- **Node.js LTS** (≥ 18 recommended — uses global `fetch`)
- **MongoDB** running locally (or a remote URI)
- A free **OpenWeatherMap** API key _(optional — the app runs in simulation mode without one)_

### 2. Install

```bash
git clone <your-repo-url> flood-safe-routes
cd flood-safe-routes
npm install