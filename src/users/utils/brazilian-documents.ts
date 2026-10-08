export type DocumentType = 'CPF' | 'CNPJ';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = digitsOnly(trimmed);
  return hasPlus || digits.length > 11 ? `+${digits}` : `+55${digits}`;
}

export function isValidCpf(raw: string): boolean {
  const cpf = digitsOnly(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calc = (base: string, factor: number): number => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor;
      factor -= 1;
    }
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

export function isValidCnpj(raw: string): boolean {
  const cnpj = digitsOnly(raw);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const calc = (base: string, weights: number[]): number => {
    const total = base
      .split('')
      .reduce((sum, digit, index) => sum + Number(digit) * weights[index]!, 0);
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cnpj.slice(0, 12), w1);
  const d2 = calc(cnpj.slice(0, 13), w2);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

export function isValidCnh(raw: string): boolean {
  const cnh = digitsOnly(raw);
  if (cnh.length !== 11 || /^(\d)\1{10}$/.test(cnh)) {
    return false;
  }

  let sum = 0;
  let weight = 9;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cnh[i]) * weight;
    weight -= 1;
  }

  let discard = 0;
  let firstDigit = sum % 11;
  if (firstDigit >= 10) {
    firstDigit = 0;
    discard = 2;
  }

  sum = 0;
  weight = 1;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cnh[i]) * weight;
    weight += 1;
  }

  let secondDigit = (sum % 11) - discard;
  if (secondDigit < 0) secondDigit += 11;
  if (secondDigit >= 10) secondDigit = 0;

  return firstDigit === Number(cnh[9]) && secondDigit === Number(cnh[10]);
}

export function resolveDocumentType(
  document: string,
  documentType?: string | null,
): DocumentType | null {
  const digits = digitsOnly(document);
  if (documentType === 'CPF' || documentType === 'CNPJ') {
    return documentType;
  }
  if (digits.length === 11) return 'CPF';
  if (digits.length === 14) return 'CNPJ';
  return null;
}

export function isValidDocument(
  document: string,
  documentType?: string | null,
): boolean {
  const type = resolveDocumentType(document, documentType);
  if (!type) return false;
  return type === 'CPF' ? isValidCpf(document) : isValidCnpj(document);
}

export function isValidPhone(value: string): boolean {
  const normalized = normalizePhone(value);
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}
