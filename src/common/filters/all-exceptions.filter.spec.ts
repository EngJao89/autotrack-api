import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { API_ERROR_CODE } from '../errors/error-codes';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  const createHost = (requestId = 'req-123') => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = {
      requestId,
      url: '/v1/users',
      method: 'POST',
    };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as ArgumentsHost;

    return { host, status, json };
  };

  it('normalizes HttpException payloads and keeps stable codes', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new HttpException(
        {
          statusCode: 409,
          message: 'Email already in use',
        },
        HttpStatus.CONFLICT,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      code: API_ERROR_CODE.CONFLICT,
      message: 'Email already in use',
      requestId: 'req-123',
    });
  });

  it('preserves validation errors and requestId', () => {
    const { host, status, json } = createHost('incoming-id');

    filter.catch(
      new HttpException(
        {
          statusCode: 400,
          code: API_ERROR_CODE.VALIDATION_ERROR,
          message: 'Request validation failed',
          errors: [{ field: 'email', messages: ['email must be an email'] }],
        },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      code: API_ERROR_CODE.VALIDATION_ERROR,
      message: 'Request validation failed',
      errors: [{ field: 'email', messages: ['email must be an email'] }],
      requestId: 'incoming-id',
    });
  });

  it('hides unexpected error details from the client', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new Error('SELECT * FROM secrets WHERE token = "abc"'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      code: API_ERROR_CODE.INTERNAL_ERROR,
      message: 'Internal server error',
      requestId: 'req-123',
    });
    expect(JSON.stringify(json.mock.calls[0]?.[0])).not.toMatch(
      /SELECT|secrets|token|stack/i,
    );
  });
});
