# Bridge smart contract between Binance Smart Chain and Polygon

## Start

You must have `node>=14`

1. `npm install` - to install all packages
2. `cp .env.example .env` - to copy environment template
3. Fill all variables as instructed
4. `npm run test` - to test main functionality

**Пояснения для проверяющего:**

1. На выполнение задания ушло примерно 25 часов чистого времени по таймеру
2. Дописан, но выявлен неустраненный баг в `task` `send_nft`
3. В связи с предыдущим пунктом не протестирован `task` `redeem_nft`
4. Все остальное, насколько я могу судить, сделано по ТЗ, в том числе, с тестами
5. Хотел еще в `Docker` собрать все это, но времени уже не осталось

`npx hardhat run --network testnet src/scripts/deploy_NFT.ts` - deploy NFT token to Binance Smart Chain Testnet

`npx hardhat run --network mumbai src/scripts/deploy_NFT.ts` - deploy NFT token to Polygon Mumbai Testnet

`npx hardhat run --network testnet src/scripts/deploy_bridge.ts` - deploy Bridge contract to Binance Smart Chain Testnet

`npx hardhat run --network mumbai src/scripts/deploy_bridge.ts` - deploy Bridge contract to Polygon Mumbai Testnet

`npx hardhat --network testnet mint_nft --amount 2` - mint 2 NFT tokens on Binance Smart Chain and send them to account[1] user

`npx hardhat --network mumbai mint_nft --amount 2` - mint 2 NFT tokens on Polygon and send them to the Bridge contract

`npx hardhat --network testnet send_nft --tokenid 0` - send first NFT token from account[1] to Bridge contract

`npx hardhat --network mumbai redeem_nft --tokenid 0 --nonce 0` - redeem NFT token from the second blockchain for account[1]
