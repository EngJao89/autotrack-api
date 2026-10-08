import { UserProfileFieldsDto } from './user-profile.fields';

/**
 * Full replacement of mutable profile fields.
 * Omitted fields are persisted as null. Email/id/timestamps are never accepted.
 */
export class PutUserDto extends UserProfileFieldsDto {}
