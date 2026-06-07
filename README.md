# B0626 - Ahmad Shehroz Raza - Innovaxel - Backend

A RESTful API for an Event Registration System built with Node.js, Express, Prisma ORM, and SQLite. This backend system is designed to handle high-concurrency event registrations while strictly preventing race conditions and overbooking.

## 🎥 Demo & Explanation Video
**[Click here to watch the 5-minute API explanation and race-condition handling demo]
(https://drive.google.com/file/d/1qYNbdLAAMVpQ6FRhvhKIFPL0XQ6nL63A/view?usp=sharing)**

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express.js
- **ORM**: Prisma v5
- **Database**: SQLite

## Project Structure

```text
B0626-Ahmad-Shehroz-Raza-Innovaxel-Backend/
├── prisma/
│   ├── schema.prisma
│   └── dev.db
├── src/
│   ├── routes/
│   │   ├── eventRoutes.js
│   │   └── registrationRoutes.js
│   ├── db.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── requests.http         # For quick API testing via VS Code REST Client