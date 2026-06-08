# Athletic Labs Frontend Production Runbook

Production target:

- App URL: `https://panel.athleticlabs.com.tr`
- API URL: `https://api.athleticlabs.com.tr/api`
- Hosting: Vercel

## Required Vercel Environment Variables

Set these in the Vercel project before the first deploy:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.athleticlabs.com.tr/api
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=athletic-labs-97470.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=athletic-labs-97470
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=athletic-labs-97470.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Deployment Rules

1. Production deploys from `main`.
2. Use Vercel preview deployments for feature branches.
3. Backend production CORS must include `https://panel.athleticlabs.com.tr`.
4. Any frontend change that touches test entry, login, QR scanning, report generation, or scouting must be tablet-tested before merge.

## Tablet Smoke Test

Run this checklist after each production deploy:

1. Open `https://panel.athleticlabs.com.tr` on tablet Safari/Chrome.
2. Login with a real test user.
3. Create or open a test session.
4. Import/add athletes.
5. Enter measurements for at least two athletes.
6. Refresh the page and verify saved values remain.
7. Test camera/QR permission on tablet.
8. Generate a report.
9. Open the same session on a second device and verify concurrent edits persist.
10. Repeat one save using cellular/hotspot.

## Rollback

Use Vercel's previous deployment rollback if a production deploy breaks the field workflow.
