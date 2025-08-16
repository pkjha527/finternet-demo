import PaymentIntentDemo from '@/pages/PaymentIntentDemo'

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="min-h-screen">
      <PaymentIntentDemo />
    </div>
  )
}
