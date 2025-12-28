# X Clone

A full-stack clone of X (formerly Twitter) built with the [T3 Stack](https://create.t3.gg/). This project demonstrates a modern web application architecture using Next.js, tRPC, Prisma, and Tailwind CSS.

## Features

- **Authentication**: Secure login via Discord, Google, or Credentials using NextAuth.js.
- **Posting**: Create text-based posts, reply to others, and repost content.
- **Real-time Chat**: Private messaging with typing indicators, online presence, read receipts, and media support powered by Ably.
- **Interactions**: Like posts and follow other users.
- **Notifications**: Real-time-like notifications for likes, replies, mentions, and follows.
- **Profiles**: Customizable user profiles with bio, location, and website.
- **Image Upload**: Support for user avatars, header images, and chat media using Vercel Blob.
- **Responsive Design**: Mobile-friendly UI built with Tailwind CSS.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Database**: [PostgreSQL](https://www.postgresql.org)
- **ORM**: [Prisma](https://www.prisma.io)
- **API**: [tRPC](https://trpc.io)
- **Authentication**: [NextAuth.js](https://next-auth.js.org)
- **Real-time**: [Ably](https://ably.com)
- **Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm / yarn / pnpm
- Docker (optional, for local database)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/x-clone.git
   cd x-clone
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory based on `.env.example` (if available) or use the following template:

   ```env
   # Database
   DATABASE_URL="postgresql://postgres:password@localhost:5432/x-clone"

   # Next Auth
   AUTH_SECRET="your-super-secret-auth-secret"
   AUTH_URL="http://localhost:3000"

   # OAuth Providers (Optional for local dev if using credentials)
   AUTH_DISCORD_ID=""
   AUTH_DISCORD_SECRET=""
   AUTH_GOOGLE_ID=""
   AUTH_GOOGLE_SECRET=""

   # Admin/Dev Credentials
   AUTH_CREDENTIALS_EMAIL="admin@example.com"
   AUTH_CREDENTIALS_PASSWORD="password"
   AUTH_CREDENTIALS_NAME="Admin"

   # Real-time Chat (Ably)
   ABLY_API_KEY="your-ably-api-key"

   # File Storage (Vercel Blob)
   BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
   ```

### Database Setup

You can start a local PostgreSQL instance using the provided script (requires Docker):

```bash
./start-database.sh
```

Once the database is running, push the schema:

```bash
npm run db:push
```

### Running the App

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint.
- `npm run typecheck`: Runs TypeScript type checking.
- `npm run db:studio`: Opens Prisma Studio to view/edit database records.
- `npm run db:generate`: Generates the Prisma Client.

## License

This project is open source and available under the [MIT License](LICENSE).
