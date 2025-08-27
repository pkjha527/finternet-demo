// Bungee.exchange API service
const BUNGEE_API_BASE_URL = 'https://dedicated-backend.bungee.exchange';
const BUNGEE_API_KEY = 'T69BGC3Bzc61JDvOLPMtiNw3UcKVeD408BgVh8f0';

export interface BungeeQuoteRequest {
  userAddress: string;
  receiverAddress: string;
  originChainId: number;
  destinationChainId: number;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  slippageTolerance: number;
  enableManual: boolean;
}

export interface BungeeQuotesErrorResponse {
  error: string;
  message: string;
}

export interface BungeeQuotesSuccessResponse {
  success: boolean;
  statusCode: number;
  result: {
    originChainId: number;
    destinationChainId: number;
    userAddress: string;
    receiverAddress: string;
    input: BungeeQuoteInput;
    destinationExec: null;
    autoRoute?: BungeeAutoQuoteResponse;
    manualRoutes: Array<BungeeManualQuoteResponse>;
  };
}

export interface BungeeQuoteInput{
  token: {
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    icon: string;
  };
  amount: string;
  priceInUsd: number;
  valueInUsd: number;
}

export interface BungeeAutoOutputResponse extends BungeeQuoteInput{
  minAmountOut: string;
  amount: string;
  effectiveReceivedInUsd: number;
  requestType: string;
}

export interface AutoApprovalData{
  spenderAddress: string;
  amount: string;
  tokenAddress: string;
  userAddress: string;
}

export interface AutoBungeeSignTypedData{
  domain: {
    name: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    PermitWitnessTransferFrom: Array<{
      name: string;
      type: string;
    }>;
    TokenPermissions: Array<{
      name: string;
      type: string;
    }>;
    Request: Array<{
      name: string;
      type: string;
    }>;
    BasicRequest: Array<{
      name: string;
      type: string;
    }>;
  };
  values: {
    permitted: {
      token: string;
      amount: string;
    };
    spender: string;
    nonce: string;
    deadline: number;
    witness: {
      basicReq: {
        originChainId: number;
        destinationChainId: number;
        deadline: number;
        nonce: string;
        sender: string;
        receiver: string;
        delegate: string;
        bungeeGateway: string;
        switchboardId: number;
        inputToken: string;
        inputAmount: string;
        outputToken: string;
        minOutputAmount: string;
        refuelAmount: string;
      };
      swapOutputToken: string;
      minSwapOutput: string;
      metadata: string;
      affiliateFees: string;
      minDestGas: string;
      destinationPayload: string;
      exclusiveTransmitter: string;
    }
  }
}

export interface AutoBungeeRouteDetails{
  name: string;
  logoURI: string;
  routeFee: null;
  dexDetails: null;
}

export interface BungeeAutoApprovalData{
  spenderAddress: string;
  amount: string;
  tokenAddress: string;
  userAddress: string;
}

export interface BungeeAutoQuoteResponse{
  userOp: string;
  requestHash: string;
  output: BungeeAutoOutputResponse;
  requestType: string;
  approvalData: BungeeAutoApprovalData;
  affiliateFee: null;
  signTypedData: AutoBungeeSignTypedData;
  gasFee: null;
  slippage: number;
  suggestedClientSlippage: number;
  txData: null;
  estimatedTime: number;
  routeDetails: AutoBungeeRouteDetails;
  refuel: null;
  quoteId: string;
  quoteExpiry: number;
}

export interface BungeeManualQuoteOutput{
  token: {
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    icon: string;
  }
  amount: string;
  priceInUsd: number;
  valueInUsd: number;
  minAmountOut: string;
  effectiveReceivedInUsd: number;
}

export interface BungeeManualQuoteGasFee{
  gasToken: {
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    icon: string;
    chainAgnosticId: string | null;
  };
  gasLimit: number;
  gasPrice: number;
  estimatedFee: number;
  feeInUsd: number;
}

export interface BungeeManualQuoteRouteDetails{
  name: string;
  logoURI: string;
  routeFee: {
  token: {
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI: string;
    icon: string;
    chainAgnosticId: string | null;
  };
  amount: string;
  feeInUsd: number;
  priceInUsd: number;
  },
  dexDetails: {
    protocol: {
      name: string;
      icon: string;
      displayName: string;
    },
    minAmountOut: string;
    outputTokenAddress: string;
    inputTokenAddress: string;
    amountOut: string;
    slippage: number;
    }
}

export interface BungeeManualQuoteResponse{
  quoteId: string;
  quoteExpiry: number;
  output: BungeeManualQuoteOutput;
  affiliateFee: null;
  gasFee: BungeeManualQuoteGasFee;
  slippage: number;
  suggestedClientSlippage: number;
  estimatedTime: number;
  routeDetails: BungeeManualQuoteRouteDetails;
  refuel: null;
}

export interface BungeeBuildTxRequest {
  quoteId: string;
}

export interface BungeeBuildTxResponse {
  success: boolean;
  statusCode: number;
  result: {
    approvalData?: {
      spenderAddress: string;
      amount: string;
      tokenAddress: string;
      userAddress: string;
    };
    txData: {
      data: string;
      to: string;
      chainId: number;
      value: string;
    };
    userOp: string;
  };
}

export class BungeeApiService {
  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BUNGEE_API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BUNGEE_API_KEY,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Bungee API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get quotes from Bungee.exchange
   */
  static async getQuotes(request: BungeeQuoteRequest): Promise<BungeeQuotesSuccessResponse | BungeeQuotesErrorResponse> {
    const queryParams = new URLSearchParams({
      userAddress: request.userAddress,
      receiverAddress: request.receiverAddress,
      originChainId: request.originChainId.toString(),
      destinationChainId: request.destinationChainId.toString(),
      inputToken: request.inputToken,
      outputToken: request.outputToken,
      inputAmount: request.inputAmount,
      slippageTolerance: request.slippageTolerance.toString(),
      enableManual: request.enableManual.toString(),
    });

    return this.makeRequest<BungeeQuotesSuccessResponse | BungeeQuotesErrorResponse>(`/api/v1/bungee/quote?${queryParams}`);
  }

  /**
   * Build transaction from quote ID
   */
  static async buildTransaction(request: BungeeBuildTxRequest): Promise<BungeeBuildTxResponse> {
    return this.makeRequest<BungeeBuildTxResponse>(`/api/v1/bungee/build-tx?quoteId=${request.quoteId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
  }



  /**
   * Find the best quote from available Bungee quotes based on scoring formula
   * Only considers manual routes due to slippage concerns with auto routes
   */
  static findBestQuote(
    quotes: BungeeQuotesSuccessResponse,
    userWeights: {
      alpha: number;    // Cost weight
      beta: number;     // Time to finality weight
      gamma: number;    // Liquidity weight (based on output amount)
      delta: number;    // Reliability weight (based on slippage)
      theta: number;    // Historical performance weight (based on route reputation)
    }
  ): { quote: BungeeManualQuoteResponse; type: 'manual'; score: number } | null {
    const allQuotes: Array<{
      quote: BungeeManualQuoteResponse;
      type: 'manual';
      score: number;
    }> = [];

    // Only score manual routes due to slippage concerns with auto routes
    if (quotes.result.manualRoutes.length > 0) {
      quotes.result.manualRoutes.forEach(manualQuote => {
        const manualScore = this.calculateQuoteScore(manualQuote, userWeights, 'manual');
        allQuotes.push({
          quote: manualQuote,
          type: 'manual',
          score: manualScore
        });
      });
    }

    if (allQuotes.length === 0) {
      return null;
    }

    // Find the quote with the highest score
    const bestQuote = allQuotes.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return bestQuote;
  }

  /**
   * Calculate score for a quote using the efficiency formula
   * Only handles manual routes due to slippage concerns
   */
  private static calculateQuoteScore(
    quote: BungeeManualQuoteResponse | BungeeAutoQuoteResponse,
    userWeights: {
      alpha: number;
      beta: number;
      gamma: number;
      delta: number;
      theta: number;
    },
    type: 'manual' | 'auto'
  ): number {
    // Only handle manual routes due to slippage concerns
    if (type !== 'manual') {
      return 0; // Auto routes get 0 score
    }

    const manualQuote = quote as BungeeManualQuoteResponse;
    
    // Extract scoring factors for manual routes
    const cost = manualQuote.gasFee.feeInUsd || 0;
          const timeToFinality = manualQuote.estimatedTime || 1800; // Default to 30 minutes (1800 seconds)
    
    // Calculate liquidity based on output amount vs input amount
    const inputValue = parseFloat(manualQuote.output.valueInUsd.toString());
    const outputValue = parseFloat(manualQuote.output.effectiveReceivedInUsd.toString());
    const liquidity = Math.min(1.0, outputValue / inputValue);
    
    // Calculate reliability based on slippage (lower slippage = higher reliability)
    const slippage = manualQuote.slippage || 0;
    const reliability = Math.max(0.1, 1.0 - (slippage / 100));
    
    // Historical performance based on route details reputation
    const routeName = manualQuote.routeDetails.name.toLowerCase();
    let historical = 0.7; // Default for unknown routes
    if (routeName.includes('stargate') || routeName.includes('layerzero')) {
      historical = 0.9;
    } else if (routeName.includes('axelar') || routeName.includes('wormhole')) {
      historical = 0.8;
    }

    // Normalize values to prevent division by zero and extreme values
    const normalizedCost = Math.max(0.01, cost / 100); // Normalize to $100 max
    const normalizedTime = Math.max(0.01, timeToFinality / 60); // Normalize to 60 minutes max
    
    // Calculate score using the efficiency formula
    const score = 
      userWeights.alpha * (1 / normalizedCost) +
      userWeights.beta * (1 / normalizedTime) +
      userWeights.gamma * liquidity +
      userWeights.delta * reliability +
      userWeights.theta * historical;

    return score;
  }

  /**
   * Get all available quotes with their scores for comparison
   * Only considers manual routes due to slippage concerns with auto routes
   */
  static getAllQuotesWithScores(
    quotes: BungeeQuotesSuccessResponse,
    userWeights: {
      alpha: number;
      beta: number;
      gamma: number;
      delta: number;
      theta: number;
    }
  ): Array<{
    quote: BungeeManualQuoteResponse;
    type: 'manual';
    score: number;
    details: {
      cost: number;
      timeToFinality: number;
      liquidity: number;
      reliability: number;
      historical: number;
    };
  }> {
    const allQuotes: Array<{
      quote: BungeeManualQuoteResponse;
      type: 'manual';
      score: number;
      details: {
        cost: number;
        timeToFinality: number;
        liquidity: number;
        reliability: number;
        historical: number;
      };
    }> = [];

    // Only add manual routes due to slippage concerns with auto routes
    if (quotes.result.manualRoutes.length > 0) {
      quotes.result.manualRoutes.forEach(manualQuote => {
        const manualScore = this.calculateQuoteScore(manualQuote, userWeights, 'manual');
        const manualDetails = this.extractQuoteDetails(manualQuote, 'manual');
        allQuotes.push({
          quote: manualQuote,
          type: 'manual',
          score: manualScore,
          details: manualDetails
        });
      });
    }

    // Sort by score (highest first)
    return allQuotes.sort((a, b) => b.score - a.score);
  }

  /**
   * Extract detailed scoring factors from a quote
   * Only handles manual routes due to slippage concerns
   */
  private static extractQuoteDetails(
    quote: BungeeManualQuoteResponse | BungeeAutoQuoteResponse,
    type: 'manual' | 'auto'
  ): {
    cost: number;
    timeToFinality: number;
    liquidity: number;
    reliability: number;
    historical: number;
  } {
    // Only handle manual routes due to slippage concerns
    if (type !== 'manual') {
      return {
        cost: 0,
        timeToFinality: 0,
        liquidity: 0,
        reliability: 0,
        historical: 0
      };
    }

    const manualQuote = quote as BungeeManualQuoteResponse;
    const inputValue = parseFloat(manualQuote.output.valueInUsd.toString());
    const outputValue = parseFloat(manualQuote.output.effectiveReceivedInUsd.toString());
    const slippage = manualQuote.slippage || 0;
    const routeName = manualQuote.routeDetails.name.toLowerCase();
    
    let historical = 0.7;
    if (routeName.includes('stargate') || routeName.includes('layerzero')) {
      historical = 0.9;
    } else if (routeName.includes('axelar') || routeName.includes('wormhole')) {
      historical = 0.8;
    }

    return {
      cost: manualQuote.gasFee.feeInUsd || 0,
              timeToFinality: manualQuote.estimatedTime || 1800, // Default to 30 minutes (1800 seconds)
      liquidity: Math.min(1.0, outputValue / inputValue),
      reliability: Math.max(0.1, 1.0 - (slippage / 100)),
      historical
    };
  }
}
