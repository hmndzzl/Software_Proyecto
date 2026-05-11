import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

/* ── Field wrapper ── */
interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </span>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
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
