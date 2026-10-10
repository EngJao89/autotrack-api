import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserContextGuard } from '../common/user-context/user-context.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, UserContextGuard],
  exports: [VehiclesService],
})
export class VehiclesModule {}
