import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });
    } else {
      this.client = new Redis({
        host,
        port: Number(port),
        password: password || undefined,
        lazyConnect: true,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
      });
    }

    const targetDesc = redisUrl ? 'via REDIS_URL' : `at ${host}:${port}`;
    this.client.connect()
      .then(() => this.logger.log(`Connected to Redis ${targetDesc}`))
      .catch((err) => this.logger.warn(`Could not connect to Redis: ${err.message}. Caching will fallback.`));

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      if (this.client?.status === 'ready') {
        return await this.client.get(key);
      }
      return null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (this.client?.status === 'ready') {
        if (ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
      }
    } catch (err) {
      this.logger.warn(`Redis set failed for key ${key}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.client?.status === 'ready') {
        await this.client.del(key);
      }
    } catch (err) {
      this.logger.warn(`Redis del failed for key ${key}`);
    }
  }
}
