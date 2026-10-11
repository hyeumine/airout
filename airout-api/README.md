# AIrOut API

Node.js, Express, Sequelize, and Socket.IO. MySQL is the development database. Tests use SQLite.

```bash
npm install
npm run dev
npm test
npm run typecheck
```

`npm run dev` migrates, then seeds development accounts only when `NODE_ENV` is not production. See the repository `README.md` for Docker, seed passwords, and route docs in `docs/API.md`.

JWT secrets must be set in the environment for production. The server will not start on the development defaults when `NODE_ENV=production`.
