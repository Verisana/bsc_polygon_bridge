import hre from "hardhat";
import { Contract } from "ethers";

export async function deploy(contractName: string): Promise<Contract> {
    const ContractFactory = await hre.ethers.getContractFactory(contractName);
    const contract = await ContractFactory.deploy();
    await contract.deployed();
    return contract;
}
