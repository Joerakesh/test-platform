# School Test Platform

A role-based school assessment application built with **Next.js, React, MongoDB and custom JWT authentication**. It supports a teacher-led workflow for creating MCQ tests, scheduling test sessions, assigning students and reviewing automatically graded submissions.

## Roles and workflow

The application uses a simple creation hierarchy:

- **Admin:** creates and manages teachers.
- **Teacher:** creates students, prepares tests, schedules sessions and reviews results.
- **Student:** enters an assigned test during its permitted session window and views the resulting score.

Typical workflow:

1. The admin creates teacher accounts.
2. A teacher creates student accounts.
3. The teacher builds an MCQ test and schedules a session.
4. Students assigned to the session attempt the test within the allowed time window.
5. The platform grades the submission and makes results available to the relevant teacher and student.

## Key implementation details

- Server-side role checks derive permitted actions from the authenticated user.
- User records include a `createdBy` relationship to scope teacher/student management.
- Passwords are hashed with bcrypt.
- JWT authentication uses `jose` and an httpOnly cookie.
- API routes re-check authorization rather than relying only on page middleware.
- Correct answer information is excluded from student-facing API responses.
- Session time windows are enforced server-side.
- A unique index prevents more than one attempt for the same student and session.

## Technology

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 |
| UI | React 18 |
| Database | MongoDB, Mongoose |
| Authentication | jose, bcryptjs |
| Data import | PapaParse |
| Language | JavaScript / TypeScript dependencies |

## Requirements

- Node.js
- npm
- MongoDB Atlas or a local MongoDB instance

## Setup

```bash
git clone https://github.com/Joerakesh/test-platform.git
cd test-platform
npm install
```

Create `.env.local` from the example file:

```bash
# macOS / Linux
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

Set at least the MongoDB connection string and a strong JWT secret. Use the exact environment variable names expected by the application.

Seed the first admin account and start the development server:

```bash
npm run seed:admin
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The seed script may create a development-only default account. Change its credentials immediately and never reuse development credentials in a deployed environment.

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run seed:admin
npm run seed:demo
```

## Security and exam integrity

Before using the platform for high-stakes examinations, test authorization boundaries, session timing, duplicate submissions, answer-key exposure, password reset, auditability and recovery from network interruptions. A client-side timer is only a user-interface aid; the server must remain authoritative.

## Next improvements

- Automated tests for role boundaries and exam lifecycle.
- Pagination and search for large student and teacher lists.
- Invite and password-reset flows.
- Question randomisation and configurable grading.
- Audit logs and exportable reports.
- Accessibility and responsive exam-taking improvements.

## License

No license is specified. Contact the repository owner before reuse or redistribution.
