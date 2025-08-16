import { usePrivy, useWallets } from '@privy-io/react-auth'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
import Nexus from '@/components/nexus'
import WalletConnection from '@/components/connect-wallet'
import ViewUnifiedBalance from '@/components/view-balance'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Nexus Upgrade</h1>
          <p className="text-lg text-muted-foreground font-semibold">
            Allow users to seamlessly move tokens into your dApp, no bridging,
            and no confusion. Connect your wallet to experience the Nexus
            Effect.
          </p>
        </div>
        
        {/* Finternet Demo Link */}
        <div className="text-center mb-8">
          <Link 
            to="/finternet-demo" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            🚀 Try Finternet Rules Demo
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            Simulate USDC ↔ USDT transfers with compliance rules
          </p>
        </div>
        
        {authenticated && wallets.length > 0 && (
          <div className="flex items-center flex-col gap-y-2">
            <ViewUnifiedBalance />
            <Nexus />
          </div>
        )}

        <div className="text-center">
          {!ready && <Activity className="animate-pulse mx-auto" />}
          {ready && <WalletConnection />}
        </div>
      </div>
    </div>
  )
}
