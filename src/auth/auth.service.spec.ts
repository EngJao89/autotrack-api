import { AuthService } from './auth.service';
import type { UsersService } from '../users/users.service';

describe('AuthService', () => {
  const usersService = {
    findByFirebaseUid: jest.fn(),
    bootstrapFromFirebase: jest.fn(),
  };

  const service = new AuthService(usersService as unknown as UsersService);

  beforeEach(() => {
    usersService.findByFirebaseUid.mockReset();
    usersService.bootstrapFromFirebase.mockReset();
  });

  it('returns the authenticated profile without secrets', async () => {
    usersService.findByFirebaseUid.mockResolvedValue({ id: 'local_1' });

    const profile = await service.getProfile({
      userId: 'firebase-uid',
      firebaseUid: 'firebase-uid',
      email: 'user@example.com',
      emailVerified: true,
      claims: {
        uid: 'firebase-uid',
        email: 'user@example.com',
        token: 'should-not-leak',
      },
    });

    expect(profile).toEqual({
      userId: 'firebase-uid',
      firebaseUid: 'firebase-uid',
      email: 'user@example.com',
      emailVerified: true,
      localUserId: 'local_1',
    });
    expect(profile).not.toHaveProperty('claims');
    expect(profile).not.toHaveProperty('token');
  });

  it('returns null localUserId when profile is not bootstrapped', async () => {
    usersService.findByFirebaseUid.mockResolvedValue(null);

    const profile = await service.getProfile({
      userId: 'firebase-uid',
      firebaseUid: 'firebase-uid',
      email: 'user@example.com',
      emailVerified: false,
      claims: { uid: 'firebase-uid' },
    });

    expect(profile.localUserId).toBeNull();
  });

  it('bootstraps via UsersService using token claims only', async () => {
    usersService.bootstrapFromFirebase.mockResolvedValue({
      created: true,
      user: {
        id: 'local_1',
        firebaseUid: 'firebase-uid',
        email: 'user@example.com',
        name: 'Ada',
        cnh: null,
        document: null,
        documentType: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const result = await service.bootstrap({
      userId: 'firebase-uid',
      firebaseUid: 'firebase-uid',
      email: 'user@example.com',
      emailVerified: true,
      name: 'Ada',
      claims: { uid: 'firebase-uid' },
    });

    expect(usersService.bootstrapFromFirebase).toHaveBeenCalledWith({
      firebaseUid: 'firebase-uid',
      email: 'user@example.com',
      emailVerified: true,
      name: 'Ada',
    });
    expect(result.created).toBe(true);
    expect(result.user.firebaseUid).toBe('firebase-uid');
  });
});
