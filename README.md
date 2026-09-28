# School Test Platform

Next.js + MongoDB + custom JWT auth. Three roles with a strict creation
hierarchy: **admin → creates teachers → create students**. Teachers build
MCQ tests, schedule test sessions, assign students, and students take the
test during the session window with auto-grading on submit.

## Setup

```bash
npm install
cp .env.example .env.local
# edit .env.local: set MONGODB_URI (Atlas or local) and a real JWT_SECRET
npm run seed:admin      # creates the first admin account
npm run dev
```

Open http://localhost:3000, log in with the seeded admin
(`admin@school.com` / `admin123` by default, or whatever you set in
`.env.local`), then:

1. **Admin** creates one or more teachers.
2. Log out, **log in as a teacher**, create students, build a test
   (questions + options + which option is correct), then create a test
   session (pick the test, a start/end time window, and which students
   are assigned).
3. Log out, **log in as a student** (in the session's window), take the
   test — a countdown timer auto-submits at the deadline — and view the
   score under "My Results".
4. The teacher can view all submissions/scores for a session under
   "Results".

## How the hierarchy is enforced

Every `User` document has a `createdBy` field.
- `POST /api/users` only lets an **admin** create a **teacher**, or a
  **teacher** create a **student** — the target role is derived from the
  caller's own role server-side, never from client input.
- `GET /api/users` scopes results to `{ role: nextRole, createdBy: currentUserId }`,
  so a teacher only ever sees the students *they* created, and an admin
  only sees the teachers *they* created.

## Security notes for going further

- Passwords are hashed with bcrypt; JWTs are signed with `jose` and
  stored in an httpOnly cookie (not readable from client JS).
- `middleware.js` redirects unauthenticated/wrong-role users away from
  `/admin`, `/teacher`, `/student` before the page even renders — but
  every API route **also** re-checks the role server-side, since
  middleware alone isn't enough for API protection in all edge cases.
- Students never receive `correctOptionIndex` in any API response.
- Submission is blocked outside the session's `[startTime, endTime]`
  window server-side (with a small grace window for client/server clock
  drift), so a student can't attempt a test early or after the deadline
  even by calling the API directly.
- One `Attempt` per `(sessionId, studentId)` is enforced with a unique
  index — resubmission is rejected.

## Where to extend next
- Add pagination/search once teacher/admin lists grow.
- Add a "Class" model if you want to assign whole classes instead of
  picking students one by one.
- Add password reset / invite-by-email instead of admin typing passwords.
- Add negative marking, question shuffling, or per-question timers if
  you outgrow flat MCQ auto-grading.
