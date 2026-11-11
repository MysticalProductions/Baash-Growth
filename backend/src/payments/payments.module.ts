import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController, PurchasesController } from './payments.controller';
import { WalletsModule } from '../wallets/wallets.module';
import { PackagesModule } from '../packages/packages.module';

@Module({
  imports: [WalletsModule, PackagesModule],
  controllers: [PaymentsController, PurchasesController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
