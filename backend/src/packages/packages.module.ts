import { Module } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { AdminPackagesController } from './admin-packages.controller';

@Module({
  controllers: [PackagesController, AdminPackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
