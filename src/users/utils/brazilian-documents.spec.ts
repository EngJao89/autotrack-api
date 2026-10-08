import {
  isValidCnh,
  isValidCnpj,
  isValidCpf,
  isValidPhone,
  normalizePhone,
  digitsOnly,
} from './brazilian-documents';

describe('brazilian-documents', () => {
  it('normalizes digits and phone numbers', () => {
    expect(digitsOnly('123.456.789-09')).toBe('12345678909');
    expect(normalizePhone('(11) 99999-9999')).toBe('+5511999999999');
    expect(normalizePhone('+5511987654321')).toBe('+5511987654321');
  });

  it('validates CPF check digits', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('12345678900')).toBe(false);
  });

  it('validates CNPJ check digits', () => {
    expect(isValidCnpj('04.252.011/0001-10')).toBe(true);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('validates CNH check digits', () => {
    expect(isValidCnh('10000000091')).toBe(true);
    expect(isValidCnh('11111111111')).toBe(false);
  });

  it('validates phone shape after normalization', () => {
    expect(isValidPhone('+5511999999999')).toBe(true);
    expect(isValidPhone('11999999999')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });
});
