/**
 * Classi condivise dei campi di input.
 *
 * La base non contiene né spaziatura né dimensione del testo: concatenare
 * `text-xs` a una stringa che contiene già `text-sm` non funziona, perché sono
 * utility di pari specificità e vince quella che capita dopo nel CSS generato,
 * non quella scritta per ultima nell'attributo. Le varianti nascono qui, una
 * volta sola, invece di essere composte a caso nei componenti.
 */

const FIELD_BASE =
  'rounded-lg border border-bento-border bg-bento-panel text-slate-100 transition-colors duration-200 focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500/20';

/**
 * Nemmeno la larghezza è inclusa, per lo stesso motivo: `w-full` e `w-20` sono
 * la stessa proprietà, e la seconda non vincerebbe solo perché scritta dopo.
 * La decide chi usa il campo.
 */
export const FIELD = `${FIELD_BASE} px-3 py-2 text-sm`;

/** Campo compatto, per righe dense come quelle delle risorse. */
export const FIELD_SM = `${FIELD_BASE} px-2 py-1.5 text-xs`;
