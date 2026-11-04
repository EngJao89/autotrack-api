import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { AUTH_ERROR_CODE } from '../auth.constants';
import { AuthUnauthorizedException } from '../exceptions/auth-unauthorized.exception';
import type { AuthenticatedUser } from '../interfaces/authenticated-user';
import type { FirebaseTokenVerifier } from '../interfaces/firebase-token-verifier';

/**
 * Extracts the Firebase project id embedded in a service-account email:
 * `…@<project-id>.iam.gserviceaccount.com`
 */
export function projectIdFromServiceAccountEmail(
  clientEmail: string,
): string | null {
  const match = clientEmail
    .trim()
    .match(/@([a-z0-9-]+)\.iam\.gserviceaccount\.com$/i);
  return match?.[1] ?? null;
}

/**
 * Fail fast when Admin SDK project id cannot verify mobile ID tokens.
 * A mismatched FIREBASE_PROJECT_ID surfaces to clients as AUTH_TOKEN_INVALID
 * ("Authentication token is invalid or expired") on every authenticated call.
 */
export function assertFirebaseAdminProjectConfig(
  projectId: string,
  clientEmail: string,
): void {
  const normalized = projectId.trim();
  if (!normalized) {
    throw new Error('FIREBASE_PROJECT_ID is empty.');
  }

  if (/^\d+$/.test(normalized)) {
    throw new Error(
      `FIREBASE_PROJECT_ID looks numeric ("${normalized}"). Use the Firebase project id string ` +
        `(e.g. autotrack-api-35b3f), not a Google client id / project number. ` +
        `Mismatched values make every Bearer ID token fail with AUTH_TOKEN_INVALID.`,
    );
  }

  const fromEmail = projectIdFromServiceAccountEmail(clientEmail);
  if (fromEmail && fromEmail !== normalized) {
    throw new Error(
      `FIREBASE_PROJECT_ID ("${normalized}") does not match the project in FIREBASE_CLIENT_EMAIL ` +
        `("${fromEmail}"). Align both with the mobile EXPO_PUBLIC_FIREBASE_PROJECT_ID or every ` +
        `login will fail with AUTH_TOKEN_INVALID.`,
    );
  }
}

@Injectable()
export class FirebaseTokenVerifierService implements FirebaseTokenVerifier {
  private app: App | null = null;

  constructor(private readonly configService: ConfigService) {}

  async verifyIdToken(token: string): Promise<AuthenticatedUser> {
    // Resolve Admin app first so misconfigured FIREBASE_* fails loudly instead of
    // being masked as AUTH_TOKEN_INVALID on every Bearer request.
    const auth = getAuth(this.getApp());

    try {
      const decoded = await auth.verifyIdToken(token);
      const name =
        typeof decoded.name === 'string' ? decoded.name : undefined;

      return {
        userId: decoded.uid,
        firebaseUid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified === true,
        name,
        claims: { ...decoded },
      };
    } catch {
      throw new AuthUnauthorizedException(
        AUTH_ERROR_CODE.TOKEN_INVALID,
        'Authentication token is invalid or expired',
      );
    }
  }

  private getApp(): App {
    if (this.app) {
      return this.app;
    }

    const existing = getApps()[0];
    if (existing) {
      this.app = existing;
      return existing;
    }

    const projectId = this.configService.getOrThrow<string>(
      'FIREBASE_PROJECT_ID',
    );
    const clientEmail = this.configService.getOrThrow<string>(
      'FIREBASE_CLIENT_EMAIL',
    );
    const privateKey = this.normalizePrivateKey(
      this.configService.getOrThrow<string>('FIREBASE_PRIVATE_KEY'),
    );

    assertFirebaseAdminProjectConfig(projectId, clientEmail);

    this.app = initializeApp({
      credential: cert({
        projectId: projectId.trim(),
        clientEmail,
        privateKey,
      }),
    });

    return this.app;
  }

  private normalizePrivateKey(value: string): string {
    return value.replace(/\\n/g, '\n');
  }
}
