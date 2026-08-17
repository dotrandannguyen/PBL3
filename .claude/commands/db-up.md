---
description: Start Postgres + Redis via Docker and sync the Prisma client
---

Bring up the local infrastructure for this project and confirm everything is healthy:

1. From `backend/`, run `docker-compose up -d postgres redis`.
2. Run `docker ps` and confirm both `postgres_db` and `redis_cache` are `Up`.
3. From `backend/`, run `npx prisma generate` so the Prisma client matches `prisma/schema.prisma`.
4. If `backend/.env` is missing, tell the user to copy `backend/.env.example` → `backend/.env` and fill in the required keys (see the "Backend `.env` setup" section of `CLAUDE.md`) before starting the server.
5. Report status concisely — don't run `npm run dev` or migrations unless asked.
