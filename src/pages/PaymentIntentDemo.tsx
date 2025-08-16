import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { BridgeButton, TransferButton, useNexus } from '@avail-project/nexus/ui';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { evaluatePreTx } from '../lib/rules/engine.min';
import { getAvailableTestWallets } from '../lib/rules/mockValidationEngine';
import { useNexusTransfer } from '../hooks/useNexusTransfer';
import type { IntentSide, Party } from '../types/demo';

export default function PaymentIntentDemo() {
  const { connectWallet, login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { setProvider, provider } = useNexus();
  const { isPreparing, openTransfer, openBridge } = useNexusTransfer();
  
  // Get available test wallets
  const availableWallets = getAvailableTestWallets();
  
  const [sender, setSender] = useState<Party>({
    label: 'Sender',
    wallet: '', // Will be set when wallet connects
    kycLevel: 'Full',
    isSanctioned: false
  });
  const [receiver, setReceiver] = useState<Party>({
    label: 'Receiver',
    wallet: '0x2345678901234567890123456789012345678901',
    kycLevel: 'Full',
    isSanctioned: false
  });
  const [side, setSide] = useState<IntentSide>('USDC_TO_USDT');
  const [amount, setAmount] = useState<number>(5);
  const [receiverAddr, setReceiverAddr] = useState<string>('0x2345678901234567890123456789012345678901');
  const [validation, setValidation] = useState<{
    ok: boolean; 
    reasons: Array<string>;
    metadata?: Record<string, any>;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'setup' | 'validation' | 'transfer'>('setup');
  
  // Effect to handle wallet connection and update sender state
  useEffect(() => {
    if (wallets.length > 0 && wallets[0]?.address) {
      // Update sender with connected wallet address
      setSender(prev => ({ 
        ...prev, 
        wallet: wallets[0].address 
      }));
      
      // Setup provider if not already set
      if (!provider) {
        setupProvider();
      }
    } else {
      // Clear sender wallet when no wallet is connected
      setSender(prev => ({ 
        ...prev, 
        wallet: '' 
      }));
    }
  }, [wallets, provider]);
  
  // Helper function to update receiver when wallet changes
  const updateReceiverFromWallet = (walletAddress: string) => {
    const walletInfo = availableWallets.find(w => w.address === walletAddress);
    if (walletInfo) {
      const updatedReceiver: Party = {
        label: 'Receiver',
        wallet: walletAddress,
        kycLevel: walletInfo.kycLevel,
        isSanctioned: walletInfo.isSanctioned
      };
      setReceiver(updatedReceiver);
      setReceiverAddr(walletAddress);
    }
  };

  const onValidate = async () => {
    setIsValidating(true);
    try {
      // Evaluate rules using mock validation engine
      const decision = await evaluatePreTx(sender, receiver);
      
      setValidation({ 
        ok: decision.outcome === 'ALLOW', 
        reasons: decision.reasons,
        metadata: decision.metadata
      });
      
      if (decision.outcome === 'ALLOW') {
        setCurrentStep('transfer');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidation({ 
        ok: false, 
        reasons: ['Validation failed - please try again'],
        metadata: { error: true }
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleConnectWallet = async () => {
    if (!authenticated) {
      await login();
    } else {
      await connectWallet();
    }
  };

  const setupProvider = async () => {
    if (wallets.length > 0) {
      try {
        const ethProvider = await wallets[0].getEthereumProvider();
        setProvider(ethProvider);
      } catch (error) {
        console.error('Failed to setup provider:', error);
      }
    }
  };



  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Setup Transfer</h1>
        <p className="text-lg text-muted-foreground">
          Configure sender and receiver details for USDC ↔ USDT transfer
        </p>
      </div>

      {/* Wallet Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Connection</CardTitle>
        </CardHeader>
        <CardContent>
          {!authenticated ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Connect your wallet to continue</p>
              <Button onClick={login} className="w-full">
                Connect Wallet
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="font-medium">✅ Wallet Connected</span>
              <span className="text-sm text-green-600">
                {wallets[0]?.address?.slice(0, 8) + '...'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sender Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Sender Configuration (Connected Wallet)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sender-wallet">Sender Wallet</Label>
            {sender.wallet ? (
              <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                <span className="font-medium text-green-700">
                  {sender.wallet.slice(0, 8)}...{sender.wallet.slice(-6)} - 🟢 COMPLIANT
                </span>
              </div>
            ) : (
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-gray-500">
                  Connect wallet to set sender address
                </span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Your connected wallet - automatically treated as compliant (Full KYC, no sanctions)
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>KYC Level</Label>
              <div className="p-2 bg-green-50 rounded border border-green-200">
                <span className="font-medium text-green-600">
                  {sender.wallet ? 'Full' : 'Pending'}
                </span>
              </div>
            </div>
            <div>
              <Label>Sanctions Status</Label>
              <div className="p-2 bg-green-50 rounded border border-green-200">
                <span className="font-medium text-green-600">
                  {sender.wallet ? 'Clear' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receiver Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Receiver Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="receiver-wallet">Receiver Wallet</Label>
            <select
              id="receiver-wallet"
              value={receiver.wallet}
              onChange={(e) => updateReceiverFromWallet(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {availableWallets.map((wallet) => (
                <option key={wallet.address} value={wallet.address}>
                  {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)} - {wallet.description}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground mt-1">
              Select a receiver wallet to test different compliance scenarios
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>KYC Level</Label>
              <div className="p-2 bg-gray-50 rounded border">
                <span className={`font-medium ${
                  receiver.kycLevel === 'Full' ? 'text-green-600' : 
                  receiver.kycLevel === 'Basic' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {receiver.kycLevel}
                </span>
              </div>
            </div>
            <div>
              <Label>Sanctions Status</Label>
              <div className="p-2 bg-gray-50 rounded border">
                <span className={`font-medium ${receiver.isSanctioned ? 'text-red-600' : 'text-green-600'}`}>
                  {receiver.isSanctioned ? 'Flagged' : 'Clear'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="transfer-direction">Transfer Direction</Label>
            <select
              id="transfer-direction"
              value={side}
              onChange={(e) => setSide(e.target.value as IntentSide)}
              className="w-full p-2 border rounded-md"
            >
              <option value="USDC_TO_USDT">USDC → USDT</option>
              <option value="USDT_TO_USDC">USDT → USDC</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <input
              id="amount"
              type="number"
              min="1"
              max="25"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full p-2 border rounded-md"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Maximum: $25 (demo limit)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium text-blue-700">Current Configuration</span>
              <span className="text-sm text-blue-600">
                {!sender.wallet ? '🔴 NO WALLET' :
                 sender.kycLevel === 'Full' && !sender.isSanctioned && 
                 receiver.kycLevel === 'Full' && !receiver.isSanctioned 
                   ? '🟢 COMPLIANT' : '🔴 NON-COMPLIANT'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Sender KYC:</span>
                  <span className={`font-medium ${
                    !sender.wallet ? 'text-gray-500' :
                    sender.kycLevel === 'Full' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {!sender.wallet ? 'Pending' :
                     sender.kycLevel === 'Full' ? '✅ PASS' : '❌ FAIL'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sender Sanctions:</span>
                  <span className={`font-medium ${
                    !sender.wallet ? 'text-gray-500' :
                    !sender.isSanctioned ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {!sender.wallet ? 'Pending' :
                     !sender.isSanctioned ? '✅ PASS' : '❌ FAIL'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Receiver KYC:</span>
                  <span className={`font-medium ${
                    receiver.kycLevel === 'Full' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {receiver.kycLevel === 'Full' ? '✅ PASS' : '❌ FAIL'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Receiver Sanctions:</span>
                  <span className={`font-medium ${
                    !receiver.isSanctioned ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {!receiver.isSanctioned ? '✅ PASS' : '❌ FAIL'}
                  </span>
                </div>
              </div>
            </div>
            
            {!sender.wallet ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700 text-sm font-medium">
                  ⚠️ Please connect your wallet first to proceed.
                </p>
              </div>
            ) : sender.kycLevel === 'Full' && !sender.isSanctioned && 
                receiver.kycLevel === 'Full' && !receiver.isSanctioned ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm font-medium">
                  ✅ All compliance requirements are met. You can proceed to validation.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700 text-sm font-medium">
                  ⚠️ Some compliance requirements are not met. Please select a compliant receiver wallet.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button 
          onClick={async () => {
            // Validate compliance before proceeding
            setIsValidating(true);
            try {
              const decision = await evaluatePreTx(sender, receiver);
              if (decision.outcome === 'ALLOW') {
                setCurrentStep('validation');
              } else {
                // Show validation errors without changing step
                setValidation({ 
                  ok: false, 
                  reasons: decision.reasons,
                  metadata: decision.metadata
                });
              }
            } catch (error) {
              console.error('Validation error:', error);
              setValidation({ 
                ok: false, 
                reasons: ['Validation failed - please try again'],
                metadata: { error: true }
              });
            } finally {
              setIsValidating(false);
            }
          }} 
          disabled={!authenticated || !sender.wallet || isValidating || 
            !(sender.kycLevel === 'Full' && !sender.isSanctioned && 
              receiver.kycLevel === 'Full' && !receiver.isSanctioned)}
          className="w-full"
        >
          {!authenticated ? 'Connect Wallet First' :
           !sender.wallet ? 'Wallet Not Connected' :
           isValidating ? 'Validating Compliance...' : 
           sender.kycLevel === 'Full' && !sender.isSanctioned && 
           receiver.kycLevel === 'Full' && !receiver.isSanctioned
             ? 'Validate & Continue →'
             : 'Fix Compliance Issues First'}
        </Button>
        
        {/* Show validation errors if they exist */}
        {validation && !validation.ok && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Compliance Check Failed</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validation.reasons.map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {validation.metadata && Object.keys(validation.metadata).length > 0 && (
              <div className="mt-3 p-3 bg-red-100 rounded">
                <p className="text-xs font-medium text-red-800 mb-2">Validation Details:</p>
                <div className="text-xs text-red-700 space-y-1">
                  {Object.entries(validation.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-red-600 mt-3">
              Please fix the compliance issues before proceeding to the next step.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Compliance Validation</h1>
        <p className="text-lg text-muted-foreground">
          Compliance rules have been validated successfully
        </p>
      </div>

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle>✅ Compliance Check Passed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium">All Finternet compliance rules have been satisfied!</p>
            </div>
            
            {/* Show validation metadata */}
            {validation?.metadata && Object.keys(validation.metadata).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Validation Details:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Rules Applied:</span>
                      <span className="text-sm text-gray-600">
                        {validation.metadata.rulesApplied?.length || 0} rules
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Overall Risk:</span>
                      <span className={`text-sm font-medium ${
                        validation.metadata.overallRiskScore === 'LOW' ? 'text-green-600' :
                        validation.metadata.overallRiskScore === 'MEDIUM' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {validation.metadata.overallRiskScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Compliance Status:</span>
                      <span className="text-sm font-medium text-green-600">
                        {validation.metadata.complianceStatus}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Sender KYC:</span>
                      <span className="text-sm text-green-600">
                        {validation.metadata.senderKycStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Sender Sanctions:</span>
                      <span className="text-sm text-green-600">
                        {validation.metadata.senderSanctionsStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Receiver KYC:</span>
                      <span className={`text-sm font-medium ${
                        validation.metadata.receiverKycStatus === 'PASSED' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {validation.metadata.receiverKycStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Receiver Sanctions:</span>
                      <span className={`text-sm font-medium ${
                        validation.metadata.receiverSanctionsStatus === 'CLEAR' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {validation.metadata.receiverSanctionsStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <Button onClick={() => setCurrentStep('transfer')} className="w-full">
                Continue to Transfer →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button onClick={() => setCurrentStep('setup')} variant="outline">
          ← Back to Setup
        </Button>
      </div>
    </div>
  );

  const renderTransferStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Execute Transfer</h1>
        <p className="text-lg text-muted-foreground">
          Use Nexus UI to complete the USDC ↔ USDT transfer
        </p>
      </div>

      {/* Transfer Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Direction:</span>
                <span>{side === 'USDC_TO_USDT' ? 'USDC → USDT' : 'USDT to USDC'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount:</span>
                <span>${amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Sender:</span>
                <span className="text-sm">{sender.wallet}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Receiver:</span>
                <span className="text-sm">{receiverAddr}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Sender KYC:</span>
                <span className={sender.kycLevel === 'Full' ? 'text-green-600' : 'text-red-600'}>
                  {sender.kycLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Receiver KYC:</span>
                <span className={receiver.kycLevel === 'Full' ? 'text-green-600' : 'text-red-600'}>
                  {receiver.kycLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Sender Sanctions:</span>
                <span className={!sender.isSanctioned ? 'text-green-600' : 'text-red-600'}>
                  {sender.isSanctioned ? 'Flagged' : 'Clear'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Receiver Sanctions:</span>
                <span className={!receiver.isSanctioned ? 'text-green-600' : 'text-red-600'}>
                  {receiver.isSanctioned ? 'Flagged' : 'Clear'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nexus Transfer UI with Auto-populated Receiver */}
      <Card>
        <CardHeader>
          <CardTitle>Nexus Transfer Interface</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg border border-gray-400 p-6 shadow-sm text-center">
                <h3 className="text-lg font-semibold mb-4">Transfer Tokens</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use Nexus to transfer {side === 'USDC_TO_USDT' ? 'USDC to USDT' : 'USDT to USDC'}
                </p>
                <p className="text-xs text-blue-600 mb-3">
                  Receiver: {receiverAddr.slice(0, 8)}...{receiverAddr.slice(-6)}
                </p>
                <TransferButton>
                  {({ onClick, isLoading }) => (
                    <Button
                      onClick={async () => {
                        // Prepare transfer parameters and open Nexus
                        const transferParams = {
                          direction: side,
                          amount: amount,
                          sender: sender.wallet,
                          receiver: receiverAddr,
                          complianceStatus: 'VALIDATED'
                        };
                        
                        const result = await openTransfer(transferParams);
                        if (result.success) {
                          // Auto-populate receiver address in Nexus
                          console.log('Opening Nexus Transfer with receiver:', receiverAddr);
                          onClick();
                        } else {
                          console.error('Failed to prepare transfer:', result.message);
                        }
                      }}
                      disabled={isLoading || isPreparing}
                      className="w-full font-bold rounded-lg"
                    >
                      {isLoading || isPreparing ? 'Preparing...' : 'Open Transfer'}
                    </Button>
                  )}
                </TransferButton>
              </div>

              <div className="bg-card rounded-lg border border-gray-400 p-6 shadow-sm text-center">
                <h3 className="text-lg font-semibold mb-4">Bridge Tokens</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Bridge tokens across different chains using Nexus
                </p>
                <p className="text-xs text-blue-600 mb-3">
                  Receiver: {receiverAddr.slice(0, 8)}...{receiverAddr.slice(-6)}
                </p>
                <BridgeButton>
                  {({ onClick, isLoading }) => (
                    <Button
                      onClick={async () => {
                        // Prepare bridge parameters and open Nexus
                        const bridgeParams = {
                          direction: side,
                          amount: amount,
                          sender: sender.wallet,
                          receiver: receiverAddr,
                          complianceStatus: 'VALIDATED'
                        };
                        
                        const result = await openBridge(bridgeParams);
                        if (result.success) {
                          // Auto-populate receiver address in Nexus
                          console.log('Opening Nexus Bridge with receiver:', receiverAddr);
                          onClick();
                        } else {
                          console.error('Failed to prepare bridge:', result.message);
                        }
                      }}
                      disabled={isLoading || isPreparing}
                      className="w-full font-bold rounded-lg"
                    >
                      {isLoading || isPreparing ? 'Preparing...' : 'Open Bridge'}
                    </Button>
                  )}
                </BridgeButton>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Both transfer and bridge operations will respect the Finternet compliance rules we validated.
                <br />
                <strong>Receiver address is automatically populated:</strong> {receiverAddr}
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setCurrentStep('setup')} variant="outline">
                  ← Back to Setup
                </Button>
                <Button onClick={() => setCurrentStep('validation')} variant="outline">
                  ← Back to Validation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${currentStep === 'setup' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'setup' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
            }`}>
              1
            </div>
            <span className="ml-2 font-medium">Setup & Connect</span>
          </div>
          
          <div className={`w-16 h-0.5 ${currentStep === 'validation' || currentStep === 'transfer' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          
          <div className={`flex items-center ${currentStep === 'validation' ? 'text-blue-600' : currentStep === 'transfer' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'validation' ? 'border-blue-600 bg-blue-50' : 
              currentStep === 'transfer' ? 'border-green-600 bg-green-50' : 
              'border-gray-300'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Validate Rules</span>
          </div>
          
          <div className={`w-16 h-0.5 ${currentStep === 'transfer' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
          
          <div className={`flex items-center ${currentStep === 'transfer' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'transfer' ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              3
            </div>
            <span className="ml-2 font-medium">Execute Transfer</span>
          </div>
        </div>
      </div>

      {currentStep === 'setup' && renderSetupStep()}
      {currentStep === 'validation' && renderValidationStep()}
      {currentStep === 'transfer' && renderTransferStep()}
    </div>
  );
}
