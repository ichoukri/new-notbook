# new-notbook

Frontend for the data platform notebook and ingestion workspace.

## What It Connects To

- Backend API: `VITE_BACKEND_URL`, default `http://localhost:8000/api/v1`
- Auth frontend: `VITE_AUTH_FRONTEND_URL`, default `http://localhost:8085`
- Upload limit: `VITE_MAX_UPLOAD_MB`, default `1024`
- React scan: `VITE_ENABLE_REACT_SCAN=true` enables `react-scan` in development only

## Scripts

```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm run build
```

The app runs on `0.0.0.0:5000` by default.

## Notes

Dashboard, Activity, Documents, and Chunk Explorer are backed by the platform API. The remaining `src/data/mock.ts` file is kept only as legacy sample data and should not be imported by production pages.
