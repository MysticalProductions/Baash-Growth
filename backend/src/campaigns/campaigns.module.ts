import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { AdminCampaignsController } from './admin-campaigns.controller';
import { DatabaseModule } from '../database/database.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [DatabaseModule, ProvidersModule],
  controllers: [CampaignsController, AdminCampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
