import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PutUserDto } from './dto/put-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { resolveDocumentType } from './utils/brazilian-documents';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
        },
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async replaceProfile(
    actorUserId: string,
    id: string,
    dto: PutUserDto,
  ): Promise<UserResponseDto> {
    this.assertSelf(actorUserId, id);
    await this.findById(id);

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: dto.name ?? null,
          cnh: dto.cnh ?? null,
          document: dto.document ?? null,
          documentType: this.resolveTypeForWrite(dto.document, dto.documentType),
          phone: dto.phone ?? null,
        },
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  async updateProfile(
    actorUserId: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.assertSelf(actorUserId, id);
    await this.findById(id);

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.cnh !== undefined) data.cnh = dto.cnh;
    if (dto.document !== undefined) data.document = dto.document;
    if (dto.documentType !== undefined || dto.document !== undefined) {
      data.documentType = this.resolveTypeForWrite(
        dto.document,
        dto.documentType,
        dto.document === undefined,
      );
    }
    if (dto.phone !== undefined) data.phone = dto.phone;

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  async removeProfile(actorUserId: string, id: string): Promise<void> {
    this.assertSelf(actorUserId, id);
    await this.findById(id);
    await this.prisma.user.delete({ where: { id } });
  }

  private assertSelf(actorUserId: string, targetUserId: string): void {
    if (actorUserId !== targetUserId) {
      throw new ForbiddenException(
        'You can only modify or delete your own profile',
      );
    }
  }

  private resolveTypeForWrite(
    document?: string | null,
    documentType?: string | null,
    keepExistingWhenDocumentOmitted = false,
  ): string | null | undefined {
    if (keepExistingWhenDocumentOmitted && document === undefined) {
      return documentType;
    }

    if (document === null) {
      return null;
    }

    if (typeof document === 'string') {
      return resolveDocumentType(document, documentType);
    }

    return documentType ?? null;
  }

  private rethrowUniqueConflict(error: unknown): void {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return;
    }

    const targetHint = `${JSON.stringify(error.meta ?? {})} ${error.message}`.toLowerCase();

    if (targetHint.includes('document')) {
      throw new ConflictException('Document already in use');
    }
    if (targetHint.includes('cnh')) {
      throw new ConflictException('CNH already in use');
    }
    if (targetHint.includes('email')) {
      throw new ConflictException('Email already in use');
    }

    throw new ConflictException('Unique constraint violation');
  }
}
