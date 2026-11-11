import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { CustomersService } from '../customers/customers.service';

@Module({
  controllers: [ImportsController],
  providers: [ImportsService, CustomersService],
  exports: [ImportsService],
})
export class ImportsModule {}
