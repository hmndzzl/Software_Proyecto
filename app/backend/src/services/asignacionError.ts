export class ErrorAsignacion extends Error {
  constructor(public readonly status: number, mensaje: string) { super(mensaje); }
}
