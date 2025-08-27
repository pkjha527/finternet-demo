import { useNexus } from '@avail-project/nexus/ui';
import { useCallback, useState } from 'react';
import type { IntentSide } from '../types/demo';

interface TransferParams {
  direction: IntentSide;
  amount: number;
  sender: string;
  receiver: string;
  complianceStatus: string;
}

interface TransferResult {
  success: boolean;
  message: string;
  params?: TransferParams;
  error?: string;
  txHash?: string;
  provider?: string;
}

export function useNexusTransfer() {
  const { setProvider, provider } = useNexus();
  const [isPreparing, setIsPreparing] = useState(false);

  const prepareTransfer = useCallback(async (params: TransferParams): Promise<TransferResult> => {
    setIsPreparing(true);
    try {
      // Log the transfer parameters for debugging
      console.log('Preparing Nexus transfer with params:', params); 
      
      // Here you can add any pre-transfer logic
      // For example, setting up the provider, validating parameters, etc.
      
      // Simulate some preparation time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        message: 'Transfer prepared successfully',
        params,
        provider: 'nexus'
      };
    } catch (error) {
      console.error('Failed to prepare transfer:', error);
      return {
        success: false,
        message: 'Failed to prepare transfer',
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'nexus'
      };
    } finally {
      setIsPreparing(false);
    }
  }, []);

  const openTransfer = useCallback(async (params: TransferParams): Promise<TransferResult> => {
    const result = await prepareTransfer(params);
    if (result.success) {
      // The actual transfer opening is handled by the TransferButton component
      // This hook just prepares the parameters and validates them
      console.log('Transfer ready to open with params:', result.params);
    }
    return result;
  }, [prepareTransfer]);

  const openBridge = useCallback(async (params: TransferParams): Promise<TransferResult> => {
    const result = await prepareTransfer(params);
    if (result.success) {
      // The actual bridge opening is handled by the BridgeButton component
      // This hook just prepares the parameters and validates them
      console.log('Bridge ready to open with params:', result.params);
    }
    return result;
  }, [prepareTransfer]);

  return {
    provider,
    setProvider,
    isPreparing,
    prepareTransfer,
    openTransfer,
    openBridge,
  };
}
