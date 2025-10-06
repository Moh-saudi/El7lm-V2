import { cn } from '@/lib/utils';
import React from 'react';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
}

const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  className = '',
  mobile = true,
  tablet = true,
  desktop = true
}) => {
  const getResponsiveClasses = () => {
    const classes = [];

    if (mobile) classes.push('block');
    else classes.push('hidden');

    if (tablet) classes.push('md:block');
    else classes.push('md:hidden');

    if (desktop) classes.push('lg:block');
    else classes.push('lg:hidden');

    return classes.join(' ');
  };

  return (
    <div className={cn(getResponsiveClasses(), className)}>
      {children}
    </div>
  );
};

export default ResponsiveWrapper;
