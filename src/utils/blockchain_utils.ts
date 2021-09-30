import { HardhatRuntimeEnvironment } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { NFT } from "../../dist/contracts/typechain";

export async function resetForkBlockchain(
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
