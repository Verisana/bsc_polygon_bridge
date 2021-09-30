import hre from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export async function deploy(
    contractName: string,
    signer: SignerWithAddress,
    ...args: unknown[]
): Promise<Contract> {
    const ContractFactory = await hre.ethers.getContractFactory(contractName);
    const contract = await ContractFactory.connect(signer).deploy(...args);
    await contract.deployed();
    return contract;
}
