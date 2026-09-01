# 🛡️ KIIT KSAC GatePass Pro

A tamper-proof digital tracking and in-time extension system for student movements between hostels and the **KIIT Student Activity Center (KSAC)**. This system replaces manual paper slips with a real-time digital state machine, ensuring verified society attendance and eliminating curfew extension slip tampering.

![Architecture](https://img.shields.io/badge/Architecture-Next.js%2015-black?style=for-the-badge&logo=next.js)
![Database](https://img.shields.io/badge/Database-MongoDB-green?style=for-the-badge&logo=mongodb)
![Design](https://img.shields.io/badge/Design-Tailwind%20CSS-blue?style=for-the-badge&logo=tailwind-css)

## 🚀 Features

- **Role-Based Access Control**: Tailored portals for **Students**, **Hostel Wardens**, and **KSAC Desk Authorities**.
- **24/7 All-Day Pass & In-Time Extensions**: Supports morning workshops, daytime club activities, evening society sessions, and night in-time extensions beyond standard hostel curfew (7:00 PM – 7:30 PM).
- **Tamper-Proof State Machine**: Passes progress through `PENDING` → `APPROVED` → `HOSTEL_EXIT` → `IN_KSAC` → `KSAC_EXIT` → `RETURNED`.
- **Automated Transit & Attendance Metrics**: Tracks transit times between hostel and KSAC, active in-session durations, and maintains daily KSAC society attendance registries.
- **Modern UI**: Polished glassmorphism interface with live status pulses, quick demo accounts, and responsive tables.

## 🛠️ Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **Auth**: Custom JWT with `httpOnly` cookie rotation
- **Styling**: Tailwind CSS

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/campus-gatepass.git
   cd campus-gatepass
   git checkout KSAC
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   REFRESH_SECRET=your_refresh_secret
   ```

4. **Seed the database**:
   ```bash
   npm run seed
   ```
   *Demo Accounts (Password: `password123`):*
   - Student: `student@campus.edu`
   - Warden: `warden@campus.edu`
   - KSAC Authority: `ksac@campus.edu`

5. **Start Dev Server**:
   ```bash
   npm run dev
   ```

## 🧪 Movement Verification Flow

1. **Student**: Submits pass request with chosen KSAC society/wing, purpose, and requested in-time extension (e.g. 09:30 PM).
2. **Warden**: Reviews request and approves departure in the hostel control center.
3. **Hostel Exit**: Warden logs hostel gate exit when student physically leaves.
4. **KSAC Arrival**: KSAC Authority verifies identity and checks student in (`IN_KSAC`), logging the entry in the daily society registry.
5. **KSAC Departure**: KSAC Authority logs session conclusion and student check-out.
6. **Hostel Re-Entry**: Warden confirms student arrival at hostel gate, automatically closing the pass and verifying return within the granted extension window.

---
Built for KIIT Student Activity Center & Campus Security.
