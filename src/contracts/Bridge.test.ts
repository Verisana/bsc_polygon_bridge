import * as dotenv from "dotenv";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";
import hre from "hardhat";

import { deploy } from "../utils/deploy";
import { resetBlockchain, mintNFTs } from "../utils/blockchain_utils";
import { Bridge, NFT } from "../../dist/contracts/typechain";
import { ChainName, ISwapDetail } from "../types";

dotenv.config();
const ethersHRE = hre.ethers;

describe("Test Bridge contract", () => {
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    // This is pseudo "chains". It operates in one chain, but try to mimic two
    // chain operation
    let BridgeContractBSC: Bridge;
    let BridgeContractPolygon: Bridge;
    let NFTContractBSC: NFT;
    let NFTContractPolygon: NFT;
    let tokenId: ethers.BigNumber;
    let swapDetails: ISwapDetail;
    let signature: ethers.Signature;

    beforeEach(async () => {
        await resetBlockchain(hre);
        [owner, addr1, addr2] = await ethersHRE.getSigners();
        NFTContractBSC = (await deploy("NFT")) as NFT;
        NFTContractPolygon = (await deploy("NFT")) as NFT;

        BridgeContractBSC = (await deploy(
            "Bridge",
            NFTContractBSC.address,
            ChainName.BSC
        )) as Bridge;

        BridgeContractPolygon = (await deploy(
            "Bridge",
            NFTContractPolygon.address,
            ChainName.POLYGON
        )) as Bridge;

        await mintNFTs(NFTContractBSC, 5, owner, addr1.address);
        await mintNFTs(
            NFTContractPolygon,
            5,
            owner,
            BridgeContractPolygon.address
        );
        tokenId = await NFTContractBSC.tokenOfOwnerByIndex(addr1.address, 0);
    });

    describe("init swap method", () => {
        it("user swap proper initialization", async () => {
            await NFTContractBSC.connect(addr1).approve(
                BridgeContractBSC.address,
                tokenId
            );
            await BridgeContractBSC.connect(addr1).initSwap(tokenId);

            expect(await NFTContractBSC.ownerOf(tokenId)).to.be.equal(
                BridgeContractBSC.address
            );
        });
        it("revert if not approved by user", async () => {
            await expect(
                BridgeContractBSC.connect(addr1).initSwap(tokenId)
            ).to.be.revertedWith(
                "VM Exception while processing transaction: reverted" +
                    " with reason string 'ERC721: transfer caller is not owner nor approved"
            );
        });
        it("proper event emitted", async () => {
            await NFTContractBSC.connect(addr1).approve(
                BridgeContractBSC.address,
                tokenId
            );
            await BridgeContractBSC.connect(addr1).initSwap(tokenId);

            const initSwapFilter = BridgeContractBSC.filters.InitSwap();
            const events = await BridgeContractBSC.queryFilter(
                initSwapFilter,
                "latest"
            );

            expect(events[0].args[0]).to.be.equal(addr1.address);
            expect(events[0].args[1].toString()).to.be.equal(
                tokenId.toString()
            );
            expect(events[0].args[2]).to.be.equal(0);
            expect(events[0].args[3]).to.be.equal(1);
            expect(events[0].args[4].toString()).to.be.equal("0");
        });
        it("check eventStore and nonce values", async () => {
            await NFTContractBSC.connect(addr1).approve(
                BridgeContractBSC.address,
                tokenId
            );
            await BridgeContractBSC.connect(addr1).initSwap(tokenId);

            const eventHash = await BridgeContractBSC.calculateHash({
                sender: addr1.address,
                tokenId,
                chainFrom: 0,
                chainTo: 1,
                nonce: 0,
                isValue: true
            });
            const eventStore = await BridgeContractBSC.eventStore(eventHash);
            const nonce = await BridgeContractBSC.nonceStore(addr1.address);

            expect(eventStore.sender).to.be.equal(addr1.address);
            expect(eventStore.tokenId.toString()).to.be.equal(
                tokenId.toString()
            );
            expect(eventStore.chainFrom).to.be.equal(0);
            expect(eventStore.chainTo).to.be.equal(1);
            expect(eventStore.nonce.toString()).to.be.equal("0");

            expect(nonce.toNumber()).to.be.equal(1);
        });
    });

    it("revert redeem swap method without previous init swap", async () => {
        swapDetails = {
            sender: addr2.address,
            tokenId,
            chainFrom: 0,
            chainTo: 1,
            nonce: 0,
            isValue: true
        };
        console.log(swapDetails.tokenId.toString());
        const swapHash = await BridgeContractPolygon.calculateHash(swapDetails);
        const signaturePlain = await addr2.signMessage(swapHash);
        const wrongSignature = ethers.utils.splitSignature(signaturePlain);
        await expect(
            BridgeContractPolygon.connect(addr2).redeemSwap(
                swapDetails.sender,
                swapDetails.tokenId,
                swapDetails.chainFrom,
                swapDetails.chainTo,
                swapDetails.nonce,
                wrongSignature.v,
                wrongSignature.r,
                wrongSignature.s
            )
        ).to.be.revertedWith("redeemSwap: invalid signature");
    });

    describe("redeem swap method if init swap was called", () => {
        beforeEach(async () => {
            await NFTContractBSC.connect(addr1).approve(
                BridgeContractBSC.address,
                tokenId
            );
            await BridgeContractBSC.connect(addr1).initSwap(tokenId);
            const initSwapFilter = BridgeContractBSC.filters.InitSwap();
            const events = await BridgeContractBSC.queryFilter(
                initSwapFilter,
                "latest"
            );
            swapDetails = {
                sender: events[0].args[0],
                tokenId: events[0].args[1],
                chainFrom: events[0].args[2],
                chainTo: events[0].args[3],
                nonce: events[0].args[4],
                isValue: true
            };
            const swapHash = await BridgeContractPolygon.calculateHash(
                swapDetails
            );
            const signaturePlain = await owner.signMessage(swapHash);
            signature = ethers.utils.splitSignature(signaturePlain);
        });

        it("by third-party account with valid sign", async () => {
            await BridgeContractPolygon.connect(addr2).redeemSwap(
                swapDetails.sender,
                swapDetails.tokenId,
                swapDetails.chainFrom,
                swapDetails.chainTo,
                swapDetails.nonce,
                signature.v,
                signature.r,
                signature.s
            );
            console.log(0);
        });
        it("and revert if tried to redeem with wrong arguments", async () => {
            await expect(
                BridgeContractPolygon.connect(addr2).redeemSwap(
                    addr2.address,
                    swapDetails.tokenId,
                    swapDetails.chainFrom,
                    swapDetails.chainTo,
                    swapDetails.nonce,
                    signature.v,
                    signature.r,
                    signature.s
                )
            ).to.be.revertedWith(
                "VM Exception while processing transaction: " +
                    "reverted with reason string 'redeemSwap: invalid signature"
            );
        });
        it("and revert if tried to redeem two times", async () => {
            await BridgeContractPolygon.connect(addr2).redeemSwap(
                swapDetails.sender,
                swapDetails.tokenId,
                swapDetails.chainFrom,
                swapDetails.chainTo,
                swapDetails.nonce,
                signature.v,
                signature.r,
                signature.s
            );

            await expect(
                BridgeContractPolygon.connect(addr2).redeemSwap(
                    swapDetails.sender,
                    swapDetails.tokenId,
                    swapDetails.chainFrom,
                    swapDetails.chainTo,
                    swapDetails.nonce,
                    signature.v,
                    signature.r,
                    signature.s
                )
            ).to.be.revertedWith("redeemSwap: invalid signature");
        });
        it("redeem event emitted", async () => {
            await BridgeContractPolygon.connect(addr2).redeemSwap(
                swapDetails.sender,
                swapDetails.tokenId,
                swapDetails.chainFrom,
                swapDetails.chainTo,
                swapDetails.nonce,
                signature.v,
                signature.r,
                signature.s
            );

            const initSwapFilter = BridgeContractBSC.filters.InitSwap();
            const events = await BridgeContractBSC.queryFilter(
                initSwapFilter,
                "latest"
            );

            expect(events[0].args[0]).to.be.equal(swapDetails.sender);
            expect(events[0].args[1].toString()).to.be.equal(
                swapDetails.tokenId.toString()
            );
            expect(events[0].args[2]).to.be.equal(swapDetails.chainFrom);
            expect(events[0].args[3]).to.be.equal(swapDetails.chainTo);
            expect(events[0].args[4].toString()).to.be.equal(
                swapDetails.nonce.toString()
            );
        });
        it("check eventStore", async () => {
            await BridgeContractPolygon.connect(addr2).redeemSwap(
                swapDetails.sender,
                swapDetails.tokenId,
                swapDetails.chainFrom,
                swapDetails.chainTo,
                swapDetails.nonce,
                signature.v,
                signature.r,
                signature.s
            );
            const swapHash = await BridgeContractPolygon.calculateHash(
                swapDetails
            );
            const eventStore = await BridgeContractPolygon.eventStore(swapHash);

            expect(eventStore.sender).to.be.equal(swapDetails.sender);
            expect(eventStore.tokenId.toString()).to.be.equal(
                swapDetails.tokenId.toString()
            );
            expect(eventStore.chainFrom).to.be.equal(swapDetails.chainFrom);
            expect(eventStore.chainTo).to.be.equal(swapDetails.chainTo);
            expect(eventStore.nonce.toString()).to.be.equal(
                swapDetails.nonce.toString()
            );
        });
    });
});
