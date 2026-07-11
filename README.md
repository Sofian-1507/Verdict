# Verdict

Verdict is a real-time, AI-powered fact-checking Chrome Extension. It helps you verify claims on any webpage instantly using Groq's LLaMA 3 models. Simply highlight a claim, right-click, and Verdict will analyze the text, search for facts, and provide a clear verdict with sources and a deviation score.

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
- **Robust Security & Reliability**:
  - API Key Authentication protects the backend endpoints.
  - Zod-powered schema validation and Prompt Injection protections guard against malicious inputs.
  - Automatic retry logic with exponential backoff handles transient network errors.
  - Graceful offline state handling and YouTube SPA navigation support.
- **Smart AI Pipeline**:
  1. *Extraction Stage*: Uses Groq (LLaMA 3.1 8B) to instantly filter out opinions and isolate fact-checkable claims.
  2. *Verification Stage*: Uses Groq (LLaMA 3.3 70B) to perform deep fact-checking, scoring factual deviation, and citing sources.

## Getting Started

### Prerequisites

- Node.js (v20+)
- [pnpm](https://pnpm.io/installation) package manager
- A Groq API Key

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

Edit `apps/api/.env` and add your Groq API Key and set a custom internal API key for the extension to communicate with the backend:

```env
GROQ_API_KEY=your_actual_key_here
API_KEY=your_secret_api_key_here
```

### 3. Configure the Chrome Extension

Create a `.env` file for the extension to inject the API key at build time:

```bash
cd apps/extension
echo "VITE_API_KEY=your_secret_api_key_here" > .env
```

### 4. Start the Backend API

```bash
# Still in apps/api
pnpm dev
```

The API will start at `http://localhost:3001`.

### 5. Build the Chrome Extension

Open a new terminal window and run:

```bash
cd ../../apps/extension
pnpm build
```

This will output the compiled extension into `apps/extension/dist`.

### 6. Load into Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle on **Developer mode** in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the `apps/extension/dist` folder.
5. The Verdict extension will appear in your browser! Pin it to your toolbar to access the popup and settings.

---

*Note: For testing purposes without an API key, you can set `MOCK_MODE=true` in `apps/api/.env` to receive instant, simulated fact-check responses.*

## Testing in the Browser

Follow these steps to manually test the extension's core features.

### Testing YouTube Auto-Scanning
The extension is designed to read YouTube closed captions and automatically fact-check them in the background.

1. Go to [YouTube](https://www.youtube.com).
2. Find a video that contains factual claims (e.g., a news clip, a science documentary, or a political speech).
3. **CRITICAL:** You must turn on **Closed Captions (CC)** in the YouTube video player. The extension works by reading the caption text directly from the screen.
4. Let the video play. As people speak, the extension buffers the text. 
5. When there is a natural pause (about 4 seconds) and at least 30 characters have been spoken, it sends the text to the AI backend. If a fact-checkable claim is found, a dark glassmorphic **Verdict Card** will slide into the bottom right corner of your screen showing the claim, the fact, and a deviation score.

### Testing the Manual Context Menu
You can also manually trigger fact-checks on any text on the page.

1. Highlight a sentence (e.g., a factual claim in a comment or article).
2. **Right-click** the highlighted text.
3. Click the context menu option: **Fact Check with Verdict: "[your text]"**.
4. A loading spinner will appear in the bottom right corner, followed by the Verdict Card with the AI's analysis.

### Verifying History
1. Click the Verdict extension icon (the gavel) in your Chrome toolbar.
2. The popup should open and display a list of "Recent Fact-Checks". Both the automatic YouTube checks and your manual right-click checks should appear here with their respective verdicts.
