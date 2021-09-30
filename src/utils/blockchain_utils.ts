import { HardhatRuntimeEnvironment } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";

import { NFT } from "../../dist/contracts/typechain";

export async function resetBlockchain(
    hre: HardhatRuntimeEnvironment,
    nodeUrl?: string
) {
    const requestParams: {
        method: string;
        params?: { forking: { jsonRpcUrl: string } }[];
    } = {
        method: "hardhat_reset"
    };
    if (nodeUrl !== undefined) {
        requestParams.params = [
            {
                forking: {
                    jsonRpcUrl: nodeUrl
                }
            }
        ];
    }
    await hre.network.provider.request(requestParams);
}

export async function mintNFTs(
    NFTContract: NFT,
    amount: number,
    owner: SignerWithAddress,
    receiverAddress: string,
    isLogging: boolean = false
) {
    const isAllowedToMint = await NFTContract.hasRole(
        await NFTContract.MINTER_ROLE(),
        owner.address
    );
    if (isAllowedToMint) {
        // It is awful design. Ideally, we must create mintMany() and
        // it will do all cycle work for us in one transaction

        for (let i = 0; i < amount; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            await NFTContract.connect(owner).mint(receiverAddress);

            if (isLogging) console.log(`Done ${i} mint`);
        }
    } else {
        throw new Error(
            "Your NFT contract has been " +
                "deployed by another account. Check addresses"
        );
    }
}

export async function getContract(
    name: string,
    address: string,
    hre: HardhatRuntimeEnvironment
): Promise<ethers.Contract> {
    return hre.ethers.getContractAt(name, address);
}
