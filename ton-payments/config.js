import "dotenv/config";

const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  tonWalletAddress: process.env.TON_WALLET_ADDRESS,
  premiumAmount: parseFloat(process.env.PREMIUM_AMOUNT || "1.5"),
};

if (!config.tonWalletAddress) {
  console.error("[Config] FATAL: TON_WALLET_ADDRESS is not set in .env");
  process.exit(1);
}

export default config;
