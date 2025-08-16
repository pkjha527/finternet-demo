export type KYCLevel = 'None' | 'Basic' | 'Full';
export type Party = {
  label: 'Sender' | 'Receiver';
  wallet: string;         // hex address or email-id ref for demo
  kycLevel: KYCLevel;
  isSanctioned: boolean;
};
export type IntentSide = 'USDC_TO_USDT' | 'USDT_TO_USDC';
export type Intent = {
  side: IntentSide;
  chainId: number;         // 1
  amount6: bigint;         // 6-decimals integer
  receiver: string;        // hex address
  purpose?: string;
};

export type Decision = { 
  outcome: 'ALLOW' | 'REJECT'; 
  reasons: Array<string>;
  metadata?: Record<string, any>; // Additional backend metadata
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
