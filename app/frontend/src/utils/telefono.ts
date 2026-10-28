export function normalizarTelefono(value: string): string {
  if (!value.trim()) return '';
  if (value.length > 50 || !/^[+\d ()-]+$/.test(value)) throw new Error('Ingresa un teléfono válido, por ejemplo +502 5555 1234.');
  let numero = value.replace(/[ ()-]/g, '');
  if (/^\d{8}$/.test(numero)) numero = `+502${numero}`;
  if (!/^\+[1-9]\d{7,14}$/.test(numero)) throw new Error('Incluye el código de país o ingresa un número local de 8 dígitos.');
  return numero;
}
