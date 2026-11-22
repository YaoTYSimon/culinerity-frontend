import { KEYS } from './storageKeys';

/** Has this device's visitor already chosen at the start screen? The flag holds no personal data. */
export function readWelcomed(): boolean {
  try {
    return localStorage.getItem(KEYS.welcomed) === '1';
  } catch {
    return false;
  }
}

/** Remember the choice. Storage may be blocked or full; then the start screen simply shows again next visit. */
export function writeWelcomed(): void {
  try {
    localStorage.setItem(KEYS.welcomed, '1');
  } catch {
    // Nothing to do: the choice still holds for this tab.
  }
}
