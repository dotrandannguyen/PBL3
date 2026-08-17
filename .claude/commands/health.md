---
description: Check that the local dev stack (backend, Postgres, Redis) is up and responding
---

Check the health of the local dev environment and report a short status list:

1. `curl http://localhost:3000/health` — expect `{ "status": "OK" }`. If it fails to connect, say the backend (`cd backend && npm run dev`) is not running — don't try to start it yourself unless asked.
2. `docker ps` — check whether `postgres_db` and `redis_cache` containers are `Up`. If not, mention `/db-up`.
3. Do not attempt to start the frontend dev server or modify any files — this command only reports status.
