import { Module } from '@nestjs/common';
import { UserContextGuard } from '../common/user-context/user-context.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, UserContextGuard],
  exports: [VehiclesService],
})
export class VehiclesModule {}
