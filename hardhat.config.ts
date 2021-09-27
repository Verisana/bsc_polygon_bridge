import { HardhatUserConfig } from "hardhat/config";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "hardhat-tracer";

const config: HardhatUserConfig = {
    defaultNetwork: "testnet",
    networks: {
        hardhat: {},
        testnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
            chainId: 97,
            gasPrice: 20000000000
        }
    },
    solidity: {
        compilers: [
            {
                version: "0.8.4",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1
                    }
                }
            }
        ]
    },
    paths: {
        sources: "./src/contracts",
        tests: "./test/contracts",
        cache: "./dist/contracts/cache",
        artifacts: "./dist/contracts/artifacts"
    },
    typechain: {
        outDir: "./dist/contracts/typechain"
    }
};

export default config;
