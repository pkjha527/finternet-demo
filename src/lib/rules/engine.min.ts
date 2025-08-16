import { evaluatePreTx as mockEvaluatePreTx } from './mockValidationEngine';
import type { Decision, Party } from '../../types/demo';

// Use mock validation engine for demo purposes
export async function evaluatePreTx(sender: Party, receiver: Party): Promise<Decision> {
  try {
    // Use mock validation engine instead of backend API
    return await mockEvaluatePreTx(sender, receiver);
  } catch (error) {
    console.error('Mock validation failed:', error);
    // Fallback to basic validation if mock engine fails
    return fallbackValidation(sender, receiver);
  }
}

// Fallback validation for when mock engine is unavailable
function fallbackValidation(sender: Party, receiver: Party): Decision {
  const reasons: Array<string> = [];
  
  // Rule 1: KYC Full for both parties
  if (sender.kycLevel !== 'Full' || receiver.kycLevel !== 'Full') {
    reasons.push('Both parties must pass Full KYC.');
  }
  
  // Rule 2: Sanctions/PEP not flagged
  if (sender.isSanctioned || receiver.isSanctioned) {
    reasons.push('Sanctions/PEP screen failed.');
  }
  
  return { 
    outcome: reasons.length === 0 ? 'ALLOW' : 'REJECT', 
    reasons,
    metadata: { fallback: true, message: 'Using fallback validation - mock engine unavailable' }
  };
}
