# bsc_polygon_bridge - simple project to bridge creation between Binance Smart Chain nad Polygon

## Start

You must have `node>=14`

1. `npm install` - to install all packages
2. `cp .env.example .env` - to copy environment template
3. Fill all variables as instructed

`npx hardhat run --network testnet src/scripts/deployNFT.ts` - deploy NFT token to Binance Smart Chain Testnet

`npx hardhat run --network mumbai src/scripts/deployNFT.ts` - deploy NFT token to Polygon Mumbai Testnet