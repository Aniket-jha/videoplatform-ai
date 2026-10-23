# Reel Reports — Web

Next.js 15 + Tailwind 4 frontend for Reel Reports, a document-to-video platform. The backend lives in [videoplatform-aibackend](https://github.com/Aniket-jha/videoplatform-aibackend).

## What's here

- **Landing page** (`/`) with how-it-works, video types, brand kits and pricing.
- **Auth** (`/login`, `/signup`), cookie session handled by the API.
- **Three ways to make a video**, each its own page in the sidebar:
  - **Direct Video** (`/app/direct`): send a topic or document, get a finished MP4 on the page.
  - **DIY Video** (`/app/diy`): pauses for script and storyboard review before anything renders.
  - **Chat** (`/app/chat`, `/app/chat/[id]`): talk it through with the assistant, then generate from the conversation. Conversations are listed under Chats history.
  - Three video types on every page: Motion graphics, Cinematic, Avatar based. Settings: format, length, voice (with audio previews), captions, brand kit.
- **Project review** (`/app/projects/[id]`): pipeline progress, script editor, storyboard editor with scene previews, final player.
- **My Media** (`/app/media`), **Brand Kits** (`/app/brand`), **Plan & Credits** (`/app/billing`), **Integrations** (`/app/settings`).

## Run locally

Start the backend first (port 4000), then:

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. Requests to `/api/*` and `/storage/*` are proxied to the backend (see `next.config.ts`), so auth cookies stay first-party. Point it at another backend with `API_URL`:

```bash
API_URL=https://api.example.com npm run dev
```
