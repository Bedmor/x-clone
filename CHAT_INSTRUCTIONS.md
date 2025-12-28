# Chat Feature Setup

The chat feature uses a separate WebSocket server for real-time messaging.

## Prerequisites

1.  Ensure dependencies are installed:

    ```bash
    npm install
    ```

2.  Ensure the database schema is updated:
    ```bash
    npx prisma db push
    npx prisma generate
    ```

## Running the WebSocket Server

To run the WebSocket server locally:

```bash
npm run start:ws
```

This will start the server on port 3001 (or `WS_PORT` env var).

## Deployment

To deploy the WebSocket server separately from Vercel:

1.  Copy the project (or just `ws-server.ts`, `package.json`, `prisma/`, `.env`, and `generated/`) to your server (e.g., VPS, DigitalOcean, Heroku).
2.  Install dependencies: `npm install`.
3.  Generate Prisma client: `npx prisma generate`.
4.  Run the server: `npm run start:ws` (or use PM2: `pm2 start ws-server.ts --interpreter ./node_modules/.bin/tsx`).
5.  Set `NEXT_PUBLIC_WS_URL` in your frontend environment variables to point to your WebSocket server URL (e.g., `wss://your-ws-server.com`).

## Environment Variables

- `WS_PORT`: Port for the WebSocket server (default: 3001).
- `NEXT_PUBLIC_WS_URL`: URL of the WebSocket server for the frontend to connect to.
