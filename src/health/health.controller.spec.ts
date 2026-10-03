import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  HealthIndicatorService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        PrismaHealthIndicator,
        HealthIndicatorService,
        {
          provide: PrismaService,
          useValue: {
            $runCommandRaw: jest
              .fn()
              .mockRejectedValue(new Error('Use the mongodb provider')),
            $queryRawUnsafe: jest.fn().mockResolvedValue(1),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('should return terminus health payload', async () => {
    const result = await controller.check();

    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: 'ok',
      info: { database: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' } },
    });
  });

  it('should include database indicator in check callbacks', async () => {
    await controller.check();
    const callbacks = healthCheckService.check.mock.calls[0][0] as Array<
      () => PromiseLike<unknown>
    >;
    expect(callbacks).toHaveLength(1);
    await expect(callbacks[0]()).resolves.toMatchObject({
      database: { status: 'up' },
    });
  });
});
