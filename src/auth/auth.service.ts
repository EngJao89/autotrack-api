import { Injectable } from '@nestjs/common';
import { AuthUserResponseDto } from './dto/auth-user.dto';
import type { AuthenticatedUser } from './interfaces/authenticated-user';

@Injectable()
export class AuthService {
  getProfile(user: AuthenticatedUser): AuthUserResponseDto {
    return {
      userId: user.userId,
      email: user.email,
    };
  }
}
