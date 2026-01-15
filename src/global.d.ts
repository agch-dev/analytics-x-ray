declare module '*.svg' {
  import type * as React from 'react';
  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.json' {
  const content: string;
  export default content;
}

// Injected at build time by Vite
declare const __DEV_MODE__: boolean;
