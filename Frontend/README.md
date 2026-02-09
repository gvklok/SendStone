# SendStone Frontend — React + Tailwind CSS

## Prerequisites

- Node.js 18+
- npm
- Backend running at `http://127.0.0.1:8000` (see `Backend/README.md`)

## Setup

1. **Install dependencies**

   ```bash
   cd SendStone/Frontend
   npm install
   ```

## Run the App

```bash
npm start
```

Opens at **http://localhost:3000** in your browser. Hot-reloads on save.

## Key Pages

| Tab | Description |
|-----|-------------|
| **Explore** | Browse and search all posted routes (infinite scroll) |
| **Create** | Build a route by clicking holds on the interactive board |
| **Saved** | View your saved / ascended routes (localStorage) |
| **Profile** | User info placeholder |

## Tech Stack

- **React 19** — UI framework
- **Tailwind CSS** — utility-first styling
- **lucide-react** — icons (Mountain, Bookmark, Lightbulb, etc.)
- **Create React App** — build tooling
