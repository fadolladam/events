// Minimal ambient types for the `qrcode` package (no bundled types, no @types package installed).
declare module 'qrcode' {
  export interface QRCodeToDataURLOptions {
    margin?: number;
    scale?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;

  const _default: { toDataURL: typeof toDataURL };
  export default _default;
}
