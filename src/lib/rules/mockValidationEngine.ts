import type { Decision, Party } from '../../types/demo';

// Mock wallet database with predefined compliance statuses
const MOCK_WALLET_DATABASE = {
  // Compliant wallets - Full KYC, no sanctions
  '0x1234567890123456789012345678901234567890': {
    kycLevel: 'Full' as const,
    isSanctioned: false,
    riskScore: 'LOW',
    country: 'US',
    lastVerified: '2024-01-15T10:30:00.000Z',
    verificationSource: 'Onfido',
    complianceTier: 'TIER_1'
  },
  '0x2345678901234567890123456789012345678901': {
    kycLevel: 'Full' as const,
    isSanctioned: false,
    riskScore: 'LOW',
    country: 'CA',
    lastVerified: '2024-01-14T15:45:00.000Z',
    verificationSource: 'Jumio',
    complianceTier: 'TIER_1'
  },
  '0x3456789012345678901234567890123456789012': {
    kycLevel: 'Full' as const,
    isSanctioned: false,
    riskScore: 'MEDIUM',
    country: 'UK',
    lastVerified: '2024-01-13T09:20:00.000Z',
    verificationSource: 'Veriff',
    complianceTier: 'TIER_2'
  },
  
  // Non-compliant wallets - Various issues
  '0x4567890123456789012345678901234567890123': {
    kycLevel: 'Basic' as const,
    isSanctioned: false,
    riskScore: 'HIGH',
    country: 'BR',
    lastVerified: '2024-01-10T14:15:00.000Z',
    verificationSource: 'Manual',
    complianceTier: 'TIER_3',
    kycReason: 'Incomplete documentation'
  },
  '0x5678901234567890123456789012345678901234': {
    kycLevel: 'None' as const,
    isSanctioned: false,
    riskScore: 'HIGH',
    country: 'IN',
    lastVerified: null,
    verificationSource: null,
    complianceTier: 'TIER_4',
    kycReason: 'No KYC verification attempted'
  },
  '0x6789012345678901234567890123456789012345': {
    kycLevel: 'Full' as const,
    isSanctioned: true,
    riskScore: 'CRITICAL',
    country: 'RU',
    lastVerified: '2024-01-12T11:00:00.000Z',
    verificationSource: 'Chainalysis',
    complianceTier: 'BLOCKED',
    sanctionsReason: 'OFAC Specially Designated Nationals List'
  },
  '0x7890123456789012345678901234567890123456': {
    kycLevel: 'Full' as const,
    isSanctioned: true,
    riskScore: 'CRITICAL',
    country: 'IR',
    lastVerified: '2024-01-11T16:30:00.000Z',
    verificationSource: 'Elliptic',
    complianceTier: 'BLOCKED',
    sanctionsReason: 'UN Security Council Sanctions'
  },
  
  // Edge cases
  '0x8901234567890123456789012345678901234567': {
    kycLevel: 'Basic' as const,
    isSanctioned: true,
    riskScore: 'CRITICAL',
    country: 'NG',
    lastVerified: '2024-01-09T13:45:00.000Z',
    verificationSource: 'Manual',
    complianceTier: 'BLOCKED',
    kycReason: 'Partial verification only',
    sanctionsReason: 'Local regulatory restrictions'
  },
  '0x9012345678901234567890123456789012345678': {
    kycLevel: 'Full' as const,
    isSanctioned: false,
    riskScore: 'MEDIUM',
    country: 'SG',
    lastVerified: '2024-01-08T08:00:00.000Z',
    verificationSource: 'Sumsub',
    complianceTier: 'TIER_2',
    specialNotes: 'Enhanced due diligence required'
  }
} as const;

// Type for wallet info with optional fields
type WalletInfo = typeof MOCK_WALLET_DATABASE[keyof typeof MOCK_WALLET_DATABASE];

// Mock business rules configuration
const BUSINESS_RULES = {
  kycRequirements: {
    minLevel: 'Full',
    allowedLevels: ['Full'],
    description: 'Only Full KYC verification is accepted'
  },
  sanctionsPolicy: {
    allowed: false,
    description: 'No sanctioned entities allowed'
  },
  geographicRestrictions: {
    blockedCountries: ['RU', 'IR', 'KP', 'CU'],
    description: 'Certain countries are restricted'
  },
  riskThresholds: {
    maxRiskScore: 'MEDIUM',
    description: 'Maximum acceptable risk score is MEDIUM'
  },
  amountLimits: {
    tier1Max: 100000, // $100k for Tier 1
    tier2Max: 50000,  // $50k for Tier 2
    tier3Max: 10000,  // $10k for Tier 3
    blockedMax: 0     // $0 for blocked
  }
};

// Helper function to get wallet info
function getWalletInfo(walletAddress: string) {
  const normalizedAddress = walletAddress.toLowerCase();
  return MOCK_WALLET_DATABASE[normalizedAddress as keyof typeof MOCK_WALLET_DATABASE] || null;
}

// Helper function to check geographic restrictions
function checkGeographicRestrictions(country: string): { allowed: boolean; reason?: string } {
  if (BUSINESS_RULES.geographicRestrictions.blockedCountries.includes(country)) {
    return {
      allowed: false,
      reason: `Country ${country} is restricted due to regulatory requirements`
    };
  }
  return { allowed: true };
}

// Helper function to check risk score
function checkRiskScore(riskScore: string): { allowed: boolean; reason?: string } {
  const riskOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const maxAllowedIndex = riskOrder.indexOf(BUSINESS_RULES.riskThresholds.maxRiskScore);
  const currentIndex = riskOrder.indexOf(riskScore);
  
  if (currentIndex > maxAllowedIndex) {
    return {
      allowed: false,
      reason: `Risk score ${riskScore} exceeds maximum allowed ${BUSINESS_RULES.riskThresholds.maxRiskScore}`
    };
  }
  return { allowed: true };
}

// Main validation function
export async function evaluatePreTx(sender: Party, receiver: Party): Promise<Decision> {
  // Simulate API processing delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
  
  const senderInfo = getWalletInfo(sender.wallet);
  const receiverInfo = getWalletInfo(receiver.wallet);
  
  const reasons: Array<string> = [];
  const metadata: Record<string, any> = {
    rulesVersion: '1.0.0',
    rulesApplied: [],
    processingTime: Date.now(),
    validationId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  // Rule 1: KYC Level Enforcement
  metadata.rulesApplied.push('KYC Level Enforcement');
  
  // Sender is always treated as compliant (connected wallet assumption)
  if (sender.kycLevel !== 'Full' || sender.isSanctioned) {
    reasons.push('Sender wallet compliance check failed.');
    metadata.senderKycStatus = 'FAILED';
  } else {
    metadata.senderKycStatus = 'PASSED';
  }
  
  // Receiver validation from database
  if (!receiverInfo || receiverInfo.kycLevel !== BUSINESS_RULES.kycRequirements.minLevel) {
    const reason = receiverInfo 
      ? `Receiver KYC level (${receiverInfo.kycLevel}) below required (${BUSINESS_RULES.kycRequirements.minLevel})`
      : 'Receiver wallet not found in compliance database';
    reasons.push(reason);
    metadata.receiverKycStatus = 'FAILED';
  } else {
    metadata.receiverKycStatus = 'PASSED';
  }
  
  // Rule 2: Sanctions Screening
  metadata.rulesApplied.push('Sanctions & PEP Screen');
  
  // Sender sanctions (always clear for connected wallet)
  if (sender.isSanctioned) {
    reasons.push('Sender is sanctioned: Connected wallet flagged');
    metadata.senderSanctionsStatus = 'FLAGGED';
  } else {
    metadata.senderSanctionsStatus = 'CLEAR';
  }
  
  // Receiver sanctions from database
  if (receiverInfo?.isSanctioned) {
    reasons.push(`Receiver is sanctioned: ${receiverInfo.sanctionsReason || 'Unknown reason'}`);
    metadata.receiverSanctionsStatus = 'FLAGGED';
  } else {
    metadata.receiverSanctionsStatus = 'CLEAR';
  }
  
  // Rule 3: Geographic Restrictions
  metadata.rulesApplied.push('Geographic Restrictions');
  
  // Sender geographic (always allowed for connected wallet)
  metadata.senderGeographicStatus = 'ALLOWED';
  
  // Receiver geographic from database
  if (receiverInfo) {
    const geoCheck = checkGeographicRestrictions(receiverInfo.country);
    if (!geoCheck.allowed) {
      reasons.push(`Receiver ${geoCheck.reason}`);
      metadata.receiverGeographicStatus = 'BLOCKED';
    } else {
      metadata.receiverGeographicStatus = 'ALLOWED';
    }
  }
  
  // Rule 4: Risk Score Assessment
  metadata.rulesApplied.push('Risk Score Assessment');
  
  // Sender risk (always low for connected wallet)
  metadata.senderRiskStatus = 'ACCEPTABLE';
  
  // Receiver risk from database
  if (receiverInfo) {
    const riskCheck = checkRiskScore(receiverInfo.riskScore);
    if (!riskCheck.allowed) {
      reasons.push(`Receiver ${riskCheck.reason}`);
      metadata.receiverRiskStatus = 'EXCEEDED';
    } else {
      metadata.receiverRiskStatus = 'ACCEPTABLE';
    }
  }
  
  // Additional metadata
  metadata.senderDetails = {
    wallet: sender.wallet,
    kycLevel: sender.kycLevel,
    isSanctioned: sender.isSanctioned,
    complianceTier: 'TIER_1', // Connected wallet assumption
    lastVerified: new Date().toISOString(),
    verificationSource: 'Wallet Connection',
    note: 'Connected wallet - treated as compliant'
  };
  
  metadata.receiverDetails = receiverInfo ? {
    country: receiverInfo.country,
    riskScore: receiverInfo.riskScore,
    complianceTier: receiverInfo.complianceTier,
    lastVerified: receiverInfo.lastVerified,
    verificationSource: receiverInfo.verificationSource
  } : null;
  
  // Calculate overall risk score
  const riskScores = [receiverInfo?.riskScore].filter(Boolean);
  if (riskScores.length > 0) {
    const riskOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const maxRiskIndex = Math.max(...riskScores.map(score => riskOrder.indexOf(score)));
    metadata.overallRiskScore = riskOrder[maxRiskIndex];
  } else {
    metadata.overallRiskScore = 'LOW'; // Default to low if no receiver risk data
  }
  
  metadata.complianceStatus = reasons.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT';
  
  return {
    outcome: reasons.length === 0 ? 'ALLOW' : 'REJECT',
    reasons,
    metadata
  };
}

// Helper function to get available test wallets
export function getAvailableTestWallets() {
  return Object.entries(MOCK_WALLET_DATABASE).map(([address, info]) => ({
    address,
    kycLevel: info.kycLevel,
    isSanctioned: info.isSanctioned,
    riskScore: info.riskScore,
    country: info.country,
    complianceTier: info.complianceTier,
    description: getWalletDescription(info)
  }));
}

// Helper function to generate wallet descriptions
function getWalletDescription(info: WalletInfo): string {
  if (info.isSanctioned) {
    const sanctionsReason = 'sanctionsReason' in info ? info.sanctionsReason : 'Unknown reason';
    return `🚫 SANCTIONED - ${info.country} (${sanctionsReason})`;
  }
  
  if (info.kycLevel === 'None') {
    const kycReason = 'kycReason' in info ? info.kycReason : 'No verification';
    return `❌ NO KYC - ${info.country} (${kycReason})`;
  }
  
  if (info.kycLevel === 'Basic') {
    const kycReason = 'kycReason' in info ? info.kycReason : 'Basic verification';
    return `⚠️ BASIC KYC - ${info.country} (${info.riskScore})`;
  }
  
  if (info.riskScore === 'CRITICAL') {
    return `🔴 HIGH RISK - ${info.country} (${info.riskScore})`;
  }
  
  if (info.riskScore === 'HIGH') {
    return `🟠 MEDIUM RISK - ${info.country} (${info.riskScore})`;
  }
  
  if (info.riskScore === 'MEDIUM') {
    return `🟡 LOW RISK - ${info.country} (${info.riskScore})`;
  }
  
  return `🟢 COMPLIANT - ${info.country} (${info.riskScore})`;
}
