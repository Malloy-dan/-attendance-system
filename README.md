# Attendance Management System

QR-code attendance check-in with one-registration-per-device enforcement.
Backend: Django + Django REST Framework + PostgreSQL. Frontend: React + Vite + Tailwind.

## How device-uniqueness works

There's no 100%-bulletproof client-side method, but this stacks several layers:

1. **Fingerprint** (`@fingerprintjs/fingerprintjs`, open source) generates a stable hash from
   the browser/device on every visit. This is sent with every registration attempt.
2. **Server-side hard constraint**: `Registration` has a DB-level unique constraint on
   `(event, device_fingerprint)` — this is what actually blocks a second registration,
   not just a UI check.
3. **`localStorage` flag**: once a device registers successfully, the frontend stores a flag
   so the "already registered" screen shows instantly without a network round-trip.
4. **`/public/check-device/`**: if `localStorage` was cleared, the frontend re-checks the
   fingerprint against the server before showing the form again.

This stops casual multi-registration (the vast majority of real-world abuse) without needing
logins or invasive tracking for attendees. Admins can review the `is_flagged` field on
`Registration` if you want to add manual dispute resolution later.

## Roles

- **Dev** (`role=dev`): full system access — create/close events (each generates its own QR
  code), and create/disable admin & dev accounts. Only devs can reach `/dev`.
- **Admin** (`role=admin`): views and searches registered attendees, exports CSV, prints the
  list. Reaches `/admin`.
- **User**: not a login at all — they scan a QR code, land on `/register/<event-slug>`, and
  submit full name, phone number, student ID, and institutional email. No account created.

## Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # then edit DB credentials, SECRET_KEY, etc.

# Create the Postgres database first, e.g.:
#   createdb attendance_db

python manage.py makemigrations accounts registrations
python manage.py migrate

# Create the first developer account (full access):
python manage.py create_dev --username=dev --email=dev@example.com --password=change-me-now

python manage.py runserver
```

API root: `http://localhost:8000/api/`
Django admin (optional, for raw DB browsing): `http://localhost:8000/admin/`

### Key endpoints

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/login/` | public — returns JWT + role |
| GET | `/api/public/events/<slug>/` | public — check event is open |
| POST | `/api/public/check-device/` | public — fingerprint pre-check |
| POST | `/api/public/register/` | public — submit registration |
| GET/POST | `/api/events/` | admin (read), dev (write) |
| PATCH | `/api/events/<id>/` | dev — e.g. `{"is_active": false}` to close |
| GET | `/api/registrations/?event=&search=` | admin, dev |
| GET | `/api/registrations/export/?event=` | admin, dev — CSV download |
| GET/POST | `/api/accounts/staff/` | dev only — manage admin/dev accounts |

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env    # point VITE_API_BASE_URL at your backend
npm run dev
```

Open `http://localhost:5173`.

- `/login` — staff sign-in, routes to `/admin` or `/dev` by role
- `/dev` — create events (auto-generates a QR code + shareable link), manage staff accounts
- `/admin` — search registrations, export CSV, print the attendee list
- `/register/<event-slug>` — the page the QR code points to (this is what attendees see on
  their phones)

## Printing the list

The admin dashboard's **Print list** button calls the browser's native print dialog with a
print-specific stylesheet (nav/buttons hidden, just the table) — no extra library needed.
"Export CSV" is there too if you want a file for spreadsheets/records instead.

## Notes on deploying

- Set `DEBUG=False`, a real `SECRET_KEY`, and correct `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS`
  in `backend/.env` before going live.
- QR codes are generated pointing at whatever `frontend_base_url` is sent when the event is
  created (the dev dashboard sends `window.location.origin` automatically), so make sure the
  frontend is deployed at a stable URL first.
- Serve `MEDIA_ROOT` (where QR code PNGs live) via your web server or S3/equivalent in production.
