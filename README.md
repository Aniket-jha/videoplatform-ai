# Reel Reports — Web

Next.js 15 + Tailwind 4 frontend for Reel Reports, a document-to-video platform. The backend lives in [videoplatform-aibackend](https://github.com/Aniket-jha/videoplatform-aibackend).

## What's here

- **Landing page** (`/`) with how-it-works, video types, brand kits and pricing.
- **Auth** (`/login`, `/signup`), cookie session handled by the API.
- **Generate Video** (`/app`, `/app/chat/[id]`): a chat studio with three modes:
  - *Direct video*: send a topic or document, get a finished MP4 in the thread.
  - *Script → Video*: pauses for script and storyboard review before rendering.
  - *Chat*: talk it through with the assistant, then generate from the conversation.
  - Three video types: Motion graphics, Cinematic, Avatar based. Settings per chat (format, length, voice with audio previews, captions, brand kit).
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
