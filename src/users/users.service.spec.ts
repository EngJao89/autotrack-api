import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const user = {
    id: 'user_1',
    email: 'user@example.com',
    name: 'Example User',
    createdAt: new Date('2026-10-05T20:00:00.000Z'),
    updatedAt: new Date('2026-10-05T20:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('creates a user without password', async () => {
    prisma.user.create.mockResolvedValue(user);

    const result = await service.create({
      email: 'user@example.com',
      name: 'Example User',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'user@example.com', name: 'Example User' },
    });
    expect(result).toEqual(user);
    expect(result).not.toHaveProperty('password');
  });

  it('throws conflict when email is duplicated', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '7.10.0',
    });
    prisma.user.create.mockRejectedValue(error);

    await expect(
      service.create({ email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds a user by id', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findById('user_1')).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_1' },
    });
  });

  it('throws not found when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('finds a user by normalized email', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findByEmail('  User@Example.com ')).resolves.toEqual(
      user,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
  });
});
