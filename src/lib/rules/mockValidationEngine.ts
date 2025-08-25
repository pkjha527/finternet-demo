import { determineCorridor, getCorridorInfo, validateCorridorRules } from './corridorRules';
import type { Decision, Party } from '../../types/demo';

// Type definitions
type KycLevel = 'Full' | 'Basic' | 'None';
type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ComplianceTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'BLOCKED';

// Type for wallet info with optional fields
interface WalletInfo {
  kycLevel: KycLevel;
  isSanctioned: boolean;
  riskScore: RiskScore;
  country: string;
  jurisdiction: string;
  lastVerified: string | null;
  verificationSource: string | null;
  complianceTier: ComplianceTier;
  kycReason?: string;
  sanctionsReason?: string;
  specialNotes?: string;
}

// Business rules configuration type
interface BusinessRules {
  kycRequirements: {
    minLevel: KycLevel;
    allowedLevels: Array<KycLevel>;
    description: string;
  };
  sanctionsPolicy: {
    allowed: boolean;
    description: string;
  };
  geographicRestrictions: {
    blockedCountries: Array<string>;
    description: string;
  };
  riskThresholds: {
    maxRiskScore: RiskScore;
    description: string;
  };
  amountLimits: {
    tier1Max: number;
    tier2Max: number;
    tier3Max: number;
    blockedMax: number;
  };
}

// Validation result types
interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

interface ComplianceMetadata {
  rulesVersion: string;
  rulesApplied: Array<string>;
  processingTime: number;
  validationId: string;
  senderKycStatus: 'PASSED' | 'FAILED';
  receiverKycStatus: 'PASSED' | 'FAILED' | 'UNKNOWN';
  senderSanctionsStatus: 'CLEAR' | 'FLAGGED';
  receiverSanctionsStatus: 'CLEAR' | 'FLAGGED' | 'UNKNOWN';
  senderGeographicStatus: 'ALLOWED' | 'BLOCKED';
  receiverGeographicStatus: 'ALLOWED' | 'BLOCKED' | 'UNKNOWN';
  senderRiskStatus: 'ACCEPTABLE' | 'EXCEEDED';
  receiverRiskStatus: 'ACCEPTABLE' | 'EXCEEDED' | 'UNKNOWN';
  senderDetails: {
    wallet: string;
    kycLevel: KycLevel;
    isSanctioned: boolean;
    complianceTier: ComplianceTier;
    lastVerified: string;
    verificationSource: string;
    note: string;
  };
  receiverDetails: {
    country: string;
    riskScore: RiskScore;
    complianceTier: ComplianceTier;
    lastVerified: string | null;
    verificationSource: string | null;
  } | null;
  overallRiskScore: RiskScore;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT';
  corridorInfo?: {
    id: string;
    name: string;
    isActive: boolean;
  };
  corridorValidation?: {
    corridorId: string;
    rulesApplied: Array<string>;
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT';
    amountLimit: number;
    tokenRestrictions: Array<string>;
    amlRequired: boolean;
    dualApprovalRequired: boolean;
  };
}

// Mock wallet database with predefined compliance statuses
const MOCK_WALLET_DATABASE: Record<string, WalletInfo> = {
  // Compliant wallets - Full KYC, no sanctions
  '0x1234567890123456789012345678901234567890': {
    kycLevel: 'Full',
    isSanctioned: false,
    riskScore: 'LOW',
    country: 'US',
    jurisdiction: 'USA',
    lastVerified: '2024-01-15T10:30:00.000Z',
    verificationSource: 'Onfido',
    complianceTier: 'TIER_1'
  },
  '0x2345678901234567890123456789012345678901': {
    kycLevel: 'Full',
    isSanctioned: false,
    riskScore: 'LOW',
    country: 'SG',
    jurisdiction: 'Singapore',
    lastVerified: '2024-01-14T15:45:00.000Z',
    verificationSource: 'Jumio',
    complianceTier: 'TIER_1'
  },
  '0x3456789012345678901234567890123456789012': {
    kycLevel: 'Full',
    isSanctioned: false,
    riskScore: 'MEDIUM',
    country: 'DE',
    jurisdiction: 'EU',
    lastVerified: '2024-01-13T09:20:00.000Z',
    verificationSource: 'Veriff',
    complianceTier: 'TIER_2'
  },
  
  // Non-compliant wallets - Various issues
  '0x4567890123456789012345678901234567890123': {
    kycLevel: 'Basic',
    isSanctioned: false,
    riskScore: 'HIGH',
    country: 'BR',
    jurisdiction: 'Brazil',
    lastVerified: '2024-01-10T14:15:00.000Z',
    verificationSource: 'Manual',
    complianceTier: 'TIER_3',
    kycReason: 'Incomplete documentation'
  },
  '0x5678901234567890123456789012345678901234': {
    kycLevel: 'None',
    isSanctioned: false,
    riskScore: 'HIGH',
    country: 'IN',
    jurisdiction: 'India',
    lastVerified: null,
    verificationSource: null,
    complianceTier: 'TIER_4',
    kycReason: 'No KYC verification attempted'
  },
  '0x6789012345678901234567890123456789012345': {
    kycLevel: 'Full',
    isSanctioned: true,
    riskScore: 'CRITICAL',
    country: 'RU',
    jurisdiction: 'Russia',
    lastVerified: '2024-01-12T11:00:00.000Z',
    verificationSource: 'Chainalysis',
    complianceTier: 'BLOCKED',
    sanctionsReason: 'OFAC Specially Designated Nationals List'
  },
  '0x7890123456789012345678901234567890123456': {
    kycLevel: 'Full',
    isSanctioned: true,
    riskScore: 'CRITICAL',
    country: 'IR',
    jurisdiction: 'Iran',
    lastVerified: '2024-01-11T16:30:00.000Z',
    verificationSource: 'Elliptic',
    complianceTier: 'BLOCKED',
    sanctionsReason: 'UN Security Council Sanctions'
  },
  
  // Edge cases
  '0x8901234567890123456789012345678901234567': {
    kycLevel: 'Basic',
    isSanctioned: true,
    riskScore: 'CRITICAL',
    country: 'NG',
    jurisdiction: 'Nigeria',
    lastVerified: '2024-01-09T13:45:00.000Z',
    verificationSource: 'Manual',
    complianceTier: 'BLOCKED',
    kycReason: 'Partial verification only',
    sanctionsReason: 'Local regulatory restrictions'
  },
  '0x9012345678901234567890123456789012345678': {
    kycLevel: 'Full',
    isSanctioned: false,
    riskScore: 'MEDIUM',
    country: 'JP',
    jurisdiction: 'Japan',
    lastVerified: '2024-01-08T08:00:00.000Z',
    verificationSource: 'Sumsub',
    complianceTier: 'TIER_2',
    specialNotes: 'Enhanced due diligence required'
  }
};

// Mock business rules configuration
const BUSINESS_RULES: BusinessRules = {
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
function getWalletInfo(walletAddress: string): WalletInfo | null {
  const normalizedAddress = walletAddress.toLowerCase();
  return MOCK_WALLET_DATABASE[normalizedAddress] ?? null;
}

// Helper function to check geographic restrictions
function checkGeographicRestrictions(country: string): ValidationResult {
  if (BUSINESS_RULES.geographicRestrictions.blockedCountries.includes(country)) {
    return {
      allowed: false,
      reason: `Country ${country} is restricted due to regulatory requirements`
    };
  }
  return { allowed: true };
}

// Helper function to check risk score
function checkRiskScore(riskScore: RiskScore): ValidationResult {
  const riskOrder: Array<RiskScore> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
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
  
  const receiverInfo = getWalletInfo(receiver.wallet);
  
  // Determine corridor for this transaction
  const corridorId = determineCorridor(sender, receiver);
  
  const reasons: Array<string> = [];
  const metadata: ComplianceMetadata = {
    rulesVersion: '1.0.0',
    rulesApplied: [],
    processingTime: Date.now(),
    validationId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    senderKycStatus: 'PASSED',
    receiverKycStatus: 'UNKNOWN',
    senderSanctionsStatus: 'CLEAR',
    receiverSanctionsStatus: 'UNKNOWN',
    senderGeographicStatus: 'ALLOWED',
    receiverGeographicStatus: 'UNKNOWN',
    senderRiskStatus: 'ACCEPTABLE',
    receiverRiskStatus: 'UNKNOWN',
    senderDetails: {
      wallet: sender.wallet,
      kycLevel: sender.kycLevel,
      isSanctioned: sender.isSanctioned,
      complianceTier: 'TIER_1',
      lastVerified: new Date().toISOString(),
      verificationSource: 'Wallet Connection',
      note: 'Connected wallet - treated as compliant'
    },
    receiverDetails: null,
    overallRiskScore: 'LOW',
    complianceStatus: 'COMPLIANT'
  };
  
  // Add corridor information if available
  if (corridorId) {
    const corridorInfo = getCorridorInfo(corridorId);
    metadata.corridorInfo = {
      id: corridorId,
      name: corridorInfo.name,
      isActive: corridorInfo.isActive
    };
    
    // Apply corridor-specific rules
    // For USDC_TO_USDT: Sender sends USDC, Receiver gets USDC (then converts to USDT)
    // For USDT_TO_USDC: Sender sends USDT, Receiver gets USDT (then converts to USDC)
    const transactionToken = 'USDC'; // This should come from the actual transaction
    const corridorValidation = validateCorridorRules(
      corridorId,
      sender,
      receiver,
      25, // Demo amount - in real scenario this would come from the transaction
      transactionToken
    );
    
    if (!corridorValidation.compliant) {
      reasons.push(...corridorValidation.reasons);
      metadata.corridorValidation = {
        corridorId,
        rulesApplied: corridorValidation.appliedRules,
        complianceStatus: 'NON_COMPLIANT',
        amountLimit: corridorValidation.metadata.amountLimit,
        tokenRestrictions: corridorValidation.metadata.tokenRestrictions,
        amlRequired: corridorValidation.metadata.amlRequired,
        dualApprovalRequired: corridorValidation.metadata.dualApprovalRequired
      };
    } else {
      metadata.corridorValidation = {
        corridorId,
        rulesApplied: corridorValidation.appliedRules,
        complianceStatus: 'COMPLIANT',
        amountLimit: corridorValidation.metadata.amountLimit,
        tokenRestrictions: corridorValidation.metadata.tokenRestrictions,
        amlRequired: corridorValidation.metadata.amlRequired,
        dualApprovalRequired: corridorValidation.metadata.dualApprovalRequired
      };
    }
    
    metadata.rulesApplied.push(`Corridor Rules: ${corridorInfo.name}`);
  } else {
    metadata.rulesApplied.push('No corridor identified - using basic compliance rules');
  }
  
  // Rule 1: KYC Level Enforcement
  metadata.rulesApplied.push('KYC Level Enforcement');
  
  // Sender validation (connected wallet assumption)
  if (sender.kycLevel !== 'Full' || sender.isSanctioned) {
    reasons.push('Sender wallet compliance check failed.');
    metadata.senderKycStatus = 'FAILED';
    metadata.senderSanctionsStatus = sender.isSanctioned ? 'FLAGGED' : 'CLEAR';
  }
  
  // Receiver validation
  if (receiverInfo === null) {
    reasons.push('Receiver wallet not found in compliance database');
    metadata.receiverKycStatus = 'FAILED';
  } else {
    // Set receiver details
    metadata.receiverDetails = {
      country: receiverInfo.country,
      riskScore: receiverInfo.riskScore,
      complianceTier: receiverInfo.complianceTier,
      lastVerified: receiverInfo.lastVerified,
      verificationSource: receiverInfo.verificationSource
    };

    // KYC Level Check
    if (receiverInfo.kycLevel !== BUSINESS_RULES.kycRequirements.minLevel) {
      const reason = `Receiver KYC level (${receiverInfo.kycLevel}) below required (${BUSINESS_RULES.kycRequirements.minLevel})`;
      reasons.push(reason);
      metadata.receiverKycStatus = 'FAILED';
    } else {
      metadata.receiverKycStatus = 'PASSED';
    }

    // Rule 2: Sanctions Screening
    metadata.rulesApplied.push('Sanctions & PEP Screen');
    
    if (receiverInfo.isSanctioned) {
      reasons.push(`Receiver is sanctioned: ${receiverInfo.sanctionsReason || 'Unknown reason'}`);
      metadata.receiverSanctionsStatus = 'FLAGGED';
    } else {
      metadata.receiverSanctionsStatus = 'CLEAR';
    }

    // Rule 3: Geographic Restrictions
    metadata.rulesApplied.push('Geographic Restrictions');
    
    const geoCheck = checkGeographicRestrictions(receiverInfo.country);
    if (!geoCheck.allowed) {
      reasons.push(`Receiver ${geoCheck.reason}`);
      metadata.receiverGeographicStatus = 'BLOCKED';
    } else {
      metadata.receiverGeographicStatus = 'ALLOWED';
    }

    // Rule 4: Risk Score Assessment
    metadata.rulesApplied.push('Risk Score Assessment');
    
    const riskCheck = checkRiskScore(receiverInfo.riskScore);
    if (!riskCheck.allowed) {
      reasons.push(`Receiver ${riskCheck.reason}`);
      metadata.receiverRiskStatus = 'EXCEEDED';
    } else {
      metadata.receiverRiskStatus = 'ACCEPTABLE';
    }

    // Calculate overall risk score
    metadata.overallRiskScore = receiverInfo.riskScore;
  }

  // Set final compliance status
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
    const sanctionsReason = info.sanctionsReason || 'Unknown reason';
    return `🚫 SANCTIONED - ${info.country} (${sanctionsReason})`;
  }
  
  if (info.kycLevel === 'None') {
    return `❌ NO KYC - ${info.country} (No verification)`;
  }
  
  if (info.kycLevel === 'Basic') {
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