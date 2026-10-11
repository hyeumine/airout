# AIrOut HTTP API

Base URL in development: `http://localhost:4000`

Successful responses:

```json
{ "ok": true, "data": {}, "meta": { "page": 1, "pageSize": 20, "total": 0 } }
```

`meta` is omitted when there is nothing to page. Failures:

```json
{ "ok": false, "error": { "code": "VALIDATION", "message": "Please check the form and try again.", "details": [] } }
```

Send `Authorization: Bearer <accessToken>` for protected routes. Access tokens last about 15 minutes. Refresh tokens rotate: using an old refresh token after a newer one was issued revokes the session family.

Logs record method, path, status, duration, and user id. They do not record query strings or bodies, so journal search text and message content are not written to the log line.

## Routes

| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/health` | public |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/refresh` | public, refresh token |
| POST | `/api/auth/logout` | refresh token |
| POST | `/api/auth/logout-all` | signed in |
| POST | `/api/auth/forgot-password` | public |
| POST | `/api/auth/reset-password` | public, reset token |
| POST | `/api/auth/verify-email` | public, verify token |
| POST | `/api/auth/resend-verification` | signed in |
| POST | `/api/auth/password` | signed in |
| DELETE | `/api/auth/account` | signed in, password |
| GET | `/api/auth/sessions` | signed in |
| DELETE | `/api/auth/sessions/:id` | signed in |
| GET | `/api/auth/me` | signed in |
| GET/PATCH | `/api/users/me` | signed in |
| GET/PATCH | `/api/users/me/preferences` | signed in |
| GET/PATCH | `/api/settings` | signed in |
| POST | `/api/users/me/guidelines` | signed in |
| GET/POST | `/api/users/blocks` | signed in |
| DELETE | `/api/users/blocks/:id` | signed in |
| GET/POST | `/api/ai/conversations` | owner |
| GET/PATCH/DELETE | `/api/ai/conversations/:id` | owner |
| POST | `/api/ai/conversations/:id/messages` | owner |
| DELETE | `/api/ai/conversations/:id/messages` | owner |
| GET/POST | `/api/moods` | owner |
| GET | `/api/moods/summary` | owner |
| DELETE | `/api/moods/:id` | owner |
| GET/POST | `/api/journal` | owner |
| GET/PATCH/DELETE | `/api/journal/:id` | owner |
| GET/POST | `/api/community/posts` | signed in; posting needs a verified email and accepted guidelines |
| GET/DELETE | `/api/community/posts/:id` | signed in; delete is owner only |
| POST | `/api/community/posts/:id/comments` | signed in |
| DELETE | `/api/community/comments/:id` | owner |
| POST | `/api/community/posts/:id/reactions` | signed in |
| POST/DELETE | `/api/community/posts/:id/save` | signed in |
| GET | `/api/community/circles` | signed in |
| POST/DELETE | `/api/community/circles/:id/join` | signed in |
| POST | `/api/reports` | signed in |
| POST | `/api/appeals` | signed in |
| GET | `/api/moderation/reports` | moderator or admin |
| POST | `/api/moderation/reports/:id/resolve` | moderator or admin |
| GET | `/api/moderation/appeals` | moderator or admin |
| POST | `/api/moderation/appeals/:id/resolve` | moderator or admin |
| GET | `/api/moderation/audit` | moderator or admin |
| GET | `/api/admin/summary` | moderator or admin |
| PATCH | `/api/admin/circles/:id` | admin |
| GET | `/api/notifications` | signed in |
| POST | `/api/notifications/read` | signed in |

Community list query: `category`, `circleId`, `q`, `mine=true`, `saved=true`, `page`, `pageSize`. Order is newest first. Reaction counts are not a sort key.

Public post objects include a nickname or `Anonymous`. They do not include email or the author’s internal id. Moderators see excerpts in the report queue, not a dump of journals or chats.

Socket.IO connects with `{ auth: { token } }` and joins `feed`. Events are `{ kind: "post" | "comment" }` without post text.

Saved conversations require `consentToSave: true` unless `temporary: true`. Temporary conversations expire after 24 hours. Crisis messages are answered by the safety layer and are not forwarded to a remote model.
