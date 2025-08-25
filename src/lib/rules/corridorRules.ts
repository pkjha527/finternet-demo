import type { 
  CorridorConfig, 
  CorridorId, 
  Party,
  TokenType
} from '../../types/demo';

// Corridor configurations based on the provided rules
export const CORRIDOR_CONFIGS: Record<CorridorId, CorridorConfig> = {
  USA_EU: {
    id: 'USA_EU',
    name: 'USA – EU',
    senderJurisdiction: 'USA',
    receiverJurisdiction: 'EU',
    isActive: true,
    rules: [
      {
        id: 'USA_EU_RULE_1',
        description: 'Can trade up to $250K per transaction',
        amountLimit: 250000,
        kycRequirements: {
          sender: 'Full',
          receiver: 'Full',
          description: 'Both sender and receiver must complete full KYC'
        },
        tokenRestrictions: {
          allowedTokens: ['USDC', 'USDT'],
          description: 'Only USDC and USDT stablecoins are allowed'
        },
        amlRequirements: {
          threshold: 50000,
          description: 'AML check required for transactions above $50K'
        }
      }
    ]
  },
  
  USA_SINGAPORE: {
    id: 'USA_SINGAPORE',
    name: 'USA – Singapore',
    senderJurisdiction: 'USA',
    receiverJurisdiction: 'Singapore',
    isActive: true,
    rules: [
      {
        id: 'USA_SG_RULE_1',
        description: 'Can trade only below $500K',
        amountLimit: 500000,
        kycRequirements: {
          sender: 'Full',
          receiver: 'None', // No specific KYC requirement for receiver
          description: 'Sender must have Full KYC in the USA'
        },
        tokenRestrictions: {
          allowedTokens: ['USDC'],
          inflowTokens: ['USDC'],
          outflowTokens: ['G20_APPROVED'],
          description: 'Only USDC inflows allowed into Singapore; Singapore allows outflow in any G20-approved coin'
        }
      }
    ]
  },
  
  EU_JAPAN: {
    id: 'EU_JAPAN',
    name: 'EU – Japan',
    senderJurisdiction: 'EU',
    receiverJurisdiction: 'Japan',
    isActive: false, // Cannot trade
    rules: [
      {
        id: 'EU_JP_RULE_1',
        description: 'Cannot trade',
        amountLimit: 0,
        kycRequirements: {
          sender: 'None',
          receiver: 'None',
          description: 'Trading blocked between EU and Japan'
        },
        tokenRestrictions: {
          allowedTokens: [],
          description: 'No tokens allowed for this corridor'
        },
        specialNotes: 'Trading is completely blocked between EU and Japan jurisdictions'
      }
    ]
  },
  
  SINGAPORE_JAPAN: {
    id: 'SINGAPORE_JAPAN',
    name: 'Singapore – Japan',
    senderJurisdiction: 'Singapore',
    receiverJurisdiction: 'Japan',
    isActive: true,
    rules: [
      {
        id: 'SG_JP_RULE_1',
        description: 'Can trade only for less than $100K',
        amountLimit: 100000,
        kycRequirements: {
          sender: 'Full',
          receiver: 'Basic',
          description: 'Singapore requires KYC for sender; Japan does not'
        },
        tokenRestrictions: {
          allowedTokens: ['USDT'],
          inflowTokens: ['USDT'],
          description: 'Only USDT allowed for inflow into Japan'
        },
        amlRequirements: {
          threshold: 50000,
          description: 'Transactions above $50K flagged for extra review'
        }
      }
    ]
  },
  
  EU_SINGAPORE: {
    id: 'EU_SINGAPORE',
    name: 'EU – Singapore',
    senderJurisdiction: 'EU',
    receiverJurisdiction: 'Singapore',
    isActive: true,
    rules: [
      {
        id: 'EU_SG_RULE_1',
        description: 'Max limit per transaction = $1M',
        amountLimit: 1000000,
        kycRequirements: {
          sender: 'Full',
          receiver: 'Full',
          description: 'Both parties require full KYC'
        },
        tokenRestrictions: {
          allowedTokens: ['USDC', 'USDT', 'LICENSED_STABLECOIN'],
          inflowTokens: ['USDC'],
          description: 'EU: Any stablecoin allowed; Singapore: Only USDC inflows allowed'
        },
        dualApproval: {
          required: true,
          jurisdictions: ['EU', 'Singapore'],
          description: 'Transactions above $250K require dual approval (EU & SG)'
        },
        amlRequirements: {
          threshold: 250000,
          description: 'Dual approval required for transactions above $250K'
        },
        specialNotes: 'Stablecoin must be issued by licensed entity'
      }
    ]
  }
};

// Helper function to determine corridor based on sender and receiver jurisdictions
export function determineCorridor(sender: Party, receiver: Party): CorridorId | null {
  const senderJurisdiction = sender.jurisdiction || sender.country;
  const receiverJurisdiction = receiver.jurisdiction || receiver.country;
  
  if (!senderJurisdiction || !receiverJurisdiction) {
    return null;
  }
  
  // Map country codes to jurisdictions
  const jurisdictionMap: Record<string, string> = {
    'US': 'USA',
    'USA': 'USA',
    'EU': 'EU',
    'DE': 'EU', // Germany
    'FR': 'EU', // France
    'IT': 'EU', // Italy
    'ES': 'EU', // Spain
    'NL': 'EU', // Netherlands
    'SG': 'Singapore',
    'Singapore': 'Singapore',
    'JP': 'Japan',
    'Japan': 'Japan'
  };
  
  const senderJur = jurisdictionMap[senderJurisdiction] || senderJurisdiction;
  const receiverJur = jurisdictionMap[receiverJurisdiction] || receiverJurisdiction;
  
  // Check for exact corridor match
  for (const [corridorId, config] of Object.entries(CORRIDOR_CONFIGS)) {
    if (config.senderJurisdiction === senderJur && config.receiverJurisdiction === receiverJur) {
      return corridorId as CorridorId;
    }
  }
  
  // Check for reverse corridor (receiver to sender)
  for (const [corridorId, config] of Object.entries(CORRIDOR_CONFIGS)) {
    if (config.senderJurisdiction === receiverJur && config.receiverJurisdiction === senderJur) {
      return corridorId as CorridorId;
    }
  }
  
  return null;
}

// Function to validate corridor-specific rules
export function validateCorridorRules(
  corridorId: CorridorId,
  sender: Party,
  receiver: Party,
  amount: number,
  tokenType: TokenType
): {
  compliant: boolean;
  reasons: Array<string>;
  appliedRules: Array<string>;
  metadata: Record<string, any>;
} {
  const corridor = CORRIDOR_CONFIGS[corridorId];
  if (!corridor.isActive) {
    return {
      compliant: false,
      reasons: [`Corridor ${corridor.name} is not active or does not exist`],
      appliedRules: [],
      metadata: { corridorId, isActive: false }
    };
  }
  
  const reasons: Array<string> = [];
  const appliedRules: Array<string> = [];
  const metadata: Record<string, any> = {
    corridorId,
    corridorName: corridor.name,
    amountLimit: 0,
    tokenRestrictions: [],
    amlRequired: false,
    dualApprovalRequired: false
  };
  
  // Apply all rules for the corridor
  for (const rule of corridor.rules) {
    appliedRules.push(rule.id);
    
    // Rule 1: Amount limits
    if (rule.amountLimit !== undefined) {
      metadata.amountLimit = rule.amountLimit;
      if (amount > rule.amountLimit) {
        reasons.push(`${rule.description} - Amount $${amount.toLocaleString()} exceeds limit $${rule.amountLimit.toLocaleString()}`);
      }
    }
    
    // Rule 2: KYC requirements
    // Check sender KYC requirement
    if (rule.kycRequirements.sender !== 'None' && sender.kycLevel !== rule.kycRequirements.sender) {
      reasons.push(`Sender KYC requirement: ${rule.kycRequirements.description} - Current: ${sender.kycLevel}, Required: ${rule.kycRequirements.sender}`);
    }
    // Check receiver KYC requirement (only if specified and not 'None')
    if (rule.kycRequirements.receiver !== 'None' && receiver.kycLevel !== rule.kycRequirements.receiver) {
      reasons.push(`Receiver KYC requirement: ${rule.kycRequirements.description} - Current: ${receiver.kycLevel}, Required: ${rule.kycRequirements.receiver}`);
    }
    
    // Rule 3: Token restrictions
    metadata.tokenRestrictions = rule.tokenRestrictions.allowedTokens;
    
    // Check if token is allowed
    if (!rule.tokenRestrictions.allowedTokens.includes(tokenType)) {
      reasons.push(`Token restriction: ${rule.tokenRestrictions.description} - ${tokenType} not allowed`);
    }
    
    // Check inflow/outflow restrictions if specified
    if (rule.tokenRestrictions.inflowTokens && !rule.tokenRestrictions.inflowTokens.includes(tokenType)) {
      reasons.push(`Inflow token restriction: ${tokenType} not allowed for inflow into ${corridor.receiverJurisdiction}`);
    }
    
    if (rule.tokenRestrictions.outflowTokens) {
      // Handle special token categories like G20_APPROVED
      if (rule.tokenRestrictions.outflowTokens.includes('G20_APPROVED')) {
        // USDC and USDT are G20-approved stablecoins
        if (!['USDC', 'USDT'].includes(tokenType)) {
          reasons.push(`Outflow token restriction: Only G20-approved stablecoins allowed for outflow from ${corridor.senderJurisdiction} - ${tokenType} not allowed`);
        }
      } else if (!rule.tokenRestrictions.outflowTokens.includes(tokenType)) {
        reasons.push(`Outflow token restriction: ${tokenType} not allowed for outflow from ${corridor.senderJurisdiction}`);
      }
    }
    
    // Rule 4: AML requirements
    if (rule.amlRequirements) {
      metadata.amlRequired = amount > rule.amlRequirements.threshold;
      if (metadata.amlRequired) {
        reasons.push(`AML requirement: ${rule.amlRequirements.description} - Amount $${amount.toLocaleString()} exceeds threshold $${rule.amlRequirements.threshold.toLocaleString()}`);
      }
    }
    
    // Rule 5: Dual approval requirements
    if (rule.dualApproval?.required) {
      metadata.dualApprovalRequired = true;
      if (amount > (rule.amlRequirements?.threshold || 0)) {
        reasons.push(`Dual approval required: ${rule.dualApproval.description}`);
      }
    }
    
    // Special notes
    if (rule.specialNotes) {
      metadata.specialNotes = rule.specialNotes;
    }
  }
  
  return {
    compliant: reasons.length === 0,
    reasons,
    appliedRules,
    metadata
  };
}

// Function to get corridor information for display
export function getCorridorInfo(corridorId: CorridorId) {
  return CORRIDOR_CONFIGS[corridorId];
}

// Function to get all active corridors
export function getActiveCorridors(): Array<CorridorConfig> {
  return Object.values(CORRIDOR_CONFIGS).filter(corridor => corridor.isActive);
}
