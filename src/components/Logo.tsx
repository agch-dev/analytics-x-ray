import { isDevMode } from '@src/lib/utils';
import iconDev from '@assets/images/iconDev.svg';
import iconProd from '@assets/images/iconProd.svg';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 32 }: LogoProps) {
  const iconSrc = isDevMode() ? iconDev : iconProd;

  return (
    <img 
      src={iconSrc} 
      className={className}
      style={{ width: size, height: size }}
      alt="Analytics X-Ray Logo" 
    />
  );
}

