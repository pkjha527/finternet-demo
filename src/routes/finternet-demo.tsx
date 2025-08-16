import { createFileRoute } from '@tanstack/react-router'
import PaymentIntentDemo from '../pages/PaymentIntentDemo'

export const Route = createFileRoute('/finternet-demo')({
  component: FinternetDemoPage,
})

function FinternetDemoPage() {
  return <PaymentIntentDemo />
}
