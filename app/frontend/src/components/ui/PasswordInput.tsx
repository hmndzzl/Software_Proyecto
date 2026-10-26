import { useId, useState, type InputHTMLAttributes } from 'react';
import { InputUI } from './Field';
import styles from './PasswordInput.module.css';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function PasswordInput({ id, className = '', disabled, ...rest }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const action = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';

  return (
    <div className={styles.wrapper}>
      <InputUI {...rest} id={inputId} type={visible ? 'text' : 'password'} disabled={disabled}
        className={`${styles.input} ${className}`} />
      <button type="button" className={styles.toggle} disabled={disabled}
        aria-label={action} title={action} aria-controls={inputId}
        onClick={() => setVisible(previous => !previous)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {visible ? <>
            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11 11 0 0 1 12 5c7 0 10 7 10 7a17 17 0 0 1-3 4M6.2 6.2A19 19 0 0 0 2 12s3 7 10 7a11 11 0 0 0 5.8-1.8" />
          </> : <>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </>}
        </svg>
      </button>
    </div>
  );
}
