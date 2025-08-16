// Example Backend Rules Service
// This is a Node.js/Express example of how to implement the rules validation API

const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Rules validation endpoint
app.post('/api/rules/validate', (req, res) => {
  const { sender, receiver, timestamp, requestId } = req.body;
  
  console.log('Rules validation request:', { sender, receiver, requestId });
  
  // Validate input
  if (!sender || !receiver) {
    return res.status(400).json({
      outcome: 'REJECT',
      reasons: ['Invalid request: missing sender or receiver data'],
      validationId: requestId,
      processedAt: new Date().toISOString()
    });
  }
  
  const reasons = [];
  
  // Rule 1: KYC Level Enforcement
  if (sender.kycLevel !== 'Full' || receiver.kycLevel !== 'Full') {
    reasons.push('Both parties must pass Full KYC verification.');
  }
  
  // Rule 2: Sanctions & PEP Screen
  if (sender.isSanctioned || receiver.isSanctioned) {
    reasons.push('Sanctions/PEP screening failed for one or both parties.');
  }
  
  // Additional business rules can be added here
  // - Transaction amount limits
  // - Geographic restrictions
  // - Time-based rules
  // - Risk scoring
  
  const outcome = reasons.length === 0 ? 'ALLOW' : 'REJECT';
  
  const response = {
    outcome,
    reasons,
    validationId: requestId,
    processedAt: new Date().toISOString(),
    metadata: {
      rulesVersion: '1.0.0',
      rulesApplied: [
        'KYC Level Enforcement',
        'Sanctions & PEP Screen'
      ],
      riskScore: reasons.length === 0 ? 'LOW' : 'HIGH',
      complianceStatus: reasons.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT',
      processingTime: Date.now() - new Date(timestamp).getTime()
    }
  };
  
  console.log('Rules validation response:', response);
  
  // Simulate processing delay
  setTimeout(() => {
    res.json(response);
  }, 500);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get rules configuration
app.get('/api/rules/config', (req, res) => {
  res.json({
    rules: [
      {
        id: 'kyc_enforcement',
        name: 'KYC Level Enforcement',
        description: 'Both parties must have Full KYC verification',
        severity: 'mandatory',
        enabled: true
      },
      {
        id: 'sanctions_screening',
        name: 'Sanctions & PEP Screen',
        description: 'Neither party can be flagged for sanctions',
        severity: 'mandatory',
        enabled: true
      }
    ],
    version: '1.0.0',
    lastUpdated: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Rules service running on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  POST /api/rules/validate - Validate compliance rules');
  console.log('  GET  /api/rules/config  - Get rules configuration');
  console.log('  GET  /health            - Health check');
});

// Example usage:
// curl -X POST http://localhost:3000/api/rules/validate \
//   -H "Content-Type: application/json" \
//   -d '{
//     "sender": {
//       "wallet": "0x1234...",
//       "kycLevel": "Full",
//       "isSanctioned": false
//     },
//     "receiver": {
//       "wallet": "0x5678...",
//       "kycLevel": "Full",
//       "isSanctioned": false
//     },
//     "timestamp": "2024-01-01T00:00:00.000Z",
//     "requestId": "req-123"
//   }'
