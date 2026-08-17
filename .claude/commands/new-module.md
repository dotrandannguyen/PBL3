---
description: Scaffold a new backend module (router → controller → service → repository)
argument-hint: <moduleName>
---

Scaffold a new backend module named `$ARGUMENTS` under `backend/src/modules/$ARGUMENTS/`, following this repo's Clean Architecture convention exactly as used in `backend/src/modules/tasks/` (the canonical, most complete example) and `backend/src/modules/workspaces/` (a simpler example):

1. **`$ARGUMENTS.repository.js`** — all Prisma queries, no business logic. Import the shared client: `import prisma from '../../config/database.js';`. Export plain named functions (see `workspace.repository.js` for the plain-function style, or `task.repository.js` for the object-export style — match whichever style fits how large this module will get).

2. **`$ARGUMENTS.service.js`** — business logic only, calls the repository, throws typed exceptions from `../../common/exceptions/index.js` (`NotFoundException`, `ClientException`, `ForbiddenException`, etc.) instead of generic `Error`. Never touches `req`/`res`.

3. **`$ARGUMENTS.controller.js`** — thin HTTP layer. Extract `req.user.id`, `req.params`, `req.body`, `req.query`; call the service; respond via `new HttpResponse(res).success(data)` / `.created(data)` from `../../common/dtos/index.js`; always `catch (error) { next(error); }` — never swallow errors or format them manually.

4. **`$ARGUMENTS.router.js`** — `express.Router()`, apply `authGuard` (from `../../common/middleware/auth.middleware.js`) unless the module has public routes, wire up `validateRequestMiddleware` with a Zod schema for any route that takes body/query/params input, then map routes to controller methods.

5. Register the router in `backend/src/app.js` under `/v1/api/$ARGUMENTS`, following the existing route registration block.

Ask the user what endpoints/fields the module needs before writing the Prisma schema model (if one doesn't already exist) — don't guess at data shape. If a `prisma/schema.prisma` model is needed, add it and remind the user to run `npx prisma migrate dev --name add_$ARGUMENTS` (don't run migrations yourself without confirmation, since they mutate the dev database).
