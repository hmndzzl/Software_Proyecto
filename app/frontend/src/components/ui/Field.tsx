import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

/* ── Field wrapper ── */
interface FieldContentProps {
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

type FieldProps = FieldContentProps & (
  | { label: string; htmlFor: string }
  | { label?: never; htmlFor?: never }
);

export function Field({ label, htmlFor, required, hint, children }: FieldProps) {
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {required && <span className={styles.required} aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && <span id={htmlFor ? `${htmlFor}-hint` : undefined} className={styles.hint}>{hint}</span>}
    </div>
  );
}

export function FieldGroup({ label, required, children }: Omit<FieldContentProps, 'hint'> & { label: string }) {
  return (
    <fieldset className={`${styles.field} ${styles.group}`}>
      <legend className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden="true">*</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/* ── Input ── */
interface InputUIProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  suffix?: ReactNode;
}

export function InputUI({ icon, suffix, className = '', ...rest }: InputUIProps) {
  if (!icon && !suffix) {
    return <input className={`${styles.input} ${className}`} {...rest} />;
  }
  return (
    <div className={`${styles.inputWrap}${suffix ? ` ${styles.hasSuffix}` : ''}`}>
      {icon && <span className={styles.inputIcon}>{icon}</span>}
      <input className={`${styles.input} ${className}`} {...rest} />
      {suffix && <span className={styles.inputSuffix}>{suffix}</span>}
    </div>
  );
}

/* ── Select ── */
export function SelectUI({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${styles.select} ${className}`} {...rest}>
      {children}
    </select>
  );
}

/* ── Textarea ── */
export function TextareaUI({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${styles.textarea} ${className}`} {...rest} />;
}
