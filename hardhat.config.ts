import { HardhatUserConfig } from "hardhat/config";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "solidity-coverage";
import "hardhat-gas-reporter";
import "hardhat-tracer";

import * as dotenv from "dotenv";

dotenv.config();

// Not really robust. User may set variable in wrong format. Need refactor later
const mnemonic = getEnvVariable("WALLET_MNEMONIC").split(",").join(" ");

const bscUrl = getEnvVariable("BSC_TESTNET_URL");
const maticUrl = getEnvVariable("POLYGON_TESTNET_URL");

const config: HardhatUserConfig = {
    defaultNetwork: "testnet",
    networks: {
        hardhat: {},
        testnet: {
            url: bscUrl,
            accounts: {
                mnemonic
            }
        },
        mumbai: {
            url: maticUrl,
            accounts: {
                mnemonic
            }
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
