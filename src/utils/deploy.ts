import hre from "hardhat";

export async function deploy(contractName: string) {
    const ContractFactory = await hre.ethers.getContractFactory(contractName);
    const Contract = await ContractFactory.deploy();
    console.log("Deploy transaction sent");
    await Contract.deployed();

    console.log(
        `Contract deployed on ${hre.network.name} to: ${Contract.address}`
    );
}
