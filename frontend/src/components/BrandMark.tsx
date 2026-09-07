import React from 'react';

interface BrandMarkProps {
  /** the background this sits on — `dark` puts the logo on a brand-blue chip */
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  /**
   * Render as a full-width band (edge-to-edge, square corners, logo centred)
   * instead of a self-hugging chip. Used for the admin sidebar header.
   */
  block?: boolean;
  className?: string;
}

const LOGO_H = { sm: 'h-6', md: 'h-7', lg: 'h-9' } as const;
const CHIP_PAD = { sm: 'px-2.5 py-1.5', md: 'px-3 py-2', lg: 'px-4 py-2.5' } as const;
const BAND_PAD = { sm: 'py-3', md: 'py-4', lg: 'py-5' } as const;

/**
 * The single RHB brand lockup — just the RHB logo, same treatment everywhere
 * (public header, login, admin sidebar). Don't render `/rhb-logo.png` directly
 * anywhere else.
 *
 * On light surfaces the logo sits bare on the page. On dark surfaces (navy
 * sidebar / login) it sits on an `rhb-light` chip — the same colour as the
 * public site header — so the immediate background behind the logo is
 * consistent across the whole app. Pass `block` for a full-width centred band.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({
  theme = 'light',
  size = 'md',
  block = false,
  className = '',
}) => {
  const dark = theme === 'dark';

  if (block) {
    return (
      <div
        className={`flex items-center justify-center w-full ${BAND_PAD[size]} ${
          dark ? 'bg-rhb-light' : ''
        } ${className}`}
      >
        <img src="/rhb-logo.png" alt="RHB Bank" className={`${LOGO_H[size]} w-auto`} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center shrink-0 ${
        dark ? `bg-rhb-light rounded-xl shadow-md ${CHIP_PAD[size]}` : ''
      } ${className}`}
    >
      <img src="/rhb-logo.png" alt="RHB Bank" className={`${LOGO_H[size]} w-auto`} />
    </div>
  );
};
