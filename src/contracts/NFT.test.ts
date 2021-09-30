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

    describe("token burn method", () => {
        beforeEach(async () => {
            await NFTContract.connect(owner).mint(addr1.address);
            tokenId = await NFTContract.tokenOfOwnerByIndex(addr1.address, 0);
        });
        it("from Minter and if accessed authorized account", async () => {
            await NFTContract.connect(owner).mint(owner.address);
            tokenId = await NFTContract.tokenOfOwnerByIndex(owner.address, 0);

            expect(
                await NFTContract.connect(owner).ownerOf(tokenId)
            ).to.be.equal(owner.address);

            await NFTContract.connect(owner).burn(tokenId);

            await expect(
                NFTContract.connect(owner).ownerOf(tokenId)
            ).to.be.revertedWith("ERC721: owner query for nonexistent token");
        });
        it("from Minter if token owned by another account", async () => {
            await expect(
                NFTContract.connect(owner).burn(tokenId)
            ).to.be.revertedWith(
                "VM Exception while processing transaction: reverted with reason string 'ERC721Burnable: caller is not owner nor approved"
            );
        });
        it("from owning account and not Minter", async () => {
            await expect(
                NFTContract.connect(addr1).burn(tokenId)
            ).to.be.revertedWith(
                "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 " +
                    "is missing role 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"
            );
        });
    });
    describe("token approve and transfer methods", () => {
        beforeEach(async () => {
            await NFTContract.connect(owner).mint(addr1.address);
            tokenId = await NFTContract.tokenOfOwnerByIndex(addr1.address, 0);
        });
        it("approve and use approved account to transferFrom", async () => {
            await NFTContract.connect(addr1).approve(addr2.address, tokenId);
            await NFTContract.connect(addr2).transferFrom(
                addr1.address,
                addr2.address,
                tokenId
            );
            expect(
                await NFTContract.connect(addr1).ownerOf(tokenId)
            ).to.be.equal(addr2.address);
        });
        it("approve and fail to use unapproved address to transferFrom", async () => {
            await NFTContract.connect(addr1).approve(addr2.address, tokenId);
            await expect(
                NFTContract.connect(owner).transferFrom(
                    addr1.address,
                    addr2.address,
                    tokenId
                )
            ).to.be.revertedWith(
                "VM Exception while processing transaction: reverted " +
                    "with reason string 'ERC721: transfer caller is not " +
                    "owner nor approved"
            );
        });
        it("transfer available token", async () => {
            await NFTContract.connect(addr1).transferFrom(
                addr1.address,
                addr2.address,
                tokenId
            );
            expect(
                await NFTContract.connect(owner).ownerOf(tokenId)
            ).to.be.equal(addr2.address);
        });
    });
});
