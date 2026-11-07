import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserContextGuard } from '../common/user-context/user-context.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { VehicleEstimatesController } from './vehicle-estimates.controller';

@Module({
  imports: [PrismaModule, UsersModule, VehiclesModule, AuthModule],
  controllers: [VehicleEstimatesController, EstimatesController],
  providers: [EstimatesService, UserContextGuard],
  exports: [EstimatesService],
})
export class EstimatesModule {}
