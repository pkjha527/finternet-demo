
import { cn } from '../../lib/utils';

interface ComplianceStatusProps {
  status: 'compliant' | 'pending' | 'warning' | 'error' | 'blocked';
  label: string;
  description?: string;
  showAnimation?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ComplianceStatus({
  status,
  label,
  description,
  showAnimation = true,
  size = 'md'
}: ComplianceStatusProps) {
  const statusConfig = {
    compliant: {
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
      pulseColor: 'bg-green-400'
    },
    pending: {
      icon: '⏳',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-200',
      pulseColor: 'bg-yellow-400'
    },
    warning: {
      icon: '⚠️',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: 'border-orange-200',
      pulseColor: 'bg-orange-400'
    },
    error: {
      icon: '❌',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200',
      pulseColor: 'bg-red-400'
    },
    blocked: {
      icon: '🚫',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      pulseColor: 'bg-red-500'
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center space-x-3">
      <div className={cn(
        'flex items-center space-x-2 px-3 py-2 rounded-lg border',
        config.bgColor,
        config.borderColor,
        sizeClasses[size]
      )}>
        <span className="text-lg">{config.icon}</span>
        <span className={cn('font-medium', config.color)}>
          {label}
        </span>
        {showAnimation && status === 'compliant' && (
          <div className={cn(
            'w-2 h-2 rounded-full animate-pulse',
            config.pulseColor
          )} />
        )}
      </div>
      
      {description && (
        <div className="text-sm text-gray-600">
          {description}
        </div>
      )}
    </div>
  );
}

export default ComplianceStatus;
