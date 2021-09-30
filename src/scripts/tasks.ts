import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import * as dotenv from "dotenv";

import { getEnvVariable } from "../utils/utils";
import { mintNFTs } from "../utils/blockchain_utils";
import { NFT } from "../../dist/contracts/typechain";

// Although dotenv.config() was called in hardhat.configs.ts, it must be called here too,
// because we import tasks before calling the dotenv.config()
dotenv.config();

const binanceNFTAddress = getEnvVariable("BSC_NFT_ADDRESS");
const polygonNFTAddress = getEnvVariable("POLYGON_NFT_ADDRESS");

const polygonBridgeAddress = getEnvVariable("POLYGON_BRIDGE_ADDRESS");

task("mint_nft", "Mint 10 NFT tokens on specified network")
    .addParam("amount", "The amount of NFT to mint", "10")
    .addParam(
        "currentNetwork",
        "The network name on which the contract has been deployed",
        ""
    )
    .addParam("to", "The NFT receivers address", "")
    .setAction(
        async (
            taskArgs: Record<string, string>,
            hre: HardhatRuntimeEnvironment
        ) => {
            // I assume that the contract is deployed by the first account. If not,
            // this section must be revisited
            const [owner, account1] = await hre.ethers.getSigners();

            // If not provided, defaults to first account after owner
            taskArgs.to = taskArgs.to === "" ? account1.address : taskArgs.to;

            taskArgs.currentNetwork =
                taskArgs.currentNetwork === ""
                    ? hre.network.name
                    : taskArgs.currentNetwork;

            // Polygon testnet
            let NFTContract;
            if (taskArgs.currentNetwork === "mumbai") {
                taskArgs.to = polygonBridgeAddress;
                NFTContract = (await getContract(
                    "NFT",
                    polygonNFTAddress,
                    hre
                )) as NFT;

                // Binance Smart Chain Testnet
            } else if (taskArgs.currentNetwork === "testnet") {
                NFTContract = (await getContract(
                    "NFT",
                    binanceNFTAddress,
                    hre
                )) as NFT;
            } else {
                throw new Error("This task doesn't work on that network");
            }
            mintNFTs(NFTContract, Number(taskArgs.amount), owner, taskArgs.to);

            console.log(
                `Minted ${taskArgs.amount} NFT tokens on ` +
                    `${taskArgs.currentNetwork} for address: ${taskArgs.to}`
            );
        }
    );

task("send_nft", "Send NFT tokens from one blockchain to another")
    .addParam("from")
    .addParam("to");
