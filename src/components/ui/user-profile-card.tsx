import React from 'react';
import type { FinternetUser } from '../../types/demo';

interface UserProfileCardProps {
  user: FinternetUser;
  label?: 'Sender' | 'Receiver';
  showWallet?: boolean;
  className?: string;
}

export function UserProfileCard({
  user,
  label,
  showWallet = false,
  className = ""
}: UserProfileCardProps) {
  const getComplianceColor = (tier: string) => {
    switch (tier) {
      case 'TIER_1': return 'bg-green-100 text-green-800 border-green-200';
      case 'TIER_2': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TIER_3': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'TIER_4': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'BLOCKED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`user-profile-card bg-white border rounded-lg p-4 ${className}`}>
      {/* Header with Flag and Basic Info */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="text-4xl">{user.flag}</div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            {label && (
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {label}
              </span>
            )}
            <span className="text-sm font-medium text-gray-600">
              {user.jurisdiction}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {user.displayName}
          </h3>
          <p className="text-sm text-gray-600 font-mono">
            {user.finternetId}
          </p>
        </div>
      </div>

      {/* Compliance Status Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">KYC Level</div>
          <div className={`text-sm font-medium ${
            user.kycLevel === 'Full' ? 'text-green-600' :
            user.kycLevel === 'Basic' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {user.kycLevel}
          </div>
        </div>
        
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Sanctions</div>
          <div className={`text-sm font-medium ${
            user.isSanctioned ? 'text-red-600' : 'text-green-600'
          }`}>
            {user.isSanctioned ? 'Flagged' : 'Clear'}
          </div>
        </div>
      </div>

      {/* Compliance Tier and Risk Score */}
      <div className="flex space-x-2 mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getComplianceColor(user.complianceTier)}`}>
          {user.complianceTier}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(user.riskScore)}`}>
          {user.riskScore} Risk
        </span>
      </div>

      {/* Country and Jurisdiction Details */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Country:</span>
          <span className="font-medium">{user.country}</span>
        </div>
        <div className="flex justify-between">
          <span>Jurisdiction:</span>
          <span className="font-medium">{user.jurisdiction}</span>
        </div>
        <div className="flex justify-between">
          <span>Country Code:</span>
          <span className="font-medium">{user.countryCode}</span>
        </div>
      </div>

      {/* Wallet Address (Hidden by default) */}
      {showWallet && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Wallet Address</div>
          <div className="text-sm font-mono text-gray-700 break-all">
            {user.walletAddress}
          </div>
        </div>
      )}

      {/* Compliance Summary */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-xs text-blue-600 font-medium mb-1">Compliance Summary</div>
        <div className="text-sm text-blue-700">
          {user.complianceTier === 'BLOCKED' ? (
            <span className="text-red-600">❌ This user is blocked from transactions</span>
          ) : user.kycLevel === 'Full' && !user.isSanctioned ? (
            <span className="text-green-600">✅ Fully compliant for all corridors</span>
          ) : user.kycLevel === 'Basic' && !user.isSanctioned ? (
            <span className="text-yellow-600">⚠️ Basic KYC - some corridors restricted</span>
          ) : (
            <span className="text-red-600">❌ Compliance issues detected</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfileCard;
