import { ValidationError } from 'class-validator';
import { ApiFieldError } from '../errors/api-error';

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ApiFieldError[] {
  const items: ApiFieldError[] = [];

  for (const error of errors) {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      items.push({
        field,
        messages: Object.values(error.constraints),
      });
    }

    if (error.children?.length) {
      items.push(...flattenValidationErrors(error.children, field));
    }
  }

  return items;
}
