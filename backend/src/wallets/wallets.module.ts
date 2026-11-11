import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { WalletsController, TransactionsController } from './wallets.controller';

@Module({
  controllers: [WalletsController, TransactionsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
