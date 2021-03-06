import * as dotenv from "dotenv";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";
import hre from "hardhat";

import { deploy } from "../utils/deploy";
import { resetBlockchain, mintNFTs } from "../utils/blockchain_utils";
import { Bridge, NFT } from "../../dist/contracts/typechain";
import { ChainName, ISwapDetail } from "../types";
import { Validator } from "../validator";

dotenv.config();
const ethersHRE = hre.ethers;

describe("Test Bridge contract", () => {
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    // These are pseudo "chains". It operates in one chain, but try to mimic two
    // chain operation
    let BridgeContractBSC: Bridge;
    let BridgeContractPolygon: Bridge;
    let NFTContractBSC: NFT;
    let NFTContractPolygon: NFT;
    let tokenId: ethers.BigNumber;
    let swapDetails: ISwapDetail;
    let signature: ethers.Signature;
    let validator: Validator;

    beforeEach(async () => {
        await resetBlockchain(hre);
        [owner, addr1, addr2] = await ethersHRE.getSigners();
        NFTContractBSC = (await deploy("NFT", owner)) as NFT;
        NFTContractPolygon = (await deploy("NFT", owner)) as NFT;

        BridgeContractBSC = (await deploy(
            "Bridge",
            owner,
            NFTContractBSC.address,
            ChainName.BSC
        )) as Bridge;

        BridgeContractPolygon = (await deploy(
            "Bridge",
            owner,
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
        validator = new Validator(owner, BridgeContractBSC);
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
        const wrongValidator = new Validator(addr2, BridgeContractBSC);
        const wrongSignature = await wrongValidator._validateInitSwap(
            swapDetails
        );
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
            swapDetails = Validator.createSwapDetail(
                await Validator.queryInitSwapEvent(BridgeContractBSC)
            );
            signature = await validator.validateInitSwap();
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
            expect(
                await NFTContractPolygon.ownerOf(swapDetails.tokenId)
            ).to.be.equal(swapDetails.sender);
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
            ).to.be.revertedWith(
                "VM Exception while processing transaction: reverted with reason string 'Token must be owned by Bridge'"
            );
        });
        it("check emitted event", async () => {
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
            const redeemSwapFilter = BridgeContractPolygon.filters.RedeemSwap();
            const events = await BridgeContractPolygon.queryFilter(
                redeemSwapFilter,
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
        it("check eventStore value", async () => {
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
