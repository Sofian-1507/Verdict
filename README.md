# Verdict

Verdict is a real-time, AI-powered fact-checking Chrome Extension. It helps you verify claims on any webpage instantly using Google's Gemini models. Simply highlight a claim, right-click, and Verdict will analyze the text, search for facts, and provide a clear verdict with sources and a deviation score.

## Architecture

Verdict is structured as a **Turborepo** monorepo using **pnpm workspaces**.

```text
verdict-monorepo/
├── apps/
│   ├── api/                 # Node.js + Express backend powering the AI extraction and verification
│   └── extension/           # Manifest V3 Chrome Extension (React + Vite)
└── packages/
    └── shared-types/        # Shared TypeScript interfaces to keep the frontend and backend in sync
```

## Features

- **Context Menu Integration**: Highlight text on any page and click "Fact Check with Verdict"
- **Isolated UI Overlay**: Fact-check results appear in a beautiful, non-intrusive, auto-dismissing floating card. Powered by an isolated Shadow DOM to ensure host page CSS doesn't leak.
- **Chrome Extension Options**: Customize dark/light themes, automatic claim detection (coming soon), and confidence thresholds.
- **Smart AI Pipeline**:
  1. *Extraction Stage*: Uses Gemini Flash-Lite to instantly filter out opinions and isolate fact-checkable claims.
  2. *Verification Stage*: Uses Gemini Flash to perform deep fact-checking, scoring factual deviation, and citing sources.

## Getting Started

### Prerequisites

- Node.js (v20+)
- [pnpm](https://pnpm.io/installation) package manager
- A Google Gemini API Key

### 1. Install Dependencies

From the root of the repository, run:

```bash
pnpm install
```

### 2. Configure the Backend API

Create a `.env` file for the API:

```bash
cd apps/api
cp .env.example .env
```

Edit `apps/api/.env` and add your Gemini API Key:

```env
GEMINI_API_KEY=your_actual_key_here
```

### 3. Start the Backend API

```bash
# Still in apps/api
pnpm dev
```

The API will start at `http://localhost:3001`.

### 4. Build the Chrome Extension

Open a new terminal window and run:

```bash
cd apps/extension
pnpm build
```

This will output the compiled extension into `apps/extension/dist`.

### 5. Load into Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle on **Developer mode** in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the `apps/extension/dist` folder.
5. The Verdict extension will appear in your browser! Pin it to your toolbar to access the popup and settings.

---

*Note: For testing purposes without an API key, you can set `MOCK_MODE=true` in `apps/api/.env` to receive instant, simulated fact-check responses.*
