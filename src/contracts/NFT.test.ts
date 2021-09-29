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
        it("from authorized account", async () => {
            await NFTContract.connect(addr1).burn(tokenId);

            await expect(
                NFTContract.connect(owner).ownerOf(tokenId)
            ).to.be.revertedWith("ERC721: owner query for nonexistent token");
        });
        it("from unauthorized account", async () => {
            await expect(
                NFTContract.connect(addr2).burn(tokenId)
            ).to.be.revertedWith(
                "VM Exception while processing transaction: reverted with reason string 'ERC721Burnable: caller is not owner nor approved"
            );
        });
        it("from approved account", async () => {
            await NFTContract.connect(addr1).approve(addr2.address, tokenId);
            await NFTContract.connect(addr2).burn(tokenId);
            await expect(
                NFTContract.connect(owner).ownerOf(tokenId)
            ).to.be.revertedWith("ERC721: owner query for nonexistent token");
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
