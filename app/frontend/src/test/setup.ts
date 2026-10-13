import '@testing-library/jest-dom';

// Node ≥ 25 trae un localStorage nativo que, sin --localstorage-file, queda indefinido y tapa el de
// jsdom (rompe cualquier prueba que lo use). Si pasa, se instala uno en memoria equivalente.
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage?.clear !== 'function') {
  const datos = new Map<string, string>();
  const almacen: Storage = {
    get length() { return datos.size; },
    clear: () => datos.clear(),
    getItem: (key) => datos.get(String(key)) ?? null,
    key: (index) => Array.from(datos.keys())[index] ?? null,
    removeItem: (key) => { datos.delete(String(key)); },
    setItem: (key, value) => { datos.set(String(key), String(value)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: almacen, configurable: true, writable: true });
}
