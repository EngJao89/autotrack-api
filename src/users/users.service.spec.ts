import {
  ConflictException,
  ForbiddenException,
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
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const user = {
    id: 'user_1',
    email: 'user@example.com',
    name: 'Example User',
    cnh: null,
    document: null,
    documentType: null,
    phone: null,
    createdAt: new Date('2026-10-05T20:00:00.000Z'),
    updatedAt: new Date('2026-10-05T20:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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
      meta: { target: ['email'] },
    });
    prisma.user.create.mockRejectedValue(error);

    await expect(
      service.create({ email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('replaces profile fields for the owner and nulls omitted ones', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue({
      ...user,
      name: 'Nome do usuário',
      document: '52998224725',
      documentType: 'CPF',
      phone: '+5511999999999',
      cnh: null,
    });

    const result = await service.replaceProfile('user_1', 'user_1', {
      name: 'Nome do usuário',
      document: '52998224725',
      documentType: 'CPF',
      phone: '+5511999999999',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        name: 'Nome do usuário',
        cnh: null,
        document: '52998224725',
        documentType: 'CPF',
        phone: '+5511999999999',
      },
    });
    expect(result).not.toHaveProperty('password');
  });

  it('patches only provided fields', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue({
      ...user,
      phone: '+5511987654321',
    });

    await service.updateProfile('user_1', 'user_1', {
      phone: '+5511987654321',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        phone: '+5511987654321',
      },
    });
  });

  it('forbids modifying another user profile', async () => {
    await expect(
      service.replaceProfile('user_1', 'user_2', { name: 'Hack' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deletes an owned profile', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.delete.mockResolvedValue(user);

    await expect(
      service.removeProfile('user_1', 'user_1'),
    ).resolves.toBeUndefined();
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user_1' } });
  });

  it('maps document unique conflicts', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['document'] },
      }),
    );

    await expect(
      service.updateProfile('user_1', 'user_1', {
        document: '52998224725',
        documentType: 'CPF',
      }),
    ).rejects.toThrow('Document already in use');
  });

  it('finds a user by id', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findById('user_1')).resolves.toEqual(user);
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
