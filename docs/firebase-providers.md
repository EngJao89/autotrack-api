# Firebase Authentication providers (ATP-30 / ATP-31)

## Providers in scope (MVP)

| Provider | Firebase Console | Client |
|---|---|---|
| Google | Authentication → Sign-in method → Google → Enable | Expo app |
| Email/password | Authentication → Sign-in method → Email/Password → Enable | Expo app |

Other social providers are out of scope for this task.

## Console checklist

1. Open the Firebase project used by AutoTrack.
2. Enable **Google** and **Email/Password** under Authentication → Sign-in method.
3. Review authorized domains for the Expo / web debug hosts you use.
4. Create a service account for the Admin SDK (API only). Store credentials in env vars — never commit them.

## API configuration (Admin SDK only)

Variables (see `.env.example`):

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

The NestJS API validates `Authorization: Bearer <firebase-id-token>` with `firebase-admin`.
It does **not** store passwords, hashes, ID tokens or refresh tokens.

## Identity link

1. Client signs in with Google or email/password → obtains Firebase ID Token.
2. Client calls `POST /v1/auth/bootstrap` with the Bearer token.
3. API verifies the token, extracts `firebaseUid` / `email` / `email_verified` / `name`.
4. Local `User.firebaseUid` is created or synchronized (unique).

Password recovery and password change remain entirely in Firebase (client SDK).
