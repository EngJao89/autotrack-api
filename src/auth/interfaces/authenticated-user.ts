/**
 * Minimum reliable claims extracted from a verified Firebase ID Token.
 * `firebaseUid` is the stable external identity — never trust email alone.
 */
export interface AuthenticatedUser {
  /** Firebase UID (stable external identity). Alias kept for ATP-21 clients. */
  userId: string;
  /** Firebase UID — primary identity for local profile linkage. */
  firebaseUid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  claims: Record<string, unknown>;
}
