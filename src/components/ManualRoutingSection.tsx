import { usePrivy, useSendTransaction, useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';

import { FINTERNET_USERS, findUserByWalletAddress } from '../lib/constants/finternetUsers';
import { BungeeApiService } from '../lib/services/bungeeApi';

import { createPublicClient, createWalletClient, custom, defineChain, encodeFunctionData, http, parseAbi, type Hex } from 'viem';
import { readContract } from 'viem/actions';
import * as chains from 'viem/chains';
import type { BungeeManualQuoteResponse } from '../lib/services/bungeeApi';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CryptoLogo, NetworkLogo } from './ui/CryptoLogo';
import { Label } from './ui/label';

const ERC20_ABI = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
]);


// Route scoring weights interface
interface RouteWeights {
  alpha: number;    // Cost weight
  beta: number;     // Time to finality weight
  gamma: number;    // Liquidity weight
  delta: number;    // Reliability weight
  theta: number;    // Historical performance weight
}

// Route interface with scoring factors - now based on Bungee manual quotes
interface Route {
  id: string;
  name: string;
  fromChain: string;
  toChain: string;
  bridge: string;
  cost: number;           // Transaction cost in USD
  timeToFinality: number; // Time in seconds
  liquidity: number;      // Liquidity depth (0-1)
  reliability: number;    // Reliability/risk factor (0-1)
  historical: number;     // Historical performance (0-1)
  score?: number;         // Calculated score
  bungeeQuote: BungeeManualQuoteResponse; // Original Bungee quote data
}

// Transfer configuration interface
interface TransferConfig {
  fromToken: {
    symbol: string;
    address: string;
    decimals: number;
    chainId: number;
    name: string;
  };
  toToken: {
    symbol: string;
    address: string;
    decimals: number;
    chainId: number;
    name: string;
  };
  fromChain: string;
  toChain: string;
  transferType: 'nexus' | 'bungee' | 'socket';
  shouldUseSocket: boolean;
  socketReason: string;
}

// Default weights for the scoring formula
const DEFAULT_WEIGHTS: RouteWeights = {
  alpha: 0.25,    // Cost weight
  beta: 0.20,     // Time to finality weight
  gamma: 0.20,    // Liquidity weight
  delta: 0.20,    // Reliability weight
  theta: 0.15,    // Historical performance weight
};

interface ManualRoutingSectionProps {
  senderAddress: string;
  receiverAddress: string;
  amount: number;
  onRouteSelected?: (route: Route) => void;
  onExecuteNexus?: (params: {
    sender: string;
    receiver: string;
    amount: number;
    fromToken: string;
    toToken: string;
  }) => void;
  onExecuteSocket?: (params: {
    sender: string;
    receiver: string;
    amount: number;
    fromToken: string;
    toToken: string;
  }) => void;
  onExecuteBungee?: (route: Route) => void;
}

export function ManualRoutingSection({
  senderAddress,
  receiverAddress,
  amount,
  onRouteSelected,
  onExecuteNexus,
  onExecuteSocket,
  onExecuteBungee,
}: ManualRoutingSectionProps) {
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  // Note: Using sendTransaction hook from Privy as walletClient is not directly available
  // Fixed weights - formula component is disabled in demo
  const weights = DEFAULT_WEIGHTS;
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Array<Route>>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [isBuildingTx, setIsBuildingTx] = useState(false);
  const [isExecutingTx, setIsExecutingTx] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [approvalData, setApprovalData] = useState<any>(null);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [transactionProgress, setTransactionProgress] = useState<number>(0);
  const [transactionTimer, setTransactionTimer] = useState<number>(0);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // Get user configuration based on sender and receiver addresses
  const getTransferConfig = useCallback((senderAddr: string, receiverAddr: string, transferAmount: number): TransferConfig => {
    console.log('🔍 getTransferConfig called with:', { senderAddr, receiverAddr, transferAmount });
    
    // Find sender and receiver users by wallet address or Finternet ID
    const senderUser = findUserByWalletAddress(senderAddr) || 
                      Object.values(FINTERNET_USERS).find(u => u.finternetId === senderAddr);
    const receiverUser = findUserByWalletAddress(receiverAddr) ||
                        Object.values(FINTERNET_USERS).find(u => u.finternetId === receiverAddr);

    console.log('🔍 Found users:', { 
      senderUser: senderUser?.finternetId || 'Not found', 
      receiverUser: receiverUser?.finternetId || 'Not found' 
    });

    // If we can't find users, create a smart fallback based on address patterns
    if (!senderUser || !receiverUser) {
      console.log('🔍 No users found, using fallback logic');
      
      // Check if addresses are different (likely cross-chain)
      const isDifferentAddresses = senderAddr.toLowerCase() !== receiverAddr.toLowerCase();
      console.log('🔍 Address comparison:', { 
        senderAddr: senderAddr.toLowerCase(), 
        receiverAddr: receiverAddr.toLowerCase(), 
        isDifferentAddresses 
      });
      
      // For demo purposes, let's assume different addresses mean cross-chain
      if (isDifferentAddresses) {
        console.log('🔍 Different addresses detected - using cross-chain logic');
        
        // Try to find users by wallet address in the FINTERNET_USERS
        const allUsers = Object.values(FINTERNET_USERS);
        const senderUserByWallet = allUsers.find(u => u.walletAddress.toLowerCase() === senderAddr.toLowerCase());
        const receiverUserByWallet = allUsers.find(u => u.walletAddress.toLowerCase() === receiverAddr.toLowerCase());
        
        console.log('🔍 Found users by wallet:', { 
          senderUserByWallet: senderUserByWallet?.finternetId || 'Not found',
          receiverUserByWallet: receiverUserByWallet?.finternetId || 'Not found'
        });
        
        // Use actual user configurations if found, otherwise use smart defaults
        let fromToken, toToken, fromChain, toChain;
        
        if (senderUserByWallet && receiverUserByWallet) {
          // Both users found - use their actual configurations
          const senderDefaultToken = senderUserByWallet.supportedTokens.find(t => t.isDefault) || senderUserByWallet.supportedTokens[0];
          const receiverDefaultToken = receiverUserByWallet.supportedTokens.find(t => t.isDefault) || receiverUserByWallet.supportedTokens[0];
          const senderDefaultChain = senderUserByWallet.supportedChains.find(c => c.isDefault) || senderUserByWallet.supportedChains[0];
          const receiverDefaultChain = receiverUserByWallet.supportedChains.find(c => c.isDefault) || receiverUserByWallet.supportedChains[0];
          
          fromToken = senderDefaultToken;
          toToken = receiverDefaultToken;
          fromChain = senderDefaultChain;
          toChain = receiverDefaultChain;
          
          console.log('🔍 Using actual user configurations:', { fromToken, toToken, fromChain, toChain });
        } else {
          // Fallback to smart defaults based on common patterns
          fromToken = {
            symbol: "USDT",
            address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            decimals: 6,
            chainId: 1,
            name: "Tether USD"
          };
          toToken = {
            symbol: "USDT", 
            address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
            decimals: 6,
            chainId: 8453,
            name: "Tether USD"
          };
          fromChain = { chainId: 1, chainName: "Ethereum", chainLogo: "ETH", isDefault: true };
          toChain = { chainId: 8453, chainName: "Base", chainLogo: "BASE", isDefault: true };
          
          console.log('🔍 Using fallback configurations:', { fromToken, toToken, fromChain, toChain });
        }
        
        // Check if we should use Socket based on amount threshold and user preferences
        let shouldUseSocket = transferAmount >= 100; // Default threshold
        
        // Override with user preferences if available
        if (senderUserByWallet?.routingPreferences.autoUseSocket) {
          shouldUseSocket = transferAmount >= senderUserByWallet.routingPreferences.socketThreshold;
        }
        if (receiverUserByWallet?.routingPreferences.autoUseSocket) {
          shouldUseSocket = shouldUseSocket || transferAmount >= receiverUserByWallet.routingPreferences.socketThreshold;
        }
        
        if (shouldUseSocket) {
          console.log('🔍 Amount >= threshold, using Socket');
          return {
            fromToken: {
              symbol: fromToken.symbol,
              address: fromToken.address,
              decimals: fromToken.decimals,
              chainId: fromToken.chainId,
              name: fromToken.name
            },
            toToken: {
              symbol: toToken.symbol,
              address: toToken.address,
              decimals: toToken.decimals,
              chainId: toToken.chainId,
              name: toToken.name
            },
            fromChain: fromChain.chainName,
            toChain: toChain.chainName,
            transferType: "socket",
            shouldUseSocket: true,
            socketReason: `Cross-chain transfer ≥$${transferAmount} - using Socket for better rates`
          };
        } else {
          console.log('🔍 Amount < threshold, using Bungee');
          return {
            fromToken: {
              symbol: fromToken.symbol,
              address: fromToken.address,
              decimals: fromToken.decimals,
              chainId: fromToken.chainId,
              name: fromToken.name
            },
            toToken: {
              symbol: toToken.symbol,
              address: toToken.address,
              decimals: toToken.decimals,
              chainId: toToken.chainId,
              name: toToken.name
            },
            fromChain: fromChain.chainName,
            toChain: toChain.chainName,
            transferType: "bungee",
            shouldUseSocket: false,
            socketReason: `Cross-chain transfer <$${transferAmount} - using Bungee with efficiency scoring`
          };
        }
      }
      
      // Only return Nexus if addresses are actually the same
      if (senderAddr.toLowerCase() === receiverAddr.toLowerCase()) {
        console.log('🔍 Same addresses detected - using Nexus');
        return {
          fromToken: {
            symbol: "USDT",
            address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            decimals: 6,
            chainId: 1,
            name: "Tether USD"
          },
          toToken: {
            symbol: "USDT",
            address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            decimals: 6,
            chainId: 1,
            name: "Tether USD"
          },
          fromChain: "Ethereum",
          toChain: "Ethereum",
          transferType: "nexus",
          shouldUseSocket: false,
          socketReason: "Same address - using Nexus"
        };
      }
      
      // If we reach here, it's a cross-chain transfer but we couldn't determine the exact type
      // Default to Bungee for safety
      console.log('🔍 Fallback to Bungee for cross-chain transfer');
      return {
        fromToken: {
          symbol: "USDT",
          address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          decimals: 6,
          chainId: 1,
          name: "Tether USD"
        },
        toToken: {
          symbol: "USDT", 
          address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
          decimals: 6,
          chainId: 8453,
          name: "Tether USD"
        },
        fromChain: "Ethereum",
        toChain: "Base",
        transferType: "bungee",
        shouldUseSocket: false,
        socketReason: "Cross-chain transfer - using Bungee as fallback"
      };
    }

    // Get default tokens and chains for sender and receiver
    const senderDefaultToken = senderUser.supportedTokens.find(t => t.isDefault) || senderUser.supportedTokens[0];
    const receiverDefaultToken = receiverUser.supportedTokens.find(t => t.isDefault) || receiverUser.supportedTokens[0];
    const senderDefaultChain = senderUser.supportedChains.find(c => c.isDefault) || senderUser.supportedChains[0];
    const receiverDefaultChain = receiverUser.supportedChains.find(c => c.isDefault) || receiverUser.supportedChains[0];

    if (!senderDefaultToken || !receiverDefaultToken || !senderDefaultChain || !receiverDefaultChain || 
        senderUser.supportedTokens.length === 0 || receiverUser.supportedTokens.length === 0 ||
        senderUser.supportedChains.length === 0 || receiverUser.supportedChains.length === 0) {
      return {
        fromToken: {
          symbol: "USDT",
          address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          decimals: 6,
          chainId: 1,
          name: "Tether USD"
        },
        toToken: {
          symbol: "USDT",
          address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          decimals: 6,
          chainId: 1,
          name: "Tether USD"
        },
        fromChain: "Ethereum",
        toChain: "Ethereum",
        transferType: "nexus",
        shouldUseSocket: false,
        socketReason: "Missing token/chain configuration"
      };
    }

    // Check if this is a cross-chain transfer
    const isCrossChain = senderDefaultChain.chainId !== receiverDefaultChain.chainId;
    console.log('🔍 Chain comparison:', { 
      senderChain: senderDefaultChain.chainName, 
      receiverChain: receiverDefaultChain.chainName, 
      senderChainId: senderDefaultChain.chainId, 
      receiverChainId: receiverDefaultChain.chainId,
      isCrossChain 
    });

    if (isCrossChain) {
      console.log('🔍 Cross-chain transfer detected between users');
      
      // Check if we should use Socket based on amount threshold and user preferences
      let shouldUseSocket = transferAmount >= 100; // Default threshold
      
      // Override with user preferences if available
      if (senderUser.routingPreferences.autoUseSocket) {
        shouldUseSocket = transferAmount >= senderUser.routingPreferences.socketThreshold;
      }
      if (receiverUser.routingPreferences.autoUseSocket) {
        shouldUseSocket = shouldUseSocket || transferAmount >= receiverUser.routingPreferences.socketThreshold;
      }
      
      if (shouldUseSocket) {
        console.log('🔍 Amount >= threshold, using Socket');
        return {
          fromToken: {
            symbol: senderDefaultToken.symbol,
            address: senderDefaultToken.address,
            decimals: senderDefaultToken.decimals,
            chainId: senderDefaultToken.chainId,
            name: senderDefaultToken.name
          },
          toToken: {
            symbol: receiverDefaultToken.symbol,
            address: receiverDefaultToken.address,
            decimals: receiverDefaultToken.decimals,
            chainId: receiverDefaultToken.chainId,
            name: receiverDefaultToken.name
          },
          fromChain: senderDefaultChain.chainName,
          toChain: receiverDefaultChain.chainName,
          transferType: "socket",
          shouldUseSocket: true,
          socketReason: `Cross-chain transfer ≥$${transferAmount} - using Socket for better rates`
        };
      } else {
        console.log('🔍 Amount < threshold, using Bungee');
        return {
          fromToken: {
            symbol: senderDefaultToken.symbol,
            address: senderDefaultToken.address,
            decimals: senderDefaultToken.decimals,
            chainId: senderDefaultToken.chainId,
            name: senderDefaultToken.name
          },
          toToken: {
            symbol: receiverDefaultToken.symbol,
            address: receiverDefaultToken.address,
            decimals: receiverDefaultToken.decimals,
            chainId: receiverDefaultToken.chainId,
            name: receiverDefaultToken.name
          },
          fromChain: senderDefaultChain.chainName,
          toChain: receiverDefaultChain.chainName,
          transferType: "bungee",
          shouldUseSocket: false,
          socketReason: `Cross-chain transfer <$${transferAmount} - using Bungee with efficiency scoring`
        };
      }
    } else {
      console.log('🔍 Same-chain transfer detected between users');
      
      // Return same-chain configuration
      return {
        fromToken: {
          symbol: senderDefaultToken.symbol,
          address: senderDefaultToken.address,
          decimals: senderDefaultToken.decimals,
          chainId: senderDefaultToken.chainId,
          name: senderDefaultToken.name
        },
        toToken: {
          symbol: receiverDefaultToken.symbol,
          address: receiverDefaultToken.address,
          decimals: receiverDefaultToken.decimals,
          chainId: receiverDefaultToken.chainId,
          name: receiverDefaultToken.name
        },
        fromChain: senderDefaultChain.chainName,
        toChain: receiverDefaultChain.chainName,
        transferType: "nexus",
        shouldUseSocket: false,
        socketReason: "Same chain transfer - using Nexus"
      };
    }
  }, []);

  const transferConfig = getTransferConfig(senderAddress, receiverAddress, amount);
  const finalTransferConfig = transferConfig;
  
  // Debug logging
  console.log('ManualRoutingSection Debug:', {
    senderAddress,
    receiverAddress,
    amount,
    transferConfig,
    finalTransferConfig
  });

  // Fetch quotes from Bungee API (only for cross-chain transfers that don't use Socket)
  const fetchQuotes = useCallback(async () => {
    if (!senderAddress || !amount || finalTransferConfig.transferType === 'nexus' || finalTransferConfig.shouldUseSocket) {
      return; // Only fetch quotes for cross-chain transfers that don't use Socket
    }

    setIsLoadingQuotes(true);
    setError(null);

    try {
      // Convert amount to proper decimals
      const inputAmount = (amount * Math.pow(10, finalTransferConfig.fromToken.decimals)).toString();

      // Convert Finternet IDs to wallet addresses for Bungee API
      const senderUser = Object.values(FINTERNET_USERS).find(u => u.finternetId === senderAddress);
      const receiverUser = Object.values(FINTERNET_USERS).find(u => u.finternetId === receiverAddress);
      
      if (!senderUser || !receiverUser) {
        setError('Could not resolve Finternet IDs to wallet addresses');
        return;
      }

      const quoteRequest = {
        userAddress: senderUser.walletAddress,        // Use actual wallet address
        receiverAddress: receiverUser.walletAddress,  // Use actual wallet address
        originChainId: finalTransferConfig.fromToken.chainId,
        destinationChainId: finalTransferConfig.toToken.chainId,
        inputToken: finalTransferConfig.fromToken.address,
        outputToken: finalTransferConfig.toToken.address,
        inputAmount: inputAmount,
        slippageTolerance: 1, // 1% slippage
        enableManual: true,
      };

      const response = await BungeeApiService.getQuotes(quoteRequest);
    
      
      if ('success' in response && response.success) {
        // Use the new Bungee API methods to get quotes with scores
        const allQuotesWithScores = BungeeApiService.getAllQuotesWithScores(response, weights);
        
        if (allQuotesWithScores.length > 0) {
          // Convert to our internal Route format
          const internalRoutes: Array<Route> = allQuotesWithScores.map(quoteWithScore => {
            const quote = quoteWithScore.quote;
            const details = quoteWithScore.details;
            
            // Helper function to get chain name from ID
            const getChainName = (chainId: number): string => {
              switch (chainId) {
                case 1: return 'Ethereum';
                case 11155111: return 'Sepolia';
                case 8453: return 'Base';
                case 137: return 'Polygon';
                case 42161: return 'Arbitrum';
                case 10: return 'Optimism';
                case 43114: return 'Avalanche';
                default: return `Chain ${chainId}`;
              }
            };

            return {
              id: quote.quoteId,
              name: `${quote.routeDetails.name} via ${quote.routeDetails.dexDetails?.protocol.name || 'Unknown'}`,
              fromChain: getChainName(response.result.originChainId),
              toChain: getChainName(response.result.destinationChainId),
              bridge: quote.routeDetails.name,
              cost: details.cost,
              timeToFinality: details.timeToFinality,
              liquidity: details.liquidity,
              reliability: details.reliability,
              historical: details.historical,
              score: quoteWithScore.score,
              bungeeQuote: quote
            };
          });
          
          // Sort routes by score (highest first)
          internalRoutes.sort((a, b) => (b.score || 0) - (a.score || 0));
          setRoutes(internalRoutes);
          console.log('Processed routes:', internalRoutes);
        } else {
          setError('No manual routes available from Bungee API');
          setRoutes([]);
        }
      } else {
        // Handle error response
        const errorResponse = response as any;
        setError(`API call failed: ${errorResponse.error || errorResponse.message || 'Unknown error'}`);
        setRoutes([]);
      }
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch quotes');
      setRoutes([]);
    } finally {
      setIsLoadingQuotes(false);
    }
  }, [senderAddress, receiverAddress, amount, weights, finalTransferConfig]);

  // Build transaction for selected route
  const buildTransaction = useCallback(async (route: Route) => {
    if (!route.bungeeQuote) {
      setError('No Bungee quote data available');
      return;
    }

    if (!authenticated || !user) {
      setError('Please connect your wallet first');
      return;
    }

    setIsBuildingTx(true);
    setError(null);

    try {
      const buildTxRequest = {
        quoteId: route.bungeeQuote.quoteId,
      };

      const response = await BungeeApiService.buildTransaction(buildTxRequest);
      
      if (response.success) {
        setTransactionData(response.result);
        
        // Check if approval is needed
        if (response.result.approvalData) {
          setApprovalNeeded(true);
          setApprovalData(response.result.approvalData);
        } else {
          setApprovalNeeded(false);
        }
        
        console.log('Transaction built successfully:', response.result);
      } else {
        setError('Failed to build transaction');
      }
    } catch (err) {
      console.error('Error building transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to build transaction');
    } finally {
      setIsBuildingTx(false);
    }
  }, [authenticated, user]);

  // Helper method to get chain configuration from viem based on chainId
  const getChainFromId = useCallback((chainId: number, chainOptions?: any) => {
    switch (chainId) {
      case 1:
        return chains.mainnet;
      case 11155111:
        return chains.sepolia;
      case 8453:
        return chains.base;
      case 137:
        return chains.polygon;
      case 42161:
        return chains.arbitrum;
      case 10:
        return chains.optimism;
      case 43114:
        return chains.avalanche;
      default:
        return defineChain({
          id: chainId,
          name: `Chain ${chainId}`,
          nativeCurrency: {
            name: `Chain ${chainId}`,
            symbol: `Chain ${chainId}`,
            decimals: 18
          },
          rpcUrls: {
            default: {
              http: [chainOptions?.rpcUrl || `https://chain-${chainId}.example.com`]
            }
          }
        });
    }
  }, []);

  // Execute transaction using Privy's native sendTransaction
  const executeTransaction = useCallback(async () => {
    if (!transactionData || !authenticated || wallets.length === 0) {
      setError('Transaction data or wallet not available');
      return;
    }

    setIsExecutingTx(true);
    setError(null);
    
    // Reset approval state for new transaction
    setApprovalNeeded(false);
    setApprovalData(null);
    
    const ethereumProvider = await wallets[0].getEthereumProvider();
    const chainConfig = getChainFromId(finalTransferConfig.fromToken.chainId);
    const walletClient = createWalletClient({
        account: wallets[0].address as Hex,
        chain: chainConfig,
        transport: custom(ethereumProvider),
    });

    const publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(),
    });

    try {
      // If approval is needed, handle it first
      if (approvalNeeded && approvalData) {
        console.log('Handling token approval...');
        
        // Get the source chain ID for approval (where the tokens are located)
        const sourceChainId = finalTransferConfig.fromToken.chainId;
        const currentChainId = wallets[0]?.chainId;
        
        // Ensure wallet is on the source chain for approval
        const walletChainId = typeof currentChainId === 'string' ? 
          parseInt(currentChainId.replace('eip155:', '')) : 
          currentChainId;
          
        if (walletChainId !== sourceChainId) {
          console.log(`Switching network from ${currentChainId} to ${sourceChainId} for approval`);
          setTransactionStatus(`Switching network to ${sourceChainId === 1 ? 'Ethereum Mainnet' : sourceChainId === 8453 ? 'Base Mainnet' : `Chain ID ${sourceChainId}`} for token approval...`);
          
          try {
            await wallets[0]?.switchChain(sourceChainId);
            console.log('Network switched successfully for approval');
          } catch (switchErr) {
            console.error('Failed to switch network for approval:', switchErr);
            throw new Error(`Please switch your wallet to ${sourceChainId === 1 ? 'Ethereum Mainnet' : sourceChainId === 8453 ? 'Base Mainnet' : `Chain ID ${sourceChainId}`} to approve the token`);
          }
        }
        try {
   
          // 1. Check current allowance
                     const allowance = await readContract(publicClient, {
             abi: ERC20_ABI,
             address: approvalData.tokenAddress as `0x${string}`,
             functionName: 'allowance',
             args: [wallets[0].address as `0x${string}`, approvalData.spenderAddress as `0x${string}`]
           });
           console.log('Current allowance:', allowance.toString());
           console.log('Required amount:', approvalData.amount);

           if (allowance < BigInt(approvalData.amount)) {
             console.log('Approval needed - current allowance insufficient');


            const approvalDataHex = encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [approvalData.spenderAddress as `0x${string}`, BigInt(approvalData.amount)],
            });
            
            // Send approval transaction using walletClient
            const approvalHash = await walletClient.sendTransaction({
              to: approvalData.tokenAddress as `0x${string}`,
              data: approvalDataHex,
              value: 0n,
            });
            
            console.log('Approval transaction sent:', approvalHash);
      

            const approvalReceipt = await publicClient.waitForTransactionReceipt({
              hash: approvalHash,
            });

            if (approvalReceipt.status === 'reverted') {
              throw new Error('Approval transaction failed - no transaction hash received');
            }

            if (approvalReceipt.status === 'success') {
               setTransactionStatus('Token approval submitted successfully. Hash: ' + approvalHash);
               setApprovalNeeded(false);
               setApprovalData(null); // Clear approval data after successful approval
             }
            } else {
               console.log('Approval not needed - sufficient allowance already exists');
               setApprovalNeeded(false);
               setApprovalData(null);
             }
           } catch (approvalErr) {
          console.error('Approval transaction failed:', approvalErr);
          throw new Error(`Token approval failed: ${approvalErr instanceof Error ? approvalErr.message : 'Unknown error'}`);
        }
      }

      // Execute the main transaction
      console.log('Executing main transaction...');
      console.log('Transaction data:', transactionData);
      
      // Validate transaction data
      if (!transactionData.txData || !transactionData.txData.to || !transactionData.txData.data) {
        throw new Error('Invalid transaction data structure');
      }
      
      // For cross-chain bridges, the main transaction should be on the source chain (Ethereum)
      // The bridge handles the cross-chain transfer automatically
      const sourceChainId = finalTransferConfig.fromToken.chainId; // Ethereum (1)
      const currentChainId = wallets[0]?.chainId;
      
      // Parse wallet chain ID to handle eip155: format
      const walletChainId = typeof currentChainId === 'string' ? 
        parseInt(currentChainId.replace('eip155:', '')) : 
        currentChainId;
      
      // Ensure wallet is on source chain for the main transaction
      if (walletChainId !== sourceChainId) {
        console.log(`Switching network from ${currentChainId} to ${sourceChainId} for main transaction`);
        setTransactionStatus(`Switching network to ${sourceChainId === 1 ? 'Ethereum Mainnet' : `Chain ID ${sourceChainId}`} for main transaction...`);
        
        try {
          await wallets[0]?.switchChain(sourceChainId);
          console.log('Network switched successfully for main transaction');
        } catch (switchErr) {
          console.error('Failed to switch network for main transaction:', switchErr);
          throw new Error(`Please switch your wallet to ${sourceChainId === 1 ? 'Ethereum Mainnet' : `Chain ID ${sourceChainId}`} to execute the main transaction`);
        }
      }
      
      // Debug: Log the transaction data being sent
      console.log('Transaction data being sent:', {
        to: transactionData.txData.to,
        data: transactionData.txData.data,
        value: transactionData.txData.value,
        chainId: sourceChainId,
        address: wallets[0].address
      });
      const account = wallets[0].address as `0x${string}`;
      const to = transactionData.txData.to as `0x${string}`;
      const data = transactionData.txData.data as `0x${string}`;
      const rawVal = transactionData.txData.value;
      const value: bigint = rawVal == null || rawVal === '' ? 0n : BigInt(rawVal);

      const gas = await publicClient.estimateGas({ account, to, data, value });

      // (Optional) get fee suggestions (EIP-1559)
      const { maxFeePerGas, maxPriorityFeePerGas } = await publicClient.estimateFeesPerGas();
      
      const nonce = await publicClient.getTransactionCount({ address: account });
      
      // Now send
      const txResult = await walletClient.sendTransaction({
        account, 
        to,
        data,
        value,
        gas,           
        nonce,         // omit unless you know why you set it
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      
        // Start transaction polling with progress
      setTransactionHash(txResult);
      setTransactionStatus('Transaction submitted! Polling for confirmation...');
      setIsPolling(true);
      setTransactionProgress(0);
      setTransactionTimer(0);
      
      // Poll transaction status with progress updates
      let pollCount = 0;
      const maxPolls = 60; // Max 5 minutes (5s intervals)
      const pollInterval = setInterval(async () => {
        try {
          pollCount++;
          const elapsed = pollCount * 5; // 5 second intervals
          setTransactionTimer(elapsed);
          
          // Update progress (0-100%)
          const progress = Math.min((pollCount / maxPolls) * 100, 100);
          setTransactionProgress(progress);
          
          // Check transaction status
          const txReceipt = await publicClient.getTransactionReceipt({ hash: txResult });
          
          if (txReceipt) {
            clearInterval(pollInterval);
            setIsPolling(false);
            
            if (txReceipt.status === 'success') {
              setTransactionStatus('Transaction confirmed successfully! 🎉');
              setTransactionProgress(100);
              console.log('Transaction executed successfully! Hash:', txResult);
            } else {
              setTransactionStatus('Transaction failed or reverted ❌');
              setError('Transaction failed - status indicates failure');
            }
            
            // Clear transaction data after completion
            setTransactionData(null);
          }
          
          // Stop polling if max attempts reached
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setIsPolling(false);
            setTransactionStatus('Transaction polling timeout - check blockchain explorer');
            setError('Transaction polling timeout - please check the transaction status manually');
          }
        } catch (err) {
          console.error('Error polling transaction:', err);
          // Continue polling on error
        }
      }, 5000); // Poll every 5 seconds
      
    } catch (err) {
      console.error('Error executing transaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute transaction';
      setError(`Transaction execution failed: ${errorMessage}`);
    } finally {
      setIsExecutingTx(false);
    }
  }, [transactionData, authenticated, wallets, approvalNeeded, approvalData, sendTransaction, finalTransferConfig]);

  // Calculate route score using the efficiency engine formula
  const calculateRouteScore = useCallback((route: Route, weights: RouteWeights): number => {
    // Normalize values to 0-1 range
    const normalizedCost = Math.max(0.01, route.cost / 50); // Normalize cost (0.01 to 1)
    const normalizedTime = Math.max(0.01, route.timeToFinality / 30); // Normalize time (0.01 to 1)
    
    // Apply the scoring formula: Score(r) = α ⋅ (1/cost_r) + β ⋅ (1/ttf_r) + γ ⋅ L_r + δ ⋅ R_r + θ ⋅ H_r
    const score = 
      weights.alpha * (1 / normalizedCost) +
      weights.beta * (1 / normalizedTime) +
      weights.gamma * route.liquidity +
      weights.delta * route.reliability +
      weights.theta * route.historical;
    
    return score;
  }, []);

  // Calculate scores for all routes
  const calculateAllScores = useCallback(() => {
    if (routes.length === 0) return;
    
    const updatedRoutes = routes.map(route => ({
      ...route,
      score: calculateRouteScore(route, weights),
    }));
    
    // Sort routes by score (highest first)
    updatedRoutes.sort((a, b) => (b.score || 0) - (a.score || 0));
    setRoutes(updatedRoutes);
  }, [routes, weights, calculateRouteScore]);

  // Handle route selection
  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    onRouteSelected?.(route);
  };

  // Weights are fixed in demo - no adjustment allowed

  // Calculate total weight to ensure it equals 1.0
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  // Fetch quotes when component mounts or when dependencies change
  useEffect(() => {
    console.log('🔍 useEffect triggered with:', {
      senderAddress,
      amount,
      transferType: finalTransferConfig.transferType,
      shouldUseSocket: finalTransferConfig.shouldUseSocket
    });
    
    if (senderAddress && amount > 0 && finalTransferConfig.transferType === 'bungee' && !finalTransferConfig.shouldUseSocket) {
      console.log('🔍 Conditions met, calling fetchQuotes');
      fetchQuotes();
    } else {
      console.log('🔍 Conditions not met, clearing routes');
      // Clear routes if no valid input or if it's a same-chain transfer
      setRoutes([]);
      setSelectedRoute(null);
      setTransactionData(null);
      setError(null);
    }
  }, [senderAddress, amount, finalTransferConfig.transferType, finalTransferConfig.shouldUseSocket]); // Removed fetchQuotes from dependencies

  // Cleanup effect for transaction polling
  useEffect(() => {
    return () => {
      // Clear any ongoing polling when component unmounts
      setIsPolling(false);
      setTransactionProgress(0);
      setTransactionTimer(0);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Unified Transfer System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test User Combinations */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-gray-800 text-sm mb-3">
            <strong>Test Different Transfer Types:</strong>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-white rounded border">
              <strong>Same Chain (Nexus):</strong><br/>
              praveen@finternet.us → praveen@finternet.us<br/>
              USDT Ethereum → USDT Ethereum
            </div>
            <div className="p-2 bg-white rounded border">
              <strong>Cross Chain (Bungee):</strong><br/>
              Different wallet addresses<br/>
              USDT Ethereum → USDT Base (&lt;$100)
            </div>
            <div className="p-2 bg-white rounded border">
              <strong>Cross Chain (Socket):</strong><br/>
              Different wallet addresses<br/>
              USDT Ethereum → USDT Base (≥$100)
            </div>
            <div className="p-2 bg-white rounded border">
              <strong>Current Config:</strong><br/>
              Sender: {senderAddress}<br/>
              Receiver: {receiverAddress}
            </div>
          </div>
        </div>

        {/* Wallet Connection Status */}
        {!authenticated ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-yellow-800 text-sm">
              <strong>Wallet Required:</strong> Please connect your wallet to use transfers.
            </div>
          </div>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800 text-sm">
              <strong>Wallet Connected:</strong> {wallets.length > 0 ? `${wallets[0].address.slice(0, 8)}...${wallets[0].address.slice(-6)}` : 'Connected'}
            </div>
          </div>
        )}

        {/* Transfer Configuration Display */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <CryptoLogo symbol={finalTransferConfig.fromToken.symbol} size={24} />
              <div className="text-center">
                <div className="font-medium">{finalTransferConfig.fromToken.symbol}</div>
                <div className="text-sm text-blue-600">{finalTransferConfig.fromChain}</div>
              </div>
            </div>
            <span className="text-2xl">→</span>
            <div className="flex items-center gap-2">
              <CryptoLogo symbol={finalTransferConfig.toToken.symbol} size={24} />
              <div className="text-center">
                <div className="font-medium">{finalTransferConfig.toToken.symbol}</div>
                <div className="text-sm text-blue-600">{finalTransferConfig.toChain}</div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              finalTransferConfig.transferType === 'nexus' 
                ? 'bg-green-100 text-green-800' 
                : finalTransferConfig.transferType === 'socket'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {finalTransferConfig.transferType === 'nexus' ? '🔄 Same-Chain Transfer (Nexus)' : 
               finalTransferConfig.transferType === 'socket' ? '🔌 Cross-Chain Transfer (Socket)' :
               '🌉 Cross-Chain Transfer (Bungee)'}
            </div>
          </div>
          
          <div className="text-center text-sm text-blue-600 mt-2">
            <strong>Amount:</strong> {amount} {finalTransferConfig.fromToken.symbol}
            <br />
            <strong>Sender:</strong> {senderAddress}
            <br />
            <strong>Receiver:</strong> {receiverAddress}
            {finalTransferConfig.shouldUseSocket && (
              <div className="mt-2 p-2 bg-purple-100 rounded-lg">
                <div className="text-purple-800 text-xs">
                  <strong>🔌 Socket Auto-Selected:</strong> {finalTransferConfig.socketReason}
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Cross-Chain Transfer (Bungee) */}
        {finalTransferConfig.transferType === 'bungee' && (
          <>
            {/* Scoring Formula Display */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <CryptoLogo symbol={finalTransferConfig.fromToken.symbol} size={24} />
                  <span className="text-lg">→</span>
                  <CryptoLogo symbol={finalTransferConfig.toToken.symbol} size={24} />
                </div>
                <h4 className="font-medium text-blue-800">Efficiency Engine Scoring Formula</h4>
              </div>
              <div className="text-sm text-blue-700 font-mono">
                Score(r) = α ⋅ (1/cost_r) + β ⋅ (1/ttf_r) + γ ⋅ L_r + δ ⋅ R_r + θ ⋅ H_r
              </div>
              <div className="text-xs text-blue-600 mt-2">
                Where: cost_r = transaction cost, ttf_r = time to finality, L_r = liquidity, R_r = reliability, H_r = historical performance
              </div>
            </div>

            {/* Weight Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">Route Scoring Weights</Label>
                <div className="text-sm text-gray-500">
                  Weights are fixed in demo
                </div>
              </div>
              <div className="text-sm text-purple-700 mb-4 p-3 bg-purple-100 rounded-lg">
                <strong>Formula:</strong> Score = α(1/cost) + β(1/time in seconds) + γ(liquidity) + δ(reliability) + θ(historical)
                <br />
                <strong>Note:</strong> This scoring formula is fixed and cannot be modified in the demo. Time is measured in seconds.
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost Weight (Alpha) - Fixed */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Cost Weight (α)</Label>
                    <span className="text-sm text-gray-600 font-medium">{weights.alpha.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Fixed weight - Cost impact on scoring
                  </div>
                </div>

                {/* Time to Finality Weight (Beta) - Fixed */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Time Weight (β)</Label>
                    <span className="text-sm text-gray-600 font-medium">{weights.beta.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Fixed weight - Speed impact on scoring
                  </div>
                </div>

                {/* Liquidity Weight (Gamma) - Fixed */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Liquidity Weight (γ)</Label>
                    <span className="text-sm text-gray-600 font-medium">{weights.gamma.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Fixed weight - Liquidity impact on scoring
                  </div>
                </div>

                {/* Reliability Weight (Delta) - Fixed */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Reliability Weight (δ)</Label>
                    <span className="text-sm text-gray-600 font-medium">{weights.delta.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Fixed weight - Reliability impact on scoring
                  </div>
                </div>

                {/* Historical Performance Weight (Theta) - Fixed */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>History Weight (θ)</Label>
                    <span className="text-sm text-gray-600 font-medium">{weights.theta.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Fixed weight - Historical performance impact
                  </div>
                </div>

                {/* Total Weight Display */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Total Weight</Label>
                    <span className="text-sm font-medium text-green-600">
                      {totalWeight.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-green-600">
                    ✅ Weights are balanced and fixed
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Actions */}
            <div className="flex gap-4">
              <Button
                onClick={fetchQuotes}
                disabled={isLoadingQuotes || !senderAddress || amount <= 0 || !authenticated}
                className="flex-1"
              >
                {isLoadingQuotes ? 'Fetching Quotes...' : 'Fetch Bungee Quotes'}
              </Button>
              <Button
                onClick={calculateAllScores}
                disabled={routes.length === 0}
                variant="outline"
                className="flex-1"
              >
                Recalculate Scores
              </Button>
              <Button
                onClick={() => {
                  setRoutes([]);
                  setSelectedRoute(null);
                  setTransactionData(null);
                  setError(null);
                }}
                variant="outline"
                size="sm"
              >
                Clear Routes
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-800 text-sm">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            {/* Available Routes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Available Routes (Ranked by Score) - {routes.length} routes found
                </Label>
              </div>
              
              {routes.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <div className="text-gray-600">
                    {isLoadingQuotes ? 'Fetching quotes from Bungee...' : 'No routes available. Click "Fetch Bungee Quotes" to get started.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((route, index) => (
                    <div
                      key={route.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedRoute?.id === route.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleRouteSelect(route)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            #{index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <NetworkLogo network={route.fromChain} size={20} />
                              <span className="text-gray-600">→</span>
                              <NetworkLogo network={route.toChain} size={20} />
                            </div>
                            <h4 className="font-medium text-gray-900">{route.name}</h4>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {(route.score || 0).toFixed(3)}
                          </div>
                          <div className="text-xs text-gray-500">Score</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <div className="text-gray-600">Cost</div>
                          <div className="font-medium">${route.cost.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Time</div>
                          <div className="font-medium">{route.timeToFinality} sec</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Liquidity</div>
                          <div className="font-medium">{(route.liquidity * 100).toFixed(0)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Reliability</div>
                          <div className="font-medium">{(route.reliability * 100).toFixed(0)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">History</div>
                          <div className="font-medium">{(route.historical * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-xs text-gray-500">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-600">Bridge:</span>
                            <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                              {route.bungeeQuote.routeDetails.logoURI ? (
                                <img 
                                  src={route.bungeeQuote.routeDetails.logoURI} 
                                  alt={`${route.bridge} logo`}
                                  className="w-4 h-4 rounded-full object-cover"
                                  onError={(e) => {
                                    // Fallback to letter logo if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = document.createElement('div');
                                    fallback.className = 'w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center';
                                    fallback.innerHTML = `<span class="text-white text-xs font-bold">${route.bridge.charAt(0).toUpperCase()}</span>`;
                                    target.parentNode?.insertBefore(fallback, target);
                                  }}
                                />
                              ) : (
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{route.bridge.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <span className="text-blue-700 font-medium">{route.bridge}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Chain Transfer Visualization */}
                        <div className="flex items-center justify-center gap-4 py-2 px-4 bg-gray-50 rounded-lg border border-gray-200">
                          {/* Source Chain */}
                          <div className="flex flex-col items-center gap-1">
                            <NetworkLogo network={route.fromChain} size={20} />
                            <span className="text-xs font-medium text-gray-700">{route.fromChain}</span>
                          </div>
                          
                          {/* Arrow */}
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-0.5 bg-blue-400 relative">
                              <div className="absolute right-0 top-0 w-0 h-0 border-l-4 border-l-blue-400 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                            </div>
                            <span className="text-xs text-blue-500 font-medium mt-1">Transfer</span>
                          </div>
                          
                          {/* Destination Chain */}
                          <div className="flex flex-col items-center gap-1">
                            <NetworkLogo network={route.toChain} size={20} />
                            <span className="text-xs font-medium text-gray-700">{route.toChain}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Route Summary */}
            {selectedRoute && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-800">Selected Route</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Route:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-700">{selectedRoute.name}</span>
                      </div>
                    </div>
                    
                    {/* Chain Transfer Visualization for Selected Route */}
                    <div className="flex items-center justify-center gap-4 py-3 px-4 bg-green-50 rounded-lg border border-green-200">
                      {/* Source Chain */}
                      <div className="flex flex-col items-center gap-2">
                        <NetworkLogo network={selectedRoute.fromChain} size={28} />
                        <span className="text-sm font-medium text-green-700">{selectedRoute.fromChain}</span>
                      </div>
                      
                      {/* Arrow */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-0.5 bg-green-400 relative">
                          <div className="absolute right-0 top-0 w-0 h-0 border-l-4 border-l-green-400 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                        </div>
                        <span className="text-sm text-green-600 font-medium mt-1">Transfer</span>
                      </div>
                      
                      {/* Destination Chain */}
                      <div className="flex flex-col items-center gap-2">
                        <NetworkLogo network={selectedRoute.toChain} size={28} />
                        <span className="text-sm font-medium text-green-700">{selectedRoute.toChain}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Score:</span>
                      <span className="text-green-700 font-bold">{(selectedRoute.score || 0).toFixed(3)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Bridge:</span>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                        {selectedRoute.bungeeQuote.routeDetails.logoURI ? (
                          <img 
                            src={selectedRoute.bungeeQuote.routeDetails.logoURI} 
                            alt={`${selectedRoute.bridge} logo`}
                            className="w-5 h-5 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to letter logo if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-5 h-5 bg-green-500 rounded-full flex items-center justify-center';
                              fallback.innerHTML = `<span class="text-green-700 text-sm font-bold">${selectedRoute.bridge.charAt(0).toUpperCase()}</span>`;
                              target.parentNode?.insertBefore(fallback, target);
                            }}
                          />
                        ) : (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">B</span>
                          </div>
                        )}
                        <span className="text-green-700 font-medium">{selectedRoute.bridge}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Estimated Cost:</span>
                      <span className="text-green-700">${selectedRoute.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Time to Finality:</span>
                                              <span className="text-green-700">{selectedRoute.timeToFinality} seconds</span>
                    </div>
                    
                    <div className="mt-4 p-3 bg-green-100 rounded-lg">
                      <div className="text-sm text-green-800">
                        <strong>Route Analysis:</strong> This route was selected based on your configured weights:
                        <br />
                        • Cost (α={weights.alpha}): {(weights.alpha * (1 / Math.max(0.01, selectedRoute.cost / 50))).toFixed(3)}
                        <br />
                        • Time (β={weights.beta}): {(weights.beta * (1 / Math.max(0.01, selectedRoute.timeToFinality / 30))).toFixed(3)}
                        <br />
                        • Liquidity (γ={weights.gamma}): {(weights.gamma * selectedRoute.liquidity).toFixed(3)}
                        <br />
                        • Reliability (δ={weights.delta}): {(weights.delta * selectedRoute.reliability).toFixed(3)}
                        <br />
                        • History (θ={weights.theta}): {(weights.theta * selectedRoute.historical).toFixed(3)}
                      </div>
                    </div>

                    {/* Build Transaction Button */}
                    <div className="mt-4">
                      <Button
                        onClick={() => buildTransaction(selectedRoute)}
                        disabled={isBuildingTx || !authenticated}
                        className="w-full"
                      >
                        {isBuildingTx ? 'Building Transaction...' : 'Build Transaction'}
                      </Button>
                    
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction Data Display */}
            {transactionData && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-800">Transaction Built Successfully</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">To Address:</span>
                        <span className="ml-2 text-blue-700 font-mono text-xs break-all">
                          {transactionData.txData.to}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Chain ID:</span>
                        <span className="ml-2 text-blue-700">{transactionData.txData.chainId}</span>
                      </div>
                      <div>
                        <span className="font-medium">Value:</span>
                        <span className="ml-2 text-blue-700">{transactionData.txData.value} ETH</span>
                      </div>
                      <div>
                        <span className="font-medium">Operation:</span>
                        <span className="ml-2 text-blue-700">{transactionData.userOp}</span>
                      </div>
                    </div>
                    
                    {transactionData.approvalData && approvalNeeded && (
                      <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                        <div className="text-sm text-yellow-800">
                          <strong>Approval Required:</strong>
                          <br />
                          • Token: {transactionData.approvalData.tokenAddress}
                          <br />
                          • Spender: {transactionData.approvalData.spenderAddress}
                          <br />
                          • Amount: {transactionData.approvalData.amount}
                        </div>
                      </div>
                    )}
                    
                    {transactionData.approvalData && !approvalNeeded && (
                      <div className="mt-4 p-3 bg-green-100 rounded-lg">
                        <div className="text-sm text-green-800">
                          <strong>✅ Approval Status:</strong>
                          <br />
                          • Token approval completed or not required
                          <br />
                          • Ready to execute main transaction
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <strong>Transaction Data:</strong>
                        <br />
                        <span className="font-mono text-xs break-all">
                          {transactionData.txData.data}
                        </span>
                      </div>
                    </div>

                    {/* Execute Transaction Button */}
                    <div className="mt-4">
                      <Button
                        onClick={executeTransaction}
                        disabled={isExecutingTx || !authenticated}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {isExecutingTx ? 'Executing Transaction...' : 'Execute Transaction'}
                      </Button>
                      
                      {/* Building/Executing Status */}
                      {(isBuildingTx || isExecutingTx) && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <div className="text-sm text-blue-700">
                              {isBuildingTx ? 'Building transaction...' : 'Executing transaction...'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transaction Status Display */}
                    {transactionStatus && (
                      <div className="mt-4 p-3 bg-green-100 rounded-lg">
                        <div className="text-sm text-green-800">
                          <strong>Transaction Status:</strong>
                          <br />
                          {transactionStatus}
                          {transactionHash && (
                            <>
                              <br />
                              <span className="font-mono text-xs break-all">
                                Hash: {transactionHash}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Interactive Progress Bar */}
                        {isPolling && (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Transaction Progress</span>
                              <span className="font-mono">
                                {Math.floor(transactionTimer / 60)}:{(transactionTimer % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000 ease-out"
                                style={{ width: `${transactionProgress}%` }}
                              />
                            </div>
                            
                            {/* Progress Details */}
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Submitted</span>
                              <span>{transactionProgress.toFixed(1)}%</span>
                              <span>Confirmed</span>
                            </div>
                            
                            {/* Status Indicators */}
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`w-2 h-2 rounded-full ${transactionProgress > 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                              <span>Polling blockchain...</span>
                              {transactionProgress > 50 && (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                  <span>Almost there...</span>
                                </>
                              )}
                              {transactionProgress > 90 && (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                  <span>Finalizing...</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Information */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Manual Routing with Bungee API:</strong>
                <br />
                • <strong>Real Quotes:</strong> Get live quotes from Bungee.exchange
                • <strong>Custom Scoring:</strong> Adjust weights based on your priorities
                • <strong>Route Comparison:</strong> See how different routes score with your criteria
                • <strong>Transaction Building:</strong> Build ready-to-execute transactions
                • <strong>Transparency:</strong> Understand exactly why each route is recommended
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
