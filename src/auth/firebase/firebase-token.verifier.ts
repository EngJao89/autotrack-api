import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { AUTH_ERROR_CODE } from '../auth.constants';
import { AuthUnauthorizedException } from '../exceptions/auth-unauthorized.exception';
import type { AuthenticatedUser } from '../interfaces/authenticated-user';
import type { FirebaseTokenVerifier } from '../interfaces/firebase-token-verifier';

@Injectable()
export class FirebaseTokenVerifierService implements FirebaseTokenVerifier {
  private app: App | null = null;

  constructor(private readonly configService: ConfigService) {}

  async verifyIdToken(token: string): Promise<AuthenticatedUser> {
    try {
      const decoded = await getAuth(this.getApp()).verifyIdToken(token);

      return {
        userId: decoded.uid,
        email: decoded.email,
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

    this.app = initializeApp({
      credential: cert({
        projectId,
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
