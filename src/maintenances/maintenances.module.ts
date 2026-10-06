import { Module } from '@nestjs/common';
import { UserContextGuard } from '../common/user-context/user-context.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { MaintenancesController } from './maintenances.controller';
import { MaintenancesService } from './maintenances.service';
import { VehicleMaintenancesController } from './vehicle-maintenances.controller';

@Module({
  imports: [PrismaModule, UsersModule, VehiclesModule],
  controllers: [VehicleMaintenancesController, MaintenancesController],
  providers: [MaintenancesService, UserContextGuard],
  exports: [MaintenancesService],
})
export class MaintenancesModule {}
