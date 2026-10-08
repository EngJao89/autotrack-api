import { Module } from '@nestjs/common';
import { UserContextGuard } from '../common/user-context/user-context.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, UserContextGuard],
  exports: [UsersService],
})
export class UsersModule {}
