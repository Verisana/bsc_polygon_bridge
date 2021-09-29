import { task } from "hardhat/config";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import * as dotenv from "dotenv";

import { getEnvVariable } from "../utils/utils";
import { NFT } from "../../dist/contracts/typechain";

// Although dotenv.config() was called in hardhat.configs.ts, it must be called here too,
// because we import tasks before calling the dotenv.config()
dotenv.config();

const binanceNFTAddress = getEnvVariable("BSC_NFT_ADDRESS");
const polygonNFTAddress = getEnvVariable("POLYGON_NFT_ADDRESS");

const polygonBridgeAddress = getEnvVariable("POLYGON_BRIDGE_ADDRESS");

async function mintNFTs(
    NFTContract: NFT,
    amount: number,
    owner: SignerWithAddress,
    receiverAddress: string
) {
    const isAllowedToMint = await NFTContract.hasRole(
        "MINTER_ROLE",
        owner.address
    );
    const mints = [];
    if (isAllowedToMint) {
        for (let i = 0; i < amount; i += 1) {
            mints.push(NFTContract.mint(receiverAddress));
        }

        // It is awful design. Ideally, we must create mintMany() and
        // it will do all cycle work for us in one transaction. Here we send
        // "amount" transaction to mint()
        await Promise.all(mints);
    } else {
        throw new Error(
            "Your NFT contract on Polygon has been " +
                "deployed by another account. Check addresses"
        );
    }
}

async function getNFTContract(
    address: string,
    hre: HardhatRuntimeEnvironment
): Promise<NFT> {
    return (await hre.ethers.getContractAt("NFT", address)) as NFT;
}

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
                NFTContract = await getNFTContract(polygonNFTAddress, hre);

                // Binance Smart Chain Testnet
            } else if (taskArgs.currentNetwork === "testnet") {
                NFTContract = await getNFTContract(binanceNFTAddress, hre);
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
