import {
  BadRequestException,
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

export interface FirebaseIdentityInput {
  firebaseUid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
}

export interface BootstrapResult {
  created: boolean;
  user: UserResponseDto;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
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

  async findByFirebaseUid(firebaseUid: string): Promise<UserResponseDto | null> {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
    });
  }

  async findByFirebaseUidOrThrow(firebaseUid: string): Promise<UserResponseDto> {
    const user = await this.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(
        'Local user profile not found. Call POST /v1/auth/bootstrap first',
      );
    }
    return user;
  }

  /**
   * Creates or synchronizes the local profile for a verified Firebase identity.
   *
   * Policies (ATP-30/31):
   * - Primary key for linkage is `firebaseUid` (never email alone).
   * - Email is provider data: synced from Firebase when safe.
   * - Unverified emails may bootstrap in MVP; sensitive ops may require verified later.
   * - Email collision with a different `firebaseUid` → 409 (no auto-link).
   * - Existing local user with same email and null `firebaseUid` → link (migration path).
   */
  async bootstrapFromFirebase(
    identity: FirebaseIdentityInput,
  ): Promise<BootstrapResult> {
    const firebaseUid = identity.firebaseUid?.trim();
    if (!firebaseUid) {
      throw new BadRequestException('Firebase UID is required');
    }

    const email = identity.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException(
        'Authenticated token must include an email claim',
      );
    }

    const byUid = await this.findByFirebaseUid(firebaseUid);
    if (byUid) {
      const user = await this.syncFromFirebase(byUid, email, identity.name);
      return { created: false, user };
    }

    const byEmail = await this.findByEmail(email);
    if (byEmail) {
      if (byEmail.firebaseUid && byEmail.firebaseUid !== firebaseUid) {
        throw new ConflictException(
          'Email already linked to another Firebase identity',
        );
      }

      if (!byEmail.firebaseUid) {
        try {
          const linked = await this.prisma.user.update({
            where: { id: byEmail.id },
            data: {
              firebaseUid,
              ...(byEmail.name == null && identity.name
                ? { name: identity.name }
                : {}),
            },
          });
          return { created: false, user: linked };
        } catch (error) {
          this.rethrowUniqueConflict(error);
          throw error;
        }
      }
    }

    try {
      const created = await this.prisma.user.create({
        data: {
          firebaseUid,
          email,
          name: identity.name ?? null,
        },
      });
      return { created: true, user: created };
    } catch (error) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  async getMe(firebaseUid: string): Promise<UserResponseDto> {
    return this.findByFirebaseUidOrThrow(firebaseUid);
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

  private async syncFromFirebase(
    user: UserResponseDto,
    email: string,
    name?: string,
  ): Promise<UserResponseDto> {
    const data: Prisma.UserUpdateInput = {};

    if (user.email !== email) {
      const conflict = await this.findByEmail(email);
      if (conflict && conflict.id !== user.id) {
        throw new ConflictException(
          'Email already linked to another Firebase identity',
        );
      }
      data.email = email;
    }

    if (user.name == null && name) {
      data.name = name;
    }

    if (Object.keys(data).length === 0) {
      return user;
    }

    try {
      return await this.prisma.user.update({
        where: { id: user.id },
        data,
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
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

    if (targetHint.includes('firebaseuid')) {
      throw new ConflictException('Firebase identity already linked');
    }
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
