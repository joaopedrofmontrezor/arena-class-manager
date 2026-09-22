import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../csrf';
import { describe, it, expect } from "@jest/globals";

function mockContext(req: Partial<{
  method: string;
  path: string;
  cookies: Record<string, string>;
  headers: Record<string, string>;
}>): ExecutionContext {
  const fullReq = { method: 'POST', path: '/lessons', cookies: {}, headers: {}, ...req };
  return {
    switchToHttp: () => ({ getRequest: () => fullReq }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('permite métodos seguros (GET) sem token CSRF', () => {
    expect(guard.canActivate(mockContext({ method: 'GET' }))).toBe(true);
  });

  it('permite /auth/login sem token CSRF (ainda não existe sessão)', () => {
    expect(guard.canActivate(mockContext({ method: 'POST', path: '/auth/login' }))).toBe(true);
  });

  it('permite requisições autenticadas via Bearer token (Postman/scripts)', () => {
    expect(
      guard.canActivate(
        mockContext({ method: 'POST', headers: { authorization: 'Bearer abc123' } }),
      ),
    ).toBe(true);
  });

  it('bloqueia POST sem cookie nem header CSRF', () => {
    expect(() => guard.canActivate(mockContext({ method: 'POST' }))).toThrow(ForbiddenException);
  });

  it('bloqueia quando cookie e header CSRF não batem (ataque forjado)', () => {
    const req = {
      method: 'POST',
      cookies: { [CSRF_COOKIE_NAME]: 'valor-real' },
      headers: { [CSRF_HEADER_NAME]: 'valor-forjado' },
    };
    expect(() => guard.canActivate(mockContext(req))).toThrow(ForbiddenException);
  });

  it('permite quando cookie e header CSRF batem', () => {
    const req = {
      method: 'POST',
      cookies: { [CSRF_COOKIE_NAME]: 'token-valido' },
      headers: { [CSRF_HEADER_NAME]: 'token-valido' },
    };
    expect(guard.canActivate(mockContext(req))).toBe(true);
  });
});
