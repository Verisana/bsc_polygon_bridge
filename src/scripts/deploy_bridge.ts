import * as dotenv from "dotenv";

import hre from "hardhat";

import { deploy } from "../utils/deploy";
import { getEnvVariable } from "../utils/utils";

dotenv.config();

const binanceNFTAddress = getEnvVariable("BSC_NFT_ADDRESS");
const polygonNFTAddress = getEnvVariable("POLYGON_NFT_ADDRESS");

async function main() {
    const contractName = "Bridge";

    let contract;
    if (hre.network.name === "testnet") {
        contract = await deploy(contractName, binanceNFTAddress, "BSC");
    } else if (hre.network.name === "mumbai") {
        contract = await deploy(contractName, polygonNFTAddress, "POLYGON");
    } else {
        throw new Error(
            `Unknown network "${hre.network.name}" to deploy ${contractName}`
        );
    }
    console.log(
        `${contractName} deployed on ${hre.network.name} to: ${contract.address}`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
