import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  icon?: React.ReactNode;
}

interface ProgressFlowProps {
  steps: ProgressStep[];
  currentStep: string;
  className?: string;
  showConnectors?: boolean;
}

export function ProgressFlow({
  steps,
  currentStep,
  className,
  showConnectors = true
}: ProgressFlowProps) {
  const getStepStatus = (step: ProgressStep) => {
    if (step.id === currentStep) return 'active';
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    const stepIndex = steps.findIndex(s => s.id === step.id);
    return stepIndex < currentIndex ? 'completed' : 'pending';
  };

  const getStepClasses = (step: ProgressStep) => {
    const status = getStepStatus(step);
    
    switch (status) {
      case 'completed':
        return {
          container: 'bg-green-100 border-green-300 text-green-700',
          icon: 'bg-green-500 text-white',
          connector: 'bg-green-300'
        };
      case 'active':
        return {
          container: 'bg-blue-100 border-blue-300 text-blue-700 ring-2 ring-blue-200',
          icon: 'bg-blue-500 text-white animate-pulse',
          connector: 'bg-blue-300'
        };
      case 'error':
        return {
          container: 'bg-red-100 border-red-300 text-red-700',
          icon: 'bg-red-500 text-white',
          connector: 'bg-red-300'
        };
      default:
        return {
          container: 'bg-gray-100 border-gray-300 text-gray-500',
          icon: 'bg-gray-400 text-white',
          connector: 'bg-gray-300'
        };
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const classes = getStepClasses(step);
          const isLast = index === steps.length - 1;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center space-y-2">
                <div className={cn(
                  'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                  classes.container
                )}>
                  {step.icon || (
                    <span className="text-lg font-semibold">
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="text-center max-w-24">
                  <div className="text-sm font-medium">{step.label}</div>
                  {step.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
              
              {showConnectors && !isLast && (
                <div className={cn(
                  'flex-1 h-0.5 mx-4 transition-colors duration-200',
                  classes.connector
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressFlow;
