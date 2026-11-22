import { useContext } from 'react';
import { AuthContext } from '../auth/useAuth';

/**
 * "Welcome, NAME" for a signed-in profile; nothing for a guest. A light line, not a heading: the screen's
 * h1 stays the only h1. The name is plain text (React escapes it) and is cut to one line visually while the
 * full name stays in the accessible text.
 */
export function Greeting() {
  const name = useContext(AuthContext)?.current?.name;
  if (!name) return null;
  return (
    <p className="flex min-w-0 text-base text-muted">
      <span className="shrink-0 whitespace-pre">Welcome, </span>
      <span className="min-w-0 truncate">{name}</span>
    </p>
  );
}
