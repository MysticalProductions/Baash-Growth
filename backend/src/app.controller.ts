import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Root API')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Platform API overview and service metadata' })
  getRoot() {
    return {
      platform: 'BAASH GROWTH API',
      version: '1.0.0',
      status: 'online',
      documentation: '/api/docs',
      health: '/api/health',
      timestamp: new Date().toISOString(),
    };
  }
}

