# 🚌 BusSetu: KMT Live Bus Tracking System

BusSetu is a high-fidelity, real-time public transit tracking platform designed specifically for the Kolhapur Municipal Transport (KMT). It leverages modern web technologies to provide commuters with precise live locations, accurate ETAs, and a seamless transit experience.

![Project Preview](https://img.shields.io/badge/Project-Live_Bus_Tracking-blue?style=for-the-badge&logo=bus)
![Tech Stack](https://img.shields.io/badge/Tech-React_%7C_Node.js_%7C_PostgreSQL-green?style=for-the-badge)

---

## 🌟 Key Features

### 👨‍👩‍👧‍👦 Citizen Interface
- **Live Map View**: Real-time visualization of bus movements on the route.
- **Trip Progress Timeline**: An "Uber-like" vertical progress bar showing passed and upcoming stops.
- **Dynamic ETA**: Accurate arrival predictions calculated using the **Haversine Formula**.
- **No Login Required**: Instant access for citizens to check bus timings.

### 🚛 Driver Dashboard
- **Live GPS Broadcasting**: One-tap trip start to begin broadcasting location via **WebSockets (Socket.io)**.
- **Telemetry Display**: Real-time speed and coordinate tracking.
- **Simple Controls**: Easy "Start Trip" and "End Trip" interface.

### 🛡️ Admin Suite
- **Fleet Management**: Add and manage bus units.
- **Route Intelligence**: Define routes with sequential geo-mapped stops.
- **Account Control**: Manage driver credentials and assignments.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Real-time** | Socket.io (WebSockets) |
| **Database** | PostgreSQL |
| **Calculations** | Haversine Algorithm (Geospatial distance) |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [PostgreSQL](https://www.postgresql.org/) (Running on your local machine)

### 1. Database Setup
1. Create a new database in PostgreSQL named `kmt_bus`.
2. Run the SQL commands found in `backend/schema.sql` to set up the tables and seed initial users.
   - **Default Admin**: `admin@bussetu.com` / `admin123`
   - **Default Driver**: `driver@bussetu.com` / `driver123`

### 2. Backend Configuration
1. Navigate to the `backend` folder.
2. Create a `.env` file (or update the existing one):
   ```env
   PORT=5000
   DB_USER=your_postgres_user
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=kmt_bus
   JWT_SECRET=your_secret_key
   ```
3. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

### 3. Frontend Configuration
1. Navigate to the `frontend` folder.
2. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```text
MiniProject_1/
├── backend/            # Express API & Socket.io Server
├── frontend/           # React Frontend (Vite)
├── BusSetu/            # Android Mobile Application (Gradle)
├── documentation/      # SRS and Research Papers
└── schema.sql          # Database schema definitions
```

## 📜 Documentation
- **SRS**: Found in `SRS.pdf`
- **Research Paper**: Found in the `documentation/` section (formatted for IEEE).

---

## 🤝 Contributors
- **1st Author** - implementation & Design
- **Collaborators** - Quality Assurance & Data Mapping

---
*© 2026 BusSetu · Real-Time Transit Intelligence*
