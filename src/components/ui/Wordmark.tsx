/**
 * Marchio di Fantasia.
 *
 * Usa il logo in `public/logo-fantasia.png`. Se il file non c'è ricade sulla
 * scritta composta con il carattere del design: così l'app resta presentabile
 * anche prima che il logo venga aggiunto, e non compare mai l'icona di
 * immagine rotta.
 */

import { useState } from 'react';

/** Vive in `public/`, quindi è servito dalla radice senza passare dal bundler. */
const LOGO_SRC = '/logo-fantasia.png';

interface WordmarkProps {
  /** Classi per l'immagine: serve almeno un'altezza. */
  className?: string;
  /** Classi per la scritta di riserva, che deve pesare quanto il logo. */
  fallbackClassName?: string;
}

export function Wordmark({
  className = 'h-8',
  fallbackClassName = 'font-display text-lg font-extrabold uppercase tracking-wider text-slate-100',
}: WordmarkProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className={fallbackClassName}>Fantasia</span>;
  }

  return (
    <img
      src={LOGO_SRC}
      alt="Fantasia"
      // `w-auto` con l'altezza data dal chiamante: il marchio è molto largo e
      // deve scalare in proporzione, mai deformarsi.
      className={`w-auto select-none ${className}`}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
