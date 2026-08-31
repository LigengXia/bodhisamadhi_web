import type { DetailedHTMLProps, HTMLAttributes } from 'react';

// Augment (not replace) React's JSX types with the <lite-youtube> custom
// element. This file has a top-level import, so `declare module 'react'` is
// treated as an augmentation.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lite-youtube': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          videoid: string;
          playlabel?: string;
          params?: string;
        },
        HTMLElement
      >;
    }
  }
}
