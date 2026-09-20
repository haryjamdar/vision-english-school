# Local data server

1. Install Node.js 18+.
2. Open a terminal in this project folder.
3. Run `npm install`.
4. Run `npm run dev` for the website preview.
5. In another terminal run `npm run server` for the local data API on http://127.0.0.1:8787.

Data is stored in `server/data/site-data.json`.

Note: the current React UI still contains its original LocalStorage/Claude-db synchronization logic. The local API is included and ready for integration, but this package does not silently rewrite that application logic.
