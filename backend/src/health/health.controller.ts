import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../common/redis/redis.service';

@ApiTags('Health & Monitoring')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Platform healthcheck (PostgreSQL, Redis, Process Uptime)' })
  async check() {
    let dbStatus = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    let redisStatus = 'down';
    try {
      const redisClient = this.redisService.getClient();
      if (redisClient && redisClient.status === 'ready') {
        redisStatus = 'up';
      }
    } catch {
      redisStatus = 'down';
    }

    const isHealthy = dbStatus === 'up';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for zero-downtime deployment (checks PostgreSQL connection)' })
  async ready(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        status: 'ready',
        ready: true,
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (err: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not_ready',
        ready: false,
        timestamp: new Date().toISOString(),
        database: 'unreachable',
      });
    }
  }
}
