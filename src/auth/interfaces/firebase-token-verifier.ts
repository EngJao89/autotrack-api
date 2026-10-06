import type { AuthenticatedUser } from './authenticated-user';

export interface FirebaseTokenVerifier {
  verifyIdToken(token: string): Promise<AuthenticatedUser>;
}
