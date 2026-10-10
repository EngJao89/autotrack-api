import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthUserResponseDto } from './dto/auth-user.dto';
import { BootstrapResponseDto } from './dto/bootstrap-response.dto';
import type { AuthenticatedUser } from './interfaces/authenticated-user';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async getProfile(user: AuthenticatedUser): Promise<AuthUserResponseDto> {
    const local = await this.usersService.findByFirebaseUid(user.firebaseUid);

    return {
      userId: user.firebaseUid,
      firebaseUid: user.firebaseUid,
      email: user.email,
      emailVerified: user.emailVerified,
      localUserId: local?.id ?? null,
    };
  }

  async bootstrap(user: AuthenticatedUser): Promise<BootstrapResponseDto> {
    return this.usersService.bootstrapFromFirebase({
      firebaseUid: user.firebaseUid,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
    });
  }
}
