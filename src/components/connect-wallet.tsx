import { useState } from 'react'
import {
  usePrivy,
  useWallets,
} from '@privy-io/react-auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function WalletConnection() {
  const { connectWallet, login, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [isConnecting, setIsConnecting] = useState(false)

  const connectExternalWallet = async () => {
    try {
      setIsConnecting(true)
      if (!authenticated) {
        login()
      } else {
        connectWallet()
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  // Note: We're not automatically setting up the provider here
  // to avoid showing Avail branding during wallet connection.
  // The provider will be set up when actually needed for transfers.

  return (
    <div
      className={cn(
        'max-w-md mx-auto p-4',
        authenticated && wallets.length > 0 && 'invisible',
      )}
    >
      <div className="text-center">
        <Button
          onClick={connectExternalWallet}
          disabled={isConnecting || (authenticated && wallets.length > 0)}
          size="lg"
          className="min-w-[200px]"
        >
          {isConnecting
            ? 'Connecting...'
            : authenticated && wallets.length > 0
              ? 'Connected'
              : 'Connect Wallet & Login'}
        </Button>
      </div>
    </div>
  )
}
