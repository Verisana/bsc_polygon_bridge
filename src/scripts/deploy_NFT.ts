import hre from "hardhat";

import { deploy } from "../utils/deploy";

async function main() {
    const contractName = "NFT";
    const contract = await deploy(contractName);
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
