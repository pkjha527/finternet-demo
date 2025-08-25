import { useEffect, useState } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { BridgeButton, TransferButton, useNexus } from '@avail-project/nexus/ui'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { evaluatePreTx } from '../lib/rules/engine.min'
import { getAvailableTestWallets } from '../lib/rules/mockValidationEngine'
import { useNexusTransfer } from '../hooks/useNexusTransfer'
import { determineCorridor, getActiveCorridors, getCorridorInfo } from '../lib/rules/corridorRules'
import type { IntentSide, Party } from '../types/demo'
import FinternetIdInput from '../components/ui/finternet-id-input'
import EnhancedUserProfile from '../components/ui/enhanced-user-profile'
import EnhancedCard from '../components/ui/enhanced-card'
import ComplianceStatus from '../components/ui/compliance-status'
import ProgressFlow from '../components/ui/progress-flow'
import WalletConnection from '@/components/connect-wallet'
import { findUserByWalletAddress, getAllFinternetUsers, resolveFinternetId } from '../lib/constants/finternetUsers'

export default function PaymentIntentDemo() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { setProvider, provider, sdk } = useNexus()
  const { isPreparing, openTransfer, openBridge } = useNexusTransfer()

  console.log('wallets', getAvailableTestWallets())

  // Get available test wallets
  const activeCorridors = getActiveCorridors()

  const [receiverFinternetId, setReceiverFinternetId] = useState<string>('maria@finternet.sg')
  
  // Automatically detect sender from connected wallet
  const connectedWalletAddress = wallets.length > 0 ? wallets[0]?.address : null
  const senderUser = connectedWalletAddress ? findUserByWalletAddress(connectedWalletAddress) : null
  const senderFinternetId = senderUser?.finternetId ?? ''
  
  // Resolve receiver Finternet ID to user object
  const receiverUser = resolveFinternetId(receiverFinternetId)
  
  // Convert to Party objects for corridor validation
  const sender: Party = senderUser ? {
    label: 'Sender',
    wallet: senderUser.walletAddress,
    kycLevel: senderUser.kycLevel,
    isSanctioned: senderUser.isSanctioned,
    country: senderUser.countryCode,
    jurisdiction: senderUser.jurisdiction
  } : {
    label: 'Sender',
    wallet: '',
    kycLevel: 'None',
    isSanctioned: true,
    country: 'US',
    jurisdiction: 'USA'
  }
  
  const receiver: Party = receiverUser ? {
    label: 'Receiver',
    wallet: receiverUser.walletAddress,
    kycLevel: receiverUser.kycLevel,
    isSanctioned: receiverUser.isSanctioned,
    country: receiverUser.countryCode,
    jurisdiction: receiverUser.jurisdiction
  } : {
    label: 'Receiver',
    wallet: '',
    kycLevel: 'None',
    isSanctioned: true,
    country: 'SG',
    jurisdiction: 'Singapore'
  }
  const [side, setSide] = useState<IntentSide>('USDC_TO_USDT')
  const [amount, setAmount] = useState<number>(5)
  const [receiverAddr] = useState<string>(
    '0x2345678901234567890123456789012345678901',
  )
  const [validation, setValidation] = useState<{
    ok: boolean
    reasons: Array<string>
    metadata?: Record<string, any>
  } | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [currentStep, setCurrentStep] = useState<
    'setup' | 'validation' | 'transfer'
  >('setup')
  const [showWalletPopup, setShowWalletPopup] = useState(false)

  // Determine current corridor
  const currentCorridor = determineCorridor(sender, receiver)
  const corridorInfo = currentCorridor ? getCorridorInfo(currentCorridor) : null

  // Effect to handle wallet connection and update sender state
  useEffect(() => {
    if (wallets.length > 0 && wallets[0]?.address) {
      // For demo purposes, we'll keep using Finternet IDs
      // The connected wallet will be used for actual transactions
      // but the sender/receiver will still be Finternet users for compliance
      
      // Setup provider if not already set (only when wallet is actually connected)
      if (!provider) {
        setupProvider()
      }

      // Close wallet connection popup when wallet is connected
      setShowWalletPopup(false)
    } else if (wallets.length > 0 && !wallets[0]?.address) {
      // Wallet object exists but no address - treat as not connected
      // No need to update sender state - we're using Finternet IDs
    } else {
      // Reset entire sender state when no wallet is connected
      // No need to update sender state - we're using Finternet IDs
    }
  }, [wallets, provider])

  

  const setupProvider = async () => {
    if (wallets.length > 0) {
      try {
        const ethProvider = await wallets[0].getEthereumProvider()
        setProvider(ethProvider)
      } catch (error) {
        console.error('Failed to setup provider:', error)
      }
    }
  }

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Finternet Compliance Demo</h1>
        <p className="text-lg text-muted-foreground">
          Configure sender and receiver details for USDC ↔ USDT transfer with Finternet compliance rules
        </p>
      </div>

      {/* Progress Flow Indicator */}
      <EnhancedCard variant="compliance" elevated>
        <ProgressFlow
          steps={[
            { id: 'setup', label: 'Setup', description: 'Configure users', status: 'active' },
            { id: 'validation', label: 'Validation', description: 'Check compliance', status: 'pending' },
            { id: 'transfer', label: 'Transfer', description: 'Execute transaction', status: 'pending' }
          ]}
          currentStep="setup"
        />
      </EnhancedCard>

      {/* Wallet Connection Status */}
      <EnhancedCard 
        variant={authenticated && wallets.length > 0 ? 'success' : 'warning'}
        elevated
        icon={authenticated && wallets.length > 0 ? '🔗' : '🔌'}
        title="Wallet Connection"
        subtitle={authenticated && wallets.length > 0 ? 'Connected and ready for transactions' : 'Connect your wallet to continue'}
      >
        {!authenticated || wallets.length === 0 ? (
          <WalletConnection />
        ) : (
          <div className="space-y-4">
            <ComplianceStatus
              status="compliant"
              label="Wallet Connected"
              description="Ready for Finternet compliance checks"
              size="lg"
            />
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">
                <strong>Connected Address:</strong> {wallets[0]?.address?.slice(0, 8)}...{wallets[0]?.address?.slice(-6)}
              </div>
            </div>
          </div>
        )}
      </EnhancedCard>

      {/* Sender Configuration */}
      <EnhancedCard 
        variant="compliance"
        elevated
        icon="👤"
        title="Sender Configuration"
        subtitle="Automatically detected from connected wallet"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Sender (Auto-detected from connected wallet)</div>
            {connectedWalletAddress ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 font-mono">
                  Wallet: {connectedWalletAddress.slice(0, 8)}...{connectedWalletAddress.slice(-6)}
                </div>
                {senderUser ? (
                  <div className="text-lg font-medium text-gray-900">{senderFinternetId}</div>
                ) : (
                  <div className="text-sm text-yellow-600">
                    ⚠️ Wallet not found in Finternet registry. Please ensure you're using a registered wallet.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No wallet connected</div>
            )}
          </div>
          
          {senderUser && (
            <EnhancedUserProfile
              user={senderUser}
              label="Sender"
              showWallet={false}
              variant="elevated"
            />
          )}
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-700">
              <strong>Note:</strong> The connected wallet will be used for actual transactions, 
              but compliance rules are based on the selected Finternet user's profile.
            </div>
          </div>
        </div>
      </EnhancedCard>

      {/* Receiver Configuration */}
      <EnhancedCard 
        variant="compliance"
        elevated
        icon="👥"
        title="Receiver Configuration"
        subtitle="Select the recipient Finternet user"
      >
        <div className="space-y-4">
          <FinternetIdInput
            value={receiverFinternetId}
            onChange={setReceiverFinternetId}
            label="Receiver Finternet ID"
            placeholder="Enter receiver Finternet ID (e.g., maria@finternet.sg)"
          />
          
          {receiverUser && (
            <EnhancedUserProfile
              user={receiverUser}
              label="Receiver"
              showWallet={false}
              variant="elevated"
            />
          )}
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-700">
              <strong>Note:</strong> The receiver's wallet address will be used for actual transactions, 
              but compliance rules are based on the selected Finternet user's profile.
            </div>
          </div>
        </div>
      </EnhancedCard>

      {/* Corridor Information */}
      <EnhancedCard 
        variant="compliance"
        elevated
        icon="🌐"
        title="Finternet Corridor Rules"
        subtitle="Compliance requirements for the selected route"
      >
        <div className="space-y-4">
          {currentCorridor && corridorInfo ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">
                  Current Corridor: {corridorInfo.name}
                </h4>
                <p className="text-sm text-blue-700">
                  {corridorInfo.isActive 
                    ? '✅ Active corridor with specific compliance rules'
                    : '❌ Corridor is blocked - no trading allowed'
                  }
                </p>
              </div>

              {corridorInfo.rules.map((rule, index) => (
                <div key={rule.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-gray-800 mb-2">
                    Rule {index + 1}: {rule.description}
                  </h5>
                  
                  <div className="space-y-2 text-sm">
                    {rule.amountLimit !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount Limit:</span>
                        <span className="font-medium">${rule.amountLimit.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {rule.kycRequirements && (
                      <div className="space-y-1">
                        <div className="text-gray-600 font-medium">KYC Requirements:</div>
                        <div className="pl-4 text-gray-700">
                          <div>Sender: {rule.kycRequirements.sender}</div>
                          <div>Receiver: {rule.kycRequirements.receiver}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {rule.kycRequirements.description}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {rule.tokenRestrictions && (
                      <div className="space-y-1">
                        <div className="text-gray-600 font-medium">Token Restrictions:</div>
                        <div className="pl-4 text-gray-700">
                          <div>Allowed: {rule.tokenRestrictions.allowedTokens.join(', ')}</div>
                          {rule.tokenRestrictions.inflowTokens && (
                            <div>Inflow: {rule.tokenRestrictions.inflowTokens.join(', ')}</div>
                          )}
                          {rule.tokenRestrictions.outflowTokens && (
                            <div>Outflow: {rule.tokenRestrictions.outflowTokens.join(', ')}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {rule.tokenRestrictions.description}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {rule.amlRequirements && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">AML Threshold:</span>
                        <span className="font-medium">${rule.amlRequirements.threshold.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {rule.dualApproval && rule.dualApproval.required && (
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="text-yellow-800 text-sm">
                          <strong>⚠️ Dual Approval Required:</strong> {rule.dualApproval.description}
                        </div>
                      </div>
                    )}
                    
                    {rule.specialNotes && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-blue-800 text-sm">
                          <strong>ℹ️ Note:</strong> {rule.specialNotes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-600 text-center">
                No specific corridor identified for this sender-receiver combination.
                <br />
                Basic Finternet compliance rules will apply.
              </p>
            </div>
          )}

          {/* Available Corridors Overview */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-800 mb-3">Available Finternet Corridors:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeCorridors.map((corridor) => (
                <div 
                  key={corridor.id}
                  className={`p-3 border rounded-lg text-sm ${
                    currentCorridor === corridor.id 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-800">{corridor.name}</div>
                  <div className="text-xs text-gray-600">
                    {corridor.senderJurisdiction} → {corridor.receiverJurisdiction}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {corridor.rules.length} rule{corridor.rules.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </EnhancedCard>

      {/* Available Finternet Users */}
      <Card>
        <CardHeader>
          <CardTitle>Available Finternet Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getAllFinternetUsers().map((user) => (
              <div 
                key={user.finternetId}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  senderFinternetId === user.finternetId
                    ? 'border-green-300 bg-green-50' // Sender (auto-detected)
                    : receiverFinternetId === user.finternetId
                    ? 'border-blue-300 bg-blue-50' // Receiver (selected)
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => {
                  // Only allow setting receiver since sender is auto-detected
                  if (receiverFinternetId !== user.finternetId) {
                    setReceiverFinternetId(user.finternetId);
                  }
                }}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">{user.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{user.displayName}</div>
                    <div className="text-sm text-gray-600 font-mono">{user.finternetId}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`px-2 py-1 rounded-full ${
                    user.kycLevel === 'Full' ? 'bg-green-100 text-green-800' :
                    user.kycLevel === 'Basic' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {user.kycLevel} KYC
                  </span>
                  <span className={`px-2 py-1 rounded-full ${
                    user.isSanctioned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.isSanctioned ? 'Sanctioned' : 'Clear'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {user.country} • {user.jurisdiction}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-700">
              <strong>Tip:</strong> Click on any user card to quickly set them as receiver. 
              Sender is automatically detected from your connected wallet.
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
            {currentCorridor && corridorInfo && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg border">
                <div className="text-sm">
                  <span className="text-gray-600">Corridor Limit: </span>
                  <span className={`font-medium ${
                    amount <= (corridorInfo.rules[0]?.amountLimit || 0) 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    ${(corridorInfo.rules[0]?.amountLimit || 0).toLocaleString()}
                  </span>
                  {amount > (corridorInfo.rules[0]?.amountLimit || 0) && (
                    <span className="text-red-600 text-xs block mt-1">
                      ⚠️ Amount exceeds corridor limit
                    </span>
                  )}
                </div>
              </div>
            )}
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
              <span className="font-medium text-blue-700">
                Current Configuration
              </span>
              <span className="text-sm text-blue-600">
                {!sender.wallet
                  ? '🔴 NO WALLET'
                  : sender.kycLevel === 'Full' &&
                      !sender.isSanctioned &&
                      receiver.kycLevel === 'Full' &&
                      !receiver.isSanctioned
                    ? '🟢 COMPLIANT'
                    : '🔴 NON-COMPLIANT'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Sender KYC:</span>
                  <span
                    className={`font-medium ${
                      !sender.wallet
                        ? 'text-yellow-600'
                        : sender.kycLevel === 'Full'
                          ? 'text-green-600'
                          : 'text-red-600'
                    }`}
                  >
                    {!sender.wallet
                      ? 'None'
                      : sender.kycLevel === 'Full'
                        ? '✅ PASS'
                        : '❌ FAIL'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sender Sanctions:</span>
                  <span
                    className={`font-medium ${
                      !sender.wallet
                        ? 'text-yellow-600'
                        : !sender.isSanctioned
                          ? 'text-green-600'
                          : 'text-red-600'
                    }`}
                  >
                    {!sender.wallet
                      ? 'Pending Verification'
                      : !sender.isSanctioned
                        ? '✅ PASS'
                        : '❌ FAIL'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Receiver KYC:</span>
                  <span
                    className={`font-medium ${
                      receiver.kycLevel === 'Full'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {receiver.kycLevel === 'Full' ? '✅ PASS' : '❌ FAIL'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Receiver Sanctions:</span>
                  <span
                    className={`font-medium ${
                      !receiver.isSanctioned ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {!receiver.isSanctioned ? '✅ PASS' : '❌ FAIL'}
                  </span>
                </div>
              </div>
            </div>

            {!sender.wallet ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700 text-sm font-medium">
                  ⚠️ Please connect your wallet first to verify KYC level and sanctions status.
                </p>
              </div>
            ) : sender.kycLevel === 'Full' &&
              !sender.isSanctioned &&
              receiver.kycLevel === 'Full' &&
              !receiver.isSanctioned ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm font-medium">
                  ✅ All compliance requirements are met. You can proceed to
                  validation.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700 text-sm font-medium">
                  ⚠️ Some compliance requirements are not met. Please select a
                  compliant receiver wallet.
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
            setIsValidating(true)
            try {
              const decision = await evaluatePreTx(sender, receiver, amount, side === 'USDC_TO_USDT' ? 'USDC' : 'USDT')
              if (decision.outcome === 'ALLOW') {
                setCurrentStep('validation')
              } else {
                // Show validation errors without changing step
                setValidation({
                  ok: false,
                  reasons: decision.reasons,
                  metadata: decision.metadata,
                })
              }
            } catch (error) {
              console.error('Validation error:', error)
              setValidation({
                ok: false,
                reasons: ['Validation failed - please try again'],
                metadata: { error: true },
              })
            } finally {
              setIsValidating(false)
            }
          }}
          disabled={
            !authenticated ||
            !sender.wallet ||
            isValidating ||
            !(
              sender.kycLevel === 'Full' &&
              !sender.isSanctioned &&
              receiver.kycLevel === 'Full' &&
              !receiver.isSanctioned
            )
          }

          className="w-full"
        >
          {!authenticated
            ? 'Connect Wallet First'
            : !sender.wallet
              ? 'Connect Wallet to Verify Compliance'
              : isValidating
                ? 'Validating Compliance...'
                : sender.kycLevel === 'Full' &&
                    !sender.isSanctioned &&
                    receiver.kycLevel === 'Full' &&
                    !receiver.isSanctioned
                  ? 'Validate & Continue →'
                  : 'Fix Compliance Issues First'}

        </Button>

        {/* Show validation errors if they exist */}
        {validation && !validation.ok && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">
              Compliance Check Failed
            </h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validation.reasons.map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {validation.metadata &&
              Object.keys(validation.metadata).length > 0 && (
                <div className="mt-3 p-3 bg-red-100 rounded">
                  <p className="text-xs font-medium text-red-800 mb-2">
                    Validation Details:
                  </p>
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
              Please fix the compliance issues before proceeding to the next
              step.
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const renderValidationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Finternet Compliance Validation</h1>
        <p className="text-lg text-muted-foreground">
          Finternet compliance rules have been validated successfully
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
              <p className="text-green-700 font-medium">
                All Finternet compliance rules have been satisfied!
              </p>
            </div>

            {/* Show validation metadata */}
            {validation?.metadata &&
              Object.keys(validation.metadata).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">
                    Validation Details:
                  </h4>
                  
                  {/* Corridor Information */}
                  {validation.metadata.corridorInfo && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-800 mb-2">
                        Corridor: {validation.metadata.corridorInfo.name}
                      </h5>
                      <div className="text-sm text-blue-700">
                        Status: {validation.metadata.corridorInfo.isActive ? '✅ Active' : '❌ Blocked'}
                      </div>
                    </div>
                  )}

                  {/* Corridor Validation Results */}
                  {validation.metadata.corridorValidation && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-2">
                        Corridor-Specific Validation
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Corridor Status:</span>
                            <span className={`font-medium ${
                              validation.metadata.corridorValidation.complianceStatus === 'COMPLIANT' 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {validation.metadata.corridorValidation.complianceStatus}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Amount Limit:</span>
                            <span className="font-medium">
                              ${validation.metadata.corridorValidation.amountLimit?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>AML Required:</span>
                            <span className={`font-medium ${
                              validation.metadata.corridorValidation.amlRequired ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {validation.metadata.corridorValidation.amlRequired ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Dual Approval:</span>
                            <span className={`font-medium ${
                              validation.metadata.corridorValidation.dualApprovalRequired ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {validation.metadata.corridorValidation.dualApprovalRequired ? 'Required' : 'Not Required'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rules Applied:</span>
                            <span className="font-medium">
                              {validation.metadata.corridorValidation.rulesApplied?.length || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Token Restrictions:</span>
                            <span className="font-medium text-xs">
                              {validation.metadata.corridorValidation.tokenRestrictions?.join(', ') || 'None'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
                        <span
                          className={`text-sm font-medium ${
                            validation.metadata.overallRiskScore === 'LOW'
                              ? 'text-green-600'
                              : validation.metadata.overallRiskScore ===
                                  'MEDIUM'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
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
                        <span
                          className={`text-sm font-medium ${
                            validation.metadata.receiverKycStatus === 'PASSED'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {validation.metadata.receiverKycStatus}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Receiver Sanctions:</span>
                        <span
                          className={`text-sm font-medium ${
                            validation.metadata.receiverSanctionsStatus ===
                            'CLEAR'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {validation.metadata.receiverSanctionsStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            <div className="text-center">
              <Button
                onClick={() => setCurrentStep('transfer')}
                className="w-full"
              >
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
  )

  const renderTransferStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Execute Finternet-Compliant Transfer</h1>
        <p className="text-lg text-muted-foreground">
          Use Nexus UI to complete the Finternet-compliant USDC ↔ USDT transfer
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
                <span>
                  {side === 'USDC_TO_USDT' ? 'USDC → USDT' : 'USDT to USDC'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount:</span>
                <span>${amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Sender:</span>
                <span className="text-sm">
                  {sdk?.utils?.truncateAddress(sender.wallet, 4, 8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Receiver:</span>
                <span className="text-sm">
                  {sdk?.utils?.truncateAddress(receiverAddr, 4, 8)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Sender KYC:</span>
                <span
                  className={
                    sender.kycLevel === 'Full'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {sender.kycLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  ({sender.jurisdiction || sender.country})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Receiver KYC:</span>
                <span
                  className={
                    receiver.kycLevel === 'Full'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {receiver.kycLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  ({receiver.jurisdiction || receiver.country})
                </span>
              </div>
            </div>
          </div>

          {/* Corridor Information */}
          {currentCorridor && corridorInfo && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">
                Finternet Corridor: {corridorInfo.name}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      corridorInfo.isActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {corridorInfo.isActive ? 'Active' : 'Blocked'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Limit:</span>
                    <span className="font-medium">
                      ${corridorInfo.rules[0]?.amountLimit?.toLocaleString() || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Token Restrictions:</span>
                    <span className="font-medium text-xs">
                      {corridorInfo.rules[0]?.tokenRestrictions?.allowedTokens?.join(', ') || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rules Applied:</span>
                    <span className="font-medium">
                      {corridorInfo.rules.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                  Use Nexus to transfer{' '}
                  {side === 'USDC_TO_USDT' ? 'USDC to USDT' : 'USDT to USDC'}
                </p>
                <p className="text-xs text-blue-600 mb-3">
                  Receiver: {receiverAddr.slice(0, 8)}...
                  {receiverAddr.slice(-6)}
                </p>
                <TransferButton
                  prefill={{
                    recipient: receiver?.wallet as `0x${string}`,
                    amount: amount,
                    token: side === 'USDC_TO_USDT' ? 'USDC' : 'USDT',
                  }}
                >
                  {({ onClick, isLoading }) => (
                    <Button
                      onClick={async () => {
                        // Prepare transfer parameters and open Nexus
                        const transferParams = {
                          direction: side,
                          amount: amount,
                          sender: sender.wallet,
                          receiver: receiverAddr,
                          complianceStatus: 'VALIDATED',
                        }

                        const result = await openTransfer(transferParams)
                        if (result.success) {
                          // Auto-populate receiver address in Nexus
                          console.log(
                            'Opening Nexus Transfer with receiver:',
                            receiverAddr,
                          )
                          onClick()
                        } else {
                          console.error(
                            'Failed to prepare transfer:',
                            result.message,
                          )
                        }
                      }}
                      disabled={isLoading || isPreparing}
                      className="w-full font-bold rounded-lg"
                    >
                      {isLoading || isPreparing
                        ? 'Preparing...'
                        : 'Open Transfer'}
                    </Button>
                  )}
                </TransferButton>
              </div>

              <div className="bg-card rounded-lg border border-gray-400 p-6 shadow-sm text-center">
                <h3 className="text-lg font-semibold mb-4">Bridge Tokens</h3>
                <p className="text-sm text-muted-foreground mb-4 text-balance">
                  Bridge tokens across different chains using Nexus
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
                          complianceStatus: 'VALIDATED',
                        }

                        const result = await openBridge(bridgeParams)
                        if (result.success) {
                          // Auto-populate receiver address in Nexus
                          console.log(
                            'Opening Nexus Bridge with receiver:',
                            receiverAddr,
                          )
                          onClick()
                        } else {
                          console.error(
                            'Failed to prepare bridge:',
                            result.message,
                          )
                        }
                      }}
                      disabled={isLoading || isPreparing}
                      className="w-full font-bold rounded-lg"
                    >
                      {isLoading || isPreparing
                        ? 'Preparing...'
                        : 'Open Bridge'}
                    </Button>
                  )}
                </BridgeButton>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Both transfer and bridge operations will respect the Finternet
                compliance rules we validated.
                <br />
                <strong>
                  Receiver address is automatically populated:
                </strong>{' '}
                {receiverAddr}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => setCurrentStep('setup')}
                  variant="outline"
                >
                  ← Back to Setup
                </Button>
                <Button
                  onClick={() => setCurrentStep('validation')}
                  variant="outline"
                >
                  ← Back to Validation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Wallet Connection Popup
  const renderWalletConnectionPopup = () => (
    <Dialog open={showWalletPopup} onOpenChange={setShowWalletPopup}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Connect Your Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Connect your wallet to set the sender address for the transfer
            </p>
            <WalletConnection />
          </div>
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setShowWalletPopup(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div
            className={`flex items-center ${currentStep === 'setup' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'setup'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300'
              }`}
            >
              1
            </div>
            <span className="ml-2 font-medium">Setup & Connect</span>
          </div>

          <div
            className={`w-16 h-0.5 ${currentStep === 'validation' || currentStep === 'transfer' ? 'bg-blue-600' : 'bg-gray-300'}`}
          ></div>

          <div
            className={`flex items-center ${currentStep === 'validation' ? 'text-blue-600' : currentStep === 'transfer' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'validation'
                  ? 'border-blue-600 bg-blue-50'
                  : currentStep === 'transfer'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300'
              }`}
            >
              2
            </div>
            <span className="ml-2 font-medium">Validate Finternet Rules</span>
          </div>

          <div
            className={`w-16 h-0.5 ${currentStep === 'transfer' ? 'bg-green-600' : 'bg-gray-300'}`}
          ></div>

          <div
            className={`flex items-center ${currentStep === 'transfer' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'transfer'
                  ? 'border-green-600 bg-green-50'
                  : 'border-gray-300'
              }`}
            >
              3
            </div>
            <span className="ml-2 font-medium">Execute Transfer</span>
          </div>
        </div>
      </div>

      {currentStep === 'setup' && renderSetupStep()}
      {currentStep === 'validation' && renderValidationStep()}
      {currentStep === 'transfer' && renderTransferStep()}
      
      {/* Wallet Connection Popup */}
      {renderWalletConnectionPopup()}
    </div>
  )
}
