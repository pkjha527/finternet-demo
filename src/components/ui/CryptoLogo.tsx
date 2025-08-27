
interface CryptoLogoProps {
  symbol: string;
  size?: number;
  className?: string;
}

// Logo mapping for cryptocurrencies and blockchains
const LOGO_MAP: Record<string, string> = {
  // Cryptocurrencies
  'BTC': '/src/assets/logos/cryptocurrencies/bitcoin.svg',
  'ETH': '/src/assets/logos/cryptocurrencies/ethereum.svg',
  'USDC': '/src/assets/logos/cryptocurrencies/usdc.svg',
  'USDT': '/src/assets/logos/cryptocurrencies/usdt.svg',
  'DAI': '/src/assets/logos/cryptocurrencies/dai.svg',
  
  // Blockchains
  'POLYGON': '/src/assets/logos/blockchains/polygon.svg',
  'AVALANCHE': '/src/assets/logos/blockchains/avalanche.svg',
  'ARBITRUM': '/src/assets/logos/blockchains/arbitrum.svg',
  'OPTIMISM': '/src/assets/logos/blockchains/optimism.svg',
  'BNB': '/src/assets/logos/blockchains/bnb.svg',
  'BASE': '/src/assets/logos/blockchains/base.svg',
  'ETHEREUM': '/src/assets/logos/blockchains/ethereum.svg',
  
  // Alternative names
  'MATIC': '/src/assets/logos/blockchains/polygon.svg',
  'AVAX': '/src/assets/logos/blockchains/avalanche.svg',
  'ARB': '/src/assets/logos/blockchains/arbitrum.svg',
  'OP': '/src/assets/logos/blockchains/optimism.svg',
};

export function CryptoLogo({ symbol, size = 24, className = '' }: CryptoLogoProps) {
  const logoPath = LOGO_MAP[symbol.toUpperCase()];
  
  if (!logoPath) {
    // Fallback to a generic crypto icon if logo not found
    return (
      <div 
        className={`bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-xs ${className}`}
        style={{ width: size, height: size }}
      >
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={logoPath}
      alt={`${symbol} logo`}
      className={className}
      style={{ width: size, height: size }}
      onError={(e) => {
        // Fallback if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = `bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-xs ${className}`;
        fallback.style.width = `${size}px`;
        fallback.style.height = `${size}px`;
        fallback.textContent = symbol.slice(0, 2);
        target.parentNode?.insertBefore(fallback, target);
      }}
    />
  );
}

// Token pair logo component for showing from/to tokens
interface TokenPairLogoProps {
  fromToken: string;
  toToken: string;
  size?: number;
  className?: string;
}

export function TokenPairLogo({ fromToken, toToken, size = 32, className = '' }: TokenPairLogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <CryptoLogo symbol={fromToken} size={size} className="z-10" />
      <CryptoLogo symbol={toToken} size={size} className="-ml-2 z-0" />
    </div>
  );
}

// Network logo component for showing blockchain networks
interface NetworkLogoProps {
  network: string;
  size?: number;
  className?: string;
}

export function NetworkLogo({ network, size = 24, className = '' }: NetworkLogoProps) {
  return <CryptoLogo symbol={network} size={size} className={className} />;
}
