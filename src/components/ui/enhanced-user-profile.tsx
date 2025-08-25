
import { cn } from '../../lib/utils';
import { ComplianceStatus } from './compliance-status';
import type { FinternetUser } from '../../types/demo';

interface EnhancedUserProfileProps {
  user: FinternetUser;
  label?: 'Sender' | 'Receiver';
  showWallet?: boolean;
  className?: string;
  variant?: 'default' | 'elevated' | 'gradient';
}

export function EnhancedUserProfile({
  user,
  label,
  showWallet = false,
  className = "",
  variant = 'default'
}: EnhancedUserProfileProps) {
  const getComplianceStatus = () => {
    if (user.complianceTier === 'BLOCKED') return 'blocked';
    if (user.isSanctioned) return 'error';
    if (user.kycLevel === 'Basic') return 'warning';
    return 'compliant';
  };

  const getComplianceLabel = () => {
    if (user.complianceTier === 'BLOCKED') return 'Blocked';
    if (user.isSanctioned) return 'Sanctioned';
    if (user.kycLevel === 'Basic') return 'Basic KYC';
    return 'Fully Compliant';
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'elevated':
        return 'shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200';
      case 'gradient':
        return 'bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-md';
      default:
        return 'shadow-sm hover:shadow-md';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={cn(
      'bg-white border rounded-xl p-6 transition-all duration-200',
      getVariantClasses(),
      className
    )}>
      {/* Header with Flag and Basic Info */}
      <div className="flex items-start space-x-4 mb-6">
        <div className="text-5xl drop-shadow-sm">{user.flag}</div>
        <div className="flex-1">
          {label && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
              {label}
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {user.displayName}
          </h3>
          <p className="text-sm text-gray-600 font-mono">
            {user.finternetId}
          </p>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="mb-6">
        <ComplianceStatus
          status={getComplianceStatus()}
          label={getComplianceLabel()}
          description={`${user.jurisdiction} • ${user.country}`}
          size="lg"
        />
      </div>

      {/* Risk and Tier Information */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Risk Level</div>
          <div className={cn(
            'text-sm font-semibold px-2 py-1 rounded-full border',
            getRiskColor(user.riskScore)
          )}>
            {user.riskScore}
          </div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Compliance Tier</div>
          <div className="text-sm font-semibold text-gray-700">
            {user.complianceTier}
          </div>
        </div>
      </div>

      {/* Jurisdiction Details */}
      <div className="space-y-3 text-sm text-gray-600 mb-6">
        <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
          <span>Country:</span>
          <span className="font-medium">{user.country}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
          <span>Jurisdiction:</span>
          <span className="font-medium">{user.jurisdiction}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
          <span>Country Code:</span>
          <span className="font-medium">{user.countryCode}</span>
        </div>
      </div>

      {/* Wallet Address (Hidden by default) */}
      {showWallet && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-2 font-medium">Wallet Address</div>
          <div className="text-sm font-mono text-gray-700 break-all bg-white p-2 rounded border">
            {user.walletAddress}
          </div>
        </div>
      )}

      {/* Compliance Summary */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="text-xs text-blue-600 font-semibold mb-2 uppercase tracking-wide">
          Compliance Summary
        </div>
        <div className="text-sm text-blue-700">
          {user.complianceTier === 'BLOCKED' ? (
            <span className="text-red-600 font-medium">❌ This user is blocked from transactions</span>
          ) : user.kycLevel === 'Full' && !user.isSanctioned ? (
            <span className="text-green-600 font-medium">✅ Fully compliant for all corridors</span>
          ) : user.kycLevel === 'Basic' && !user.isSanctioned ? (
            <span className="text-yellow-600 font-medium">⚠️ Basic KYC - some corridors restricted</span>
          ) : (
            <span className="text-red-600 font-medium">❌ Compliance issues detected</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default EnhancedUserProfile;
