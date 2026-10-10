import { Module, forwardRef } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FIREBASE_TOKEN_VERIFIER } from './auth.constants';
import { FirebaseTokenVerifierService } from './firebase/firebase-token.verifier';
import { AuthGuard } from './guards/auth.guard';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    FirebaseTokenVerifierService,
    {
      provide: FIREBASE_TOKEN_VERIFIER,
      useExisting: FirebaseTokenVerifierService,
    },
  ],
  exports: [AuthGuard, FIREBASE_TOKEN_VERIFIER, AuthService],
})
export class AuthModule {}
