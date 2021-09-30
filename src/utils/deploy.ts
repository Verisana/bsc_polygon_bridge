import hre from "hardhat";
import { Contract } from "ethers";

export async function deploy(
    contractName: string,
    ...args: unknown[]
): Promise<Contract> {
    const ContractFactory = await hre.ethers.getContractFactory(contractName);
    const contract = await ContractFactory.deploy(...args);
    await contract.deployed();
    return contract;
}
