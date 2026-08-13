import { HttpErrorResponse } from '@angular/common/http';

/** Extrae el mensaje legible de un error HTTP de la API (NestJS validation). */
export function apiError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string | string[] } | undefined;
    if (Array.isArray(body?.message)) return body!.message[0];
    if (typeof body?.message === 'string') return body.message;
    if (err.status === 0) return 'No se pudo conectar con el servidor';
    if (err.status === 401) return 'Credenciales incorrectas';
    return `Error ${err.status}`;
  }
  return 'Error inesperado';
}
