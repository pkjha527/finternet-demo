# Finternet Rules Demo

This demo showcases a complete Finternet compliance flow for USDC ↔ USDT transfers using Nexus UI components, Privy wallet integration, and **backend-driven rules validation**.

## Features

### 🔐 Backend Rules Engine
- **KYC Level Enforcement**: Both sender and receiver must have "Full" KYC
- **Sanctions Screening**: Neither party can be flagged for sanctions
- **Real-time API validation** with comprehensive metadata
- **Fallback validation** when backend is unavailable
- **Extensible architecture** for additional business rules

### 💳 Complete Transfer Flow
1. **Setup & Connect**: Configure parties and connect wallet via Privy
2. **Validate Rules**: Check compliance via backend API
3. **Execute Transfer**: Use Nexus UI components for actual transfers

### 🚀 Nexus UI Integration
- **TransferButton**: For direct token transfers
- **BridgeButton**: For cross-chain bridging
- Seamless integration with existing Nexus infrastructure

## Architecture

### Backend Rules Service
The demo now uses a **real backend API** instead of mock simulation:

```bash
# Start the backend rules service
node backend-rules-service-example.js
```

**API Endpoints:**
- `POST /api/rules/validate` - Validate compliance rules
- `GET /api/rules/config` - Get rules configuration
- `GET /health` - Health check

**Request Format:**
```json
{
  "sender": {
    "wallet": "0x1234...",
    "kycLevel": "Full",
    "isSanctioned": false
  },
  "receiver": {
    "wallet": "0x5678...",
    "kycLevel": "Full",
    "isSanctioned": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "req-123"
}
```

**Response Format:**
```json
{
  "outcome": "ALLOW",
  "reasons": [],
  "validationId": "req-123",
  "processedAt": "2024-01-01T00:00:01.000Z",
  "metadata": {
    "rulesVersion": "1.0.0",
    "rulesApplied": ["KYC Level Enforcement", "Sanctions & PEP Screen"],
    "riskScore": "LOW",
    "complianceStatus": "COMPLIANT",
    "processingTime": 500
  }
}
```

### Frontend Integration
- **Real API calls** to backend rules service
- **Comprehensive error handling** with fallback validation
- **Rich metadata display** showing validation details
- **Request tracking** with unique IDs and timestamps

## How to Use

### 1. Environment Setup
Copy `.env.template` to `.env` and configure:
```bash
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_DEMO_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_OR_LEAVE_EMPTY
VITE_ENABLE_EXECUTION=false
VITE_MAX_TX_USD=25
VITE_RULES_API_ENDPOINT=http://localhost:3000/api/rules/validate
```

### 2. Start Backend Rules Service
```bash
# Install dependencies
npm install express

# Start the rules service
node backend-rules-service-example.js
```

### 3. Start the Demo
```bash
npm run dev
```
Navigate to `http://localhost:3001/finternet-demo`

### 4. Demo Flow

#### Step 1: Setup & Connect
- Connect your wallet using Privy
- Configure sender and receiver details
- Set KYC levels and sanctions status
- Choose transfer direction (USDC ↔ USDT)
- Set amount (max $25)

#### Step 2: Validate Rules
- Click "Validate Rules & Continue"
- **Backend API validates compliance rules**
- View detailed validation results with metadata
- See risk scores and compliance status
- Proceed only if all rules pass

#### Step 3: Execute Transfer
- View transfer summary
- Use Nexus TransferButton for direct transfers
- Use Nexus BridgeButton for cross-chain operations
- All operations respect validated compliance rules

## Extending the Rules Engine

### Add New Business Rules
1. **Backend**: Add new validation logic in `backend-rules-service-example.js`
2. **Frontend**: Rules automatically picked up from API response
3. **Configuration**: Rules can be enabled/disabled via API

### Example Additional Rules
```javascript
// Transaction amount limits
if (amount > MAX_TRANSACTION_AMOUNT) {
  reasons.push('Transaction amount exceeds limit.');
}

// Geographic restrictions
if (sender.country === 'RESTRICTED_COUNTRY') {
  reasons.push('Sender country is restricted.');
}

// Time-based rules
if (isWeekend() || isHoliday()) {
  reasons.push('Transfers not allowed on weekends/holidays.');
}

// Risk scoring
const riskScore = calculateRiskScore(sender, receiver, amount);
if (riskScore > RISK_THRESHOLD) {
  reasons.push('Risk score too high for automatic approval.');
}
```

### Real Compliance Integration
1. **Replace mock service** with actual compliance APIs
2. **Add authentication** and rate limiting
3. **Implement audit logging** for regulatory compliance
4. **Add real-time updates** for rule changes

## Technical Implementation

### Rules Engine (`src/lib/rules/engine.min.ts`)
- **Backend API integration** with proper error handling
- **Fallback validation** when backend is unavailable
- **Request tracking** with unique IDs and timestamps
- **Extensible metadata** for rich validation information

### Types (`src/types/demo.ts`)
- **Backend API types** for requests and responses
- **Metadata support** for additional validation details
- **Comprehensive type safety** throughout the application

### Error Handling
- **Network failures** gracefully handled with fallback
- **API errors** properly displayed to users
- **Retry mechanisms** for transient failures
- **Comprehensive logging** for debugging

## Security & Compliance

### Backend Security
- **Input validation** for all API requests
- **Rate limiting** to prevent abuse
- **Audit logging** for regulatory compliance
- **Secure communication** over HTTPS

### Frontend Security
- **No sensitive data** stored in frontend
- **Secure API communication** with proper headers
- **Input sanitization** for user inputs
- **Error handling** without information leakage

## Monitoring & Observability

### Backend Metrics
- **Request volume** and response times
- **Rule evaluation** performance metrics
- **Error rates** and failure patterns
- **Compliance status** trends

### Frontend Metrics
- **User interaction** patterns
- **Validation success** rates
- **Performance metrics** for API calls
- **Error tracking** and user experience

## Deployment

### Backend Deployment
- **Containerized** for easy deployment
- **Environment-based** configuration
- **Health checks** for monitoring
- **Scalable architecture** for production loads

### Frontend Deployment
- **Environment variables** for configuration
- **Build optimization** for production
- **CDN integration** for performance
- **Monitoring integration** for observability

## Support

For issues or questions about the Finternet demo:
1. **Check backend logs** for API errors
2. **Verify environment variables** are set correctly
3. **Ensure backend service** is running
4. **Check network connectivity** between frontend and backend
5. **Review validation metadata** for detailed error information
