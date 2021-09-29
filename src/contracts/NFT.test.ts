import * as dotenv from "dotenv";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";

import hre from "hardhat";
import { deploy } from "../utils/deploy";
import { resetForkBlockchain } from "../utils/utils";
import { NFT } from "../../dist/contracts/typechain";

dotenv.config();
const ethersHRE = hre.ethers;

describe("Test NFT contract", () => {
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    let NFTContract: NFT;
    let tokenId: ethers.BigNumber;

    beforeEach(async () => {
        await resetForkBlockchain(hre);
        [owner, addr1, addr2] = await ethersHRE.getSigners();
        NFTContract = (await deploy("NFT")) as NFT;
    });

    describe("token minting method", () => {
        it("from authorized account", async () => {
            const balanceBefore = await NFTContract.balanceOf(addr1.address);
            await NFTContract.connect(owner).mint(addr1.address);
            const balanceAfter = await NFTContract.balanceOf(addr1.address);

            expect(balanceAfter.toNumber()).to.be.equal(
                balanceBefore.add(1).toNumber()
            );
        });
        it("revert from unauthorized account", async () => {
            await expect(
                NFTContract.connect(addr1).mint(addr1.address)
            ).to.be.revertedWith(
                "VM Exception while processing transaction: reverted with " +
                    "reason string 'ERC721PresetMinterPauserAutoId: must" +
                    " have minter role to mint'"
            );
        });
    });
