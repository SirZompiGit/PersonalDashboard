/**
 * Marchio di Fantasia.
 *
 * Tre file e due varianti:
 *
 *  Normale  → `logo-fantasia.png` (oro), oppure `logo-fantasia-black.png`
 *             quando il design è White: l'oro su fondo chiaro sparirebbe.
 *  Colorato → `logo-fantasia-white.png` usato come MASCHERA, sempre e con
 *             qualunque design.
 *
 * Il colorato non è un'immagine colorata: il canale alfa della sagoma bianca
 * ritaglia un fondo pieno nel colore del tema. Così il marchio prende
 * esattamente la tinta scelta e la segue anche durante la dissolvenza del
 * cambio tema, senza bisogno di un file per ogni colore.
 *
 * Se un file manca, si ricade sulla scritta composta con il carattere del
 * design: l'app resta presentabile e non compare mai l'icona di immagine rotta.
 */

import { useState } from 'react';
import type { CampaignStyle, LogoVariant } from '../../theme';

const LOGO_GOLD = '/logo-fantasia.png';
const LOGO_BLACK = '/logo-fantasia-black.png';
const LOGO_WHITE = '/logo-fantasia-white.png';

/** Proporzioni originali del marchio: 2254 × 531. */
const ASPECT = '2254 / 531';

export interface WordmarkChoice {
  /** `image` disegna il file così com'è, `masked` lo colora col tema. */
  mode: 'image' | 'masked';
  src: string;
}

/**
 * Quale file usare, e come.
 *
 * Estratta dal componente perché la regola è sottile e vale la pena bloccarla
 * con un test: il nero serve SOLO alla variante normale sul design chiaro,
 * mentre il colorato vale ovunque.
 */
export function resolveWordmark(style: CampaignStyle, variant: LogoVariant): WordmarkChoice {
  if (variant === 'colored') return { mode: 'masked', src: LOGO_WHITE };
  return { mode: 'image', src: style === 'white' ? LOGO_BLACK : LOGO_GOLD };
}

interface WordmarkProps {
  /** Design in vigore: il chiaro impone la variante nera. */
  style?: CampaignStyle;
  /** Scelta dell'utente fra marchio originale e marchio colorato. */
  variant?: LogoVariant;
  /** Classi per il marchio: serve almeno un'altezza. */
  className?: string;
  /** Classi per la scritta di riserva, che deve pesare quanto il logo. */
  fallbackClassName?: string;
}

export function Wordmark({
  style = 'grimorio',
  variant = 'normal',
  className = 'h-8',
  fallbackClassName = 'font-display text-lg font-extrabold uppercase tracking-wider text-slate-100',
}: WordmarkProps) {
  const [failed, setFailed] = useState(false);
  const choice = resolveWordmark(style, variant);

  if (failed) {
    return <span className={fallbackClassName}>Fantasia</span>;
  }

  if (choice.mode === 'masked') {
    return (
      <span
        role="img"
        aria-label="Fantasia"
        className={`block select-none bg-theme-500 ${className}`}
        style={{
          aspectRatio: ASPECT,
          // Il canale alfa del PNG bianco ritaglia il fondo colorato.
          maskImage: `url("${choice.src}")`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskImage: `url("${choice.src}")`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
        }}
      />
    );
  }

  return (
    <img
      // La `key` forza il ricaricamento al cambio design: senza, il browser
      // terrebbe l'immagine precedente.
      key={choice.src}
      src={choice.src}
      alt="Fantasia"
      // `w-auto` con l'altezza data dal chiamante: il marchio è molto largo e
      // deve scalare in proporzione, mai deformarsi.
      className={`w-auto select-none ${className}`}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
