import type { FinternetUser } from '../../types/demo';

// Finternet ID Registry - Maps user-friendly IDs to wallet addresses and compliance data
export const FINTERNET_USERS: Record<string, FinternetUser> = {
  "abhishek@finternet.ae": {
    finternetId: "abhishek@finternet.ae",
    displayName: "Abhishek",
    country: "UAE",
    countryCode: "AE",
    flag: "🇦🇪",
    jurisdiction: "UAE",
    walletAddress: "0x1234567890123456789012345678901234567890",
    kycLevel: "Full",
    isSanctioned: false,
    complianceTier: "TIER_1",
    riskScore: "LOW"
  },
  "praveen@finternet.us": {
    finternetId: "praveen@finternet.us",
    displayName: "Praveen",
    country: "USA",
    countryCode: "US",
    flag: "🇺🇸",
    jurisdiction: "USA",
    walletAddress: "0x835FA8370b6544Bae59b61F9aefCF061Ff06Cfeb",
    kycLevel: "Full",
    isSanctioned: false,
    complianceTier: "TIER_1",
    riskScore: "LOW"
  },
  "john@finternet.us": {
    finternetId: "john@finternet.us",
    displayName: "John",
    country: "USA",
    countryCode: "US",
    flag: "🇺🇸",
    jurisdiction: "USA",
    walletAddress: "0x1234567890123456789012345678901234567890",
    kycLevel: "Full",
    isSanctioned: false,
    complianceTier: "TIER_1",
    riskScore: "LOW"
  },
  "maria@finternet.sg": {
    finternetId: "maria@finternet.sg",
    displayName: "Maria",
    country: "Singapore",
    countryCode: "SG",
    flag: "🇸🇬",
    jurisdiction: "Singapore",
    walletAddress: "0x2345678901234567890123456789012345678901",
    kycLevel: "Full",
    isSanctioned: false,
    complianceTier: "TIER_1",
    riskScore: "LOW"
  },
  "hans@finternet.de": {
    finternetId: "hans@finternet.de",
    displayName: "Hans",
    country: "Germany",
    countryCode: "DE",
    flag: "🇩🇪",
    jurisdiction: "EU",
    walletAddress: "0x3456789012345678901234567890123456789012",
    kycLevel: "Full",
    isSanctioned: false,
    complianceTier: "TIER_2",
    riskScore: "MEDIUM"
  },
  "yuki@finternet.jp": {
    finternetId: "yuki@finternet.jp",
    displayName: "Yuki",
    country: "Japan",
    countryCode: "JP",
    flag: "🇯🇵",
    jurisdiction: "Japan",
    walletAddress: "0x9012345678901234567890123456789012345678",
    kycLevel: "Basic",
    isSanctioned: false,
    complianceTier: "TIER_2",
    riskScore: "MEDIUM"
  },
  "carlos@finternet.br": {
    finternetId: "carlos@finternet.br",
    displayName: "Carlos",
    country: "Brazil",
    countryCode: "BR",
    flag: "🇧🇷",
    jurisdiction: "Brazil",
    walletAddress: "0x4567890123456789012345678901234567890123",
    kycLevel: "Basic",
    isSanctioned: false,
    complianceTier: "TIER_3",
    riskScore: "HIGH"
  },
  "vladimir@finternet.ru": {
    finternetId: "vladimir@finternet.ru",
    displayName: "Vladimir",
    country: "Russia",
    countryCode: "RU",
    flag: "🇷🇺",
    jurisdiction: "Russia",
    walletAddress: "0x6ebb62B3Ee588FcF82232E73c3B7bDe84f304D7a",
    kycLevel: "Full",
    isSanctioned: false,
    complianceTier: "TIER_2",
    riskScore: "HIGH"
  },
  "ahmed@finternet.ng": {
    finternetId: "ahmed@finternet.ng",
    displayName: "Ahmed",
    country: "Nigeria",
    countryCode: "NG",
    flag: "🇳🇬",
    jurisdiction: "Nigeria",
    walletAddress: "0x8901234567890123456789012345678901234567",
    kycLevel: "Basic",
    isSanctioned: true,
    complianceTier: "BLOCKED",
    riskScore: "CRITICAL"
  },
  "sophie@finternet.fr": {
    finternetId: "sophie@finternet.fr",
    displayName: "Sophie",
    country: "France",
    countryCode: "FR",
    flag: "🇫🇷",
    jurisdiction: "EU",
    walletAddress: "0x5678901234567890123456789012345678901234",
    kycLevel: "Full",
    isSanctioned: false,
    complianceTier: "TIER_1",
    riskScore: "LOW"
  },

  "raj@finternet.in": {
    finternetId: "raj@finternet.in",
    displayName: "Raj",
    country: "India",
    countryCode: "IN",
    flag: "🇮🇳",
    jurisdiction: "India",
    walletAddress: "0xe57BA2c705F8868290a4EFC22a83415d4958b3f3",
    kycLevel: "Full",
    isSanctioned: false,
    complianceTier: "TIER_2",
    riskScore: "MEDIUM"
  },

  "wei@finternet.cn": {
    finternetId: "wei@finternet.cn",
    displayName: "Wei",
    country: "China",
    countryCode: "CN",
    flag: "🇨🇳",
    jurisdiction: "China",
    walletAddress: "0x7777777777777777777777777777777777777777",
    kycLevel: "Basic",
    isSanctioned: false,
    complianceTier: "TIER_2",
    riskScore: "MEDIUM"
  }
};

// Helper functions
export function resolveFinternetId(finternetId: string): FinternetUser | null {
  return FINTERNET_USERS[finternetId] ?? null;
}

export function getWalletAddress(finternetId: string): string | null {
  const user = resolveFinternetId(finternetId);
  return user?.walletAddress ?? null;
}

export function findUserByWalletAddress(walletAddress: string): FinternetUser | null {
  return Object.values(FINTERNET_USERS).find(user => 
    user.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  ) ?? null;
}

export function getAllFinternetUsers(): Array<FinternetUser> {
  return Object.values(FINTERNET_USERS);
}

export function getUsersByJurisdiction(jurisdiction: string): Array<FinternetUser> {
  return Object.values(FINTERNET_USERS).filter(user => user.jurisdiction === jurisdiction);
}

export function getCompliantUsers(): Array<FinternetUser> {
  return Object.values(FINTERNET_USERS).filter(user => !user.isSanctioned && user.kycLevel === "Full");
}

export function getBlockedUsers(): Array<FinternetUser> {
  return Object.values(FINTERNET_USERS).filter(user => user.complianceTier === "BLOCKED");
}
