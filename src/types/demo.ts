export type KYCLevel = 'None' | 'Basic' | 'Full';
export type RiskScore = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ComplianceTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'BLOCKED';

export type Party = {
  label: 'Sender' | 'Receiver';
  wallet: string;         // hex address or email-id ref for demo
  kycLevel: KYCLevel;
  isSanctioned: boolean;
  country?: string;        // Country code for corridor rules
  jurisdiction?: string;   // Jurisdiction for regulatory compliance
};

// New Finternet ID system types
export type FinternetUser = {
  finternetId: string;        // "abhishek@finternet.ae"
  displayName: string;        // "Abhishek"
  country: string;            // "UAE"
  countryCode: string;        // "AE"
  flag: string;               // "🇦🇪"
  jurisdiction: string;       // "UAE"
  walletAddress: string;      // "0x1234...5678" (hidden from UI)
  kycLevel: KYCLevel;
  isSanctioned: boolean;
  complianceTier: ComplianceTier;
  riskScore: RiskScore;
};

export type FinternetParty = {
  label: 'Sender' | 'Receiver';
  finternetId: string;        // "abhishek@finternet.ae"
  user: FinternetUser;        // Full user data
  wallet: string;             // Resolved wallet address for transactions
};

export type IntentSide = 'USDC_TO_USDT' | 'USDT_TO_USDC';
export type Intent = {
  side: IntentSide;
  chainId: number;         // 1
  amount6: bigint;         // 6-decimals integer
  receiver: string;        // hex address
  purpose?: string;
};

// New types for corridor-based rules
export type CorridorId = 'USA_EU' | 'USA_SINGAPORE' | 'EU_JAPAN' | 'SINGAPORE_JAPAN' | 'EU_SINGAPORE';

export type TokenType = 'USDC' | 'USDT' | 'G20_APPROVED' | 'LICENSED_STABLECOIN';

export type CorridorRule = {
  id: string;
  description: string;
  amountLimit?: number;           // Maximum amount in USD
  kycRequirements: {
    sender: KYCLevel;
    receiver: KYCLevel;
    description: string;
  };
  tokenRestrictions: {
    allowedTokens: Array<TokenType>;
    inflowTokens?: Array<TokenType>;   // Specific tokens allowed for inflow
    outflowTokens?: Array<TokenType>;  // Specific tokens allowed for outflow
    description: string;
  };
  amlRequirements?: {
    threshold: number;            // Amount threshold for AML checks
    description: string;
  };
  dualApproval?: {
    required: boolean;
    jurisdictions: Array<string>;
    description: string;
  };
  specialNotes?: string;
};

export type CorridorConfig = {
  id: CorridorId;
  name: string;
  senderJurisdiction: string;
  receiverJurisdiction: string;
  rules: Array<CorridorRule>;
  isActive: boolean;
};

export type Decision = { 
  outcome: 'ALLOW' | 'REJECT'; 
  reasons: Array<string>;
  metadata?: Record<string, any>; // Additional backend metadata
  corridorValidation?: {
    corridorId: CorridorId;
    rulesApplied: Array<string>;
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT';
    amountLimit?: number;
    tokenRestrictions?: Array<string>;
    amlRequired?: boolean;
    dualApprovalRequired?: boolean;
  };
};

export type Quote = {
  provider: '0x';
  sellToken: string;
  buyToken: string;
  sellAmount: string;    // string int
  price: string;         // buy/sell
  guaranteedPrice?: string;
  to: string;
  data: string;
  allowanceTarget: string;
  estimatedGas?: number;
  sources?: Array<{ name: string; proportion: string }>;
};

export type ExecResult = {
  mode: 'SIMULATED' | 'EXECUTED';
  txHash?: string;
  quote?: Quote;
};

// Backend API types
export type RulesValidationRequest = {
  sender: Omit<Party, 'label'>;
  receiver: Omit<Party, 'label'>;
  timestamp: string;
  requestId: string;
};

export type RulesValidationResponse = {
  outcome: 'ALLOW' | 'REJECT';
  reasons: Array<string>;
  metadata?: Record<string, any>;
  validationId: string;
  processedAt: string;
};
