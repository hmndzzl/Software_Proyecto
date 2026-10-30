import Btn from './Btn';
import styles from './BackButton.module.css';

interface Props {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function BackButton({ label, onClick, disabled }: Props) {
  return <Btn type="button" kind="ghost" onClick={onClick} disabled={disabled}
    className={styles.button}
    icon={<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7-7-7 7 7 7" /></svg>}>
    {label}
  </Btn>;
}
