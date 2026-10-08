import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import {
  isValidCnh,
  isValidDocument,
  isValidPhone,
} from '../utils/brazilian-documents';

export function IsBrazilianDocument(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isBrazilianDocument',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value == null || value === '') return true;
          if (typeof value !== 'string') return false;
          const documentType = (args.object as { documentType?: string | null })
            .documentType;
          return isValidDocument(value, documentType);
        },
        defaultMessage() {
          return 'document must be a valid CPF or CNPJ';
        },
      },
    });
  };
}

export function IsBrazilianCnh(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isBrazilianCnh',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null || value === '') return true;
          return typeof value === 'string' && isValidCnh(value);
        },
        defaultMessage() {
          return 'cnh must be a valid CNH';
        },
      },
    });
  };
}

export function IsE164Phone(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isE164Phone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value == null || value === '') return true;
          return typeof value === 'string' && isValidPhone(value);
        },
        defaultMessage() {
          return 'phone must be a valid phone number';
        },
      },
    });
  };
}
