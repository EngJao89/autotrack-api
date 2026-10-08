import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './flatten-validation-errors';

describe('flattenValidationErrors', () => {
  it('maps constraints to field/messages pairs', () => {
    const errors = [
      {
        property: 'email',
        constraints: {
          isEmail: 'email must be an email',
          maxLength: 'email must be shorter than or equal to 255 characters',
        },
      },
    ] as ValidationError[];

    expect(flattenValidationErrors(errors)).toEqual([
      {
        field: 'email',
        messages: [
          'email must be an email',
          'email must be shorter than or equal to 255 characters',
        ],
      },
    ]);
  });

  it('flattens nested validation errors', () => {
    const errors = [
      {
        property: 'profile',
        children: [
          {
            property: 'name',
            constraints: { minLength: 'name must be longer than or equal to 2 characters' },
          },
        ],
      },
    ] as ValidationError[];

    expect(flattenValidationErrors(errors)).toEqual([
      {
        field: 'profile.name',
        messages: ['name must be longer than or equal to 2 characters'],
      },
    ]);
  });
});
