Frontend for the FastAPI Blogging App

Quick start

1. Start the backend (from project root):

   pip install -r requirements.txt
   uvicorn main:app --reload

2. IMPORTANT: Enable CORS on the backend so this frontend can call it from the browser. In `main.py` add:

   from fastapi.middleware.cors import CORSMiddleware
   app.add_middleware(
     CORSMiddleware,
     allow_origins=["http://localhost:5500","http://127.0.0.1:5500","http://localhost:8000"],
     allow_credentials=True,
     allow_methods=["*"],
     allow_headers=["*"],
   )

3. Serve the `frontend/` folder (or just open `index.html` in the browser). For a simple server, run from the frontend folder:

   python -m http.server 5500

4. Open http://localhost:5500 in your browser.

Notes
- The frontend uses the `/login`, `/post` and `/blog_user` endpoints and sends an OAuth2 token in the `Authorization` header.
- When creating a blog the frontend sends `id`, `title`, `content`, `created_at`, and `updated_at` because the current backend expects those fields. Adjust the backend/schemas for a more typical create flow.
- If you want, I can add a small script to automatically enable CORS in `main.py` for you.
 - The frontend now also supports these endpoints:
    - `POST /create_user` — create a user (use the Create User form).
    - `GET /blog_by_id/{id}` — fetch a single blog by id.
    - `GET /title/{title}` — search blogs by title fragment.
    - `PATCH /update/{id}` — update a blog (use Update button on a blog to prefill the form).
    - `DELETE /delete/{id}` — soft-delete a blog.
    - `PATCH /undo/{id}` — undo a soft-delete.

Notes
- For `update`, `delete`, and `undo` the frontend includes the OAuth2 token in the `Authorization` header — make sure you're logged in.
- If any endpoint returns an error, check the backend logs. I can also patch minor backend issues (e.g. missing leading slash on routes) if you want.

Auth page
- You can use the new auth page at [frontend/auth.html](frontend/auth.html). It provides two options: Sign Up and Login. Sign Up will create the user (and auto-login), and Login will obtain a bearer token and redirect to the main app page.
