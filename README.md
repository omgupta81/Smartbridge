# Realtime Code Collab (Monaco + Auth)

## Features
- Monaco editor (rich language features) via CDN
- Authentication (register/login) using bcrypt + JWT in HTTP-only cookies
- Real-time collaboration using Socket.IO
- Sessions persisted in MongoDB
- MVC structure: models/controllers/routes/middleware/public

## Quick start
1. 
pm install
2. Copy .env.example -> .env and set MONGO_URI and JWT_SECRET
3. 
pm run dev (or 
pm start)
4. Open http://localhost:3000

## Notes
- Monaco is loaded from CDN for simplicity. For production, bundle or host locally.
- Collaboration is implemented as full-document broadcasts. For robust concurrent editing use CRDT/OT libraries (Yjs, ShareDB).
- Set secure: true on cookies in production (HTTPS).
- For scaling, add Redis adapter to Socket.IO.
