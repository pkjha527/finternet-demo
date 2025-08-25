import { determineCorridor, getCorridorInfo, validateCorridorRules } from './corridorRules';
import type { Party, TokenType } from '../../types/demo';

// Demo function to showcase corridor rules
export function runCorridorDemo() {
  console.log('🚀 Finternet Corridor Rules Demo\n');

  // Test different sender-receiver combinations
  const testCases: Array<{
    name: string;
    sender: Party;
    receiver: Party;
    amount: number;
    token: TokenType;
  }> = [
    {
      name: 'USA → Singapore (USDC)',
      sender: {
        label: 'Sender',
        wallet: '0x1234567890123456789012345678901234567890',
        kycLevel: 'Full',
        isSanctioned: false,
        country: 'US',
        jurisdiction: 'USA'
      },
      receiver: {
        label: 'Receiver',
        wallet: '0x2345678901234567890123456789012345678901',
        kycLevel: 'Basic',
        isSanctioned: false,
        country: 'SG',
        jurisdiction: 'Singapore'
      },
      amount: 100000, // $100K
      token: 'USDC'
    },
    {
      name: 'EU → Japan (Blocked)',
      sender: {
        label: 'Sender',
        wallet: '0x3456789012345678901234567890123456789012',
        kycLevel: 'Full',
        isSanctioned: false,
        country: 'DE',
        jurisdiction: 'EU'
      },
      receiver: {
        label: 'Receiver',
        wallet: '0x9012345678901234567890123456789012345678',
        kycLevel: 'Full',
        isSanctioned: false,
        country: 'JP',
        jurisdiction: 'Japan'
      },
      amount: 50000, // $50K
      token: 'USDC'
    },
    {
      name: 'Singapore → Japan (USDT)',
      sender: {
        label: 'Sender',
        wallet: '0x2345678901234567890123456789012345678901',
        kycLevel: 'Full',
        isSanctioned: false,
        country: 'SG',
        jurisdiction: 'Singapore'
      },
      receiver: {
        label: 'Receiver',
        wallet: '0x9012345678901234567890123456789012345678',
        kycLevel: 'Basic',
        isSanctioned: false,
        country: 'JP',
        jurisdiction: 'Japan'
      },
      amount: 75000, // $75K
      token: 'USDT'
    },
    {
      name: 'EU → Singapore (High Amount)',
      sender: {
        label: 'Sender',
        wallet: '0x3456789012345678901234567890123456789012',
        kycLevel: 'Full',
        isSanctioned: false,
        country: 'DE',
        jurisdiction: 'EU'
      },
      receiver: {
        label: 'Receiver',
        wallet: '0x2345678901234567890123456789012345678901',
        kycLevel: 'Full',
        isSanctioned: false,
        country: 'SG',
        jurisdiction: 'Singapore'
      },
      amount: 300000, // $300K - triggers dual approval
      token: 'USDC'
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test Case ${index + 1}: ${testCase.name} ---`);
    
    // Determine corridor
    const corridorId = determineCorridor(testCase.sender, testCase.receiver);
    
    if (corridorId) {
      const corridorInfo = getCorridorInfo(corridorId);
      console.log(`📍 Corridor: ${corridorInfo.name}`);
      console.log(`📊 Status: ${corridorInfo.isActive ? '✅ Active' : '❌ Blocked'}`);
      
      if (corridorInfo.isActive) {
        // Validate corridor rules
        const validation = validateCorridorRules(
          corridorId,
          testCase.sender,
          testCase.receiver,
          testCase.amount,
          testCase.token
        );
        
        console.log(`🔍 Compliance: ${validation.compliant ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`💰 Amount: $${testCase.amount.toLocaleString()}`);
        console.log(`🪙 Token: ${testCase.token}`);
        
        if (!validation.compliant) {
          console.log('❌ Violations:');
          validation.reasons.forEach(reason => console.log(`   • ${reason}`));
        } else {
          console.log('✅ All corridor rules satisfied');
          if (validation.metadata.amlRequired) {
            console.log('⚠️  AML check required');
          }
          if (validation.metadata.dualApprovalRequired) {
            console.log('⚠️  Dual approval required');
          }
        }
        
        console.log(`📋 Rules Applied: ${validation.appliedRules.join(', ')}`);
      } else {
        console.log('🚫 Trading blocked on this corridor');
      }
    } else {
      console.log('❓ No specific corridor identified');
    }
  });

  console.log('\n🎯 Demo completed! Check the console for detailed results.');
}

// Export for use in other parts of the application
export default runCorridorDemo;
