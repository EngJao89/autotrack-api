export interface AuthenticatedUser {
  userId: string;
  email?: string;
  claims: Record<string, unknown>;
}
