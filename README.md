# SendStone: Mini IoT Rock Wall

SendStone is a miniature interactive climbing wall with a full-stack web app. Pick a route, and the holds light up on the physical board in real time. It supports route creation, difficulty filtering, and progress tracking — plus a machine learning model that predicts a route's grade before anyone has climbed it.

**Team:** Gabriel VanderKlok, Chloe Brandow, Ryan Bales, Uriah Stokes — Grand Canyon University Capstone

---

## Why We Built It

Commercial interactive boards like the Kilter Board start at $8,000, which puts them out of reach for smaller gyms, schools, and home walls. SendStone shows the core technology can be replicated for a fraction of that. A facility that already has a wall and holds could add an interactive LED system for a few hundred dollars instead of several thousand.

---

## Features

- **Route Creation** — Build and save climbing routes by selecting holds on an interactive board
- **Route Viewing** — Browse and filter the full route library by difficulty, font scale, or search
- **LED Visualization** — Selected routes light up on the physical wall in under one second
- **Difficulty Prediction** — A neural network predicts climbing grade (V0–V10+) before a route is climbed
- **Progress Tracking** — Log ascents and track key statistics on your profile
- **Multi-user** — Cloud-hosted database supports simultaneous access from any device on the network

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS, Supabase JS |
| Backend | FastAPI, Python 3.11, Uvicorn |
| Database | Supabase (PostgreSQL) with Row Level Security |
| ML Model | V4 Hybrid CNN + dense branches, ONNX runtime |
| Hardware | Raspberry Pi 4B, 225× WS2811 addressable LEDs |

---

## Running This Project

This is not a plug-and-play open source app — it's a closed capstone system tied to our specific infrastructure. To run it fully you would need:

- **Our Supabase project credentials** — the database, auth config, Row Level Security policies, and 5,500+ routes all live in our private Supabase instance. Without our API keys the backend has nothing to connect to.
- **The physical hardware** — the LED board, Raspberry Pi, and wiring are a one-of-a-kind build. The hardware endpoints only make sense in that context.
- **The Pi itself** — the backend is designed to run on our specific Raspberry Pi on our local network. Hardware control calls (`/hardware/led/*`) target GPIO pins on that machine.

If you want to adapt this for your own build, [TECHNICAL.md](TECHNICAL.md) documents the full architecture, database schema, API contract, LED wiring, and coordinate system — everything you'd need to recreate it from scratch with your own infrastructure.

---

## ML Model Performance

Trained on ~4,400 Kilter Board routes. It reads the route as a grid image through a CNN while a parallel dense branch handles hold types, spacing, and movement dynamics — both branches feed into the final grade prediction.

- **Accuracy within 1 V-grade:** 85.2%
- **Mean Absolute Error:** 0.78
- **R²:** 0.83

---

## Security

- Row Level Security enforced at the Supabase database layer
- Parameterized queries throughout — no raw SQL string interpolation
- JWT Bearer token authentication; tokens verified locally via HMAC-HS256
- All credentials stored in environment variables — no secrets in source code

---

## Documentation

For architecture, API reference, database schema, and hardware wiring details, see [TECHNICAL.md](TECHNICAL.md).
