import { PartialType } from '@nestjs/swagger';
import { UserProfileFieldsDto } from './user-profile.fields';

/**
 * Partial update: only provided fields are changed.
 * Explicit null clears a field.
 */
export class UpdateUserDto extends PartialType(UserProfileFieldsDto) {}
