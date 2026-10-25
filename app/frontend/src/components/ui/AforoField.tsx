import { useId } from 'react';
import form from '../../styles/Form.module.css';

export function errorAforo(value: string, capacidad?: number | null): string | null {
  const cantidad = Number(value);
  if (!value || !Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > 2147483647) return 'Indica una cantidad entera mayor que cero.';
  if (capacidad != null && cantidad > capacidad) return `La cantidad esperada (${cantidad}) supera la capacidad del espacio (${capacidad} personas).`;
  return null;
}

export default function AforoField({ value, onChange, capacidad, required = true }: { value: string; onChange: (value: string) => void; capacidad?: number | null; required?: boolean }) {
  const id = useId();
  const error = value ? errorAforo(value, capacidad) : null;
  return <div className={form.field}>
    <label htmlFor={id} className={`${form.label} ${required ? form.required : ''}`}>Cantidad de personas esperadas</label>
    <input id={id} type="number" min={1} step={1} max={capacidad ?? 2147483647} className={form.input} value={value}
      onChange={e => onChange(e.target.value)} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={`${id}-help`} placeholder="Ej. 30" />
    <p id={`${id}-help`} className={error ? `${form.message} ${form.messageError}` : form.fieldNote} aria-live="polite">
      {error ?? (capacidad === undefined ? 'Selecciona un espacio para consultar su capacidad.' : capacidad === null ? 'La capacidad del espacio no está registrada. Consúltala con la oficina parroquial.' : `Capacidad máxima del espacio: ${capacidad} personas.`)}
    </p>
  </div>;
}
