import React from 'react';
import { cn } from '../../lib/utils';

interface EnhancedCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compliance' | 'warning' | 'success' | 'error';
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: boolean;
  elevated?: boolean;
}

export function EnhancedCard({
  children,
  className,
  variant = 'default',
  title,
  subtitle,
  icon,
  gradient = false,
  elevated = false
}: EnhancedCardProps) {
  const baseClasses = "rounded-xl border transition-all duration-200";
  
  const variantClasses = {
    default: "bg-white border-gray-200 hover:border-gray-300",
    compliance: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
    warning: "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200",
    success: "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
    error: "bg-gradient-to-br from-red-50 to-pink-50 border-red-200"
  };

  const shadowClasses = elevated 
    ? "shadow-lg hover:shadow-xl" 
    : "shadow-sm hover:shadow-md";

  const gradientClasses = gradient 
    ? "bg-gradient-to-br from-white via-gray-50 to-gray-100" 
    : "";

  return (
    <div className={cn(
      baseClasses,
      variantClasses[variant],
      shadowClasses,
      gradientClasses,
      className
    )}>
      {(title || icon) && (
        <div className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0 text-2xl">
                {icon}
              </div>
            )}
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

export default EnhancedCard;
