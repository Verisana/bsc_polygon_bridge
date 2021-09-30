# Bridge smart contract between Binance Smart Chain and Polygon

## Start

You must have `node>=14`

1. `npm install` - to install all packages
2. `cp .env.example .env` - to copy environment template
3. Fill all variables as instructed

`npx hardhat run --network testnet src/scripts/deploy_NFT.ts` - deploy NFT token to Binance Smart Chain Testnet

`npx hardhat run --network mumbai src/scripts/deploy_NFT.ts` - deploy NFT token to Polygon Mumbai Testnet

`npx hardhat --network testnet mint_nft` - mint 10 NFT tokens on Binance Smart Chain and send them to account[0] user

`npx hardhat --network mumbai mint_nft` - mint 10 NFT tokens on Polygon and send it them Bridge contract
