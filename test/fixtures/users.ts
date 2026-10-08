export function buildCreateUserPayload(
  overrides: Partial<{ email: string; name: string }> = {},
) {
  const suffix = Date.now();
  return {
    email: overrides.email ?? `user-${suffix}@example.com`,
    name: overrides.name ?? 'Example User',
  };
}

export const validUserProfile = {
  name: 'Nome do usuário',
  cnh: '10000000091',
  document: '52998224725',
  documentType: 'CPF' as const,
  phone: '+5511999999999',
};
