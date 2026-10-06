import { AuthService } from './auth.service';

describe('AuthService', () => {
  const service = new AuthService();

  it('returns the authenticated profile without secrets', () => {
    const profile = service.getProfile({
      userId: 'firebase-uid',
      email: 'user@example.com',
      claims: {
        uid: 'firebase-uid',
        email: 'user@example.com',
        token: 'should-not-leak',
      },
    });

    expect(profile).toEqual({
      userId: 'firebase-uid',
      email: 'user@example.com',
    });
    expect(profile).not.toHaveProperty('claims');
    expect(profile).not.toHaveProperty('token');
  });
});
