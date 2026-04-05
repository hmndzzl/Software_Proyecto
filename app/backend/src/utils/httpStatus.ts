/**
 * Enumeración con los códigos de estado HTTP más comunes.
 * Usar esto en lugar de números mágicos (hardcodeados) mejora 
 * significativamente la legibilidad y mantenimiento del código.
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}
