import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "ethers";
import { Bridge } from "../dist/contracts/typechain";
import { TypedEvent } from "../dist/contracts/typechain/common";
import { EventType, ISwapDetail } from "./types";

export class Validator {
    private _signer: SignerWithAddress;

    private _bridgeContract: Bridge;

    constructor(signer: SignerWithAddress, bridgeContract: Bridge) {
        this._signer = signer;
        this._bridgeContract = bridgeContract;
    }

    static async queryInitSwapEvent(
        bridgeContract: Bridge
    ): Promise<TypedEvent<EventType>> {
        const initSwapFilter = bridgeContract.filters.InitSwap();
        const events = await bridgeContract.queryFilter(
            initSwapFilter,
            "latest"
        );
        return events.slice(-1)[0];
    }

    static createSwapDetail(event: TypedEvent<EventType>): ISwapDetail {
        return {
            sender: event.args[0],
            tokenId: event.args[1],
            chainFrom: event.args[2],
            chainTo: event.args[3],
            nonce: event.args[4],
            isValue: true
        };
    }

    async validateInitSwap(
        event: TypedEvent<EventType>
    ): Promise<ethers.Signature> {
        const swapDetail = Validator.createSwapDetail(event);
        const swapHash = await this._bridgeContract
            .connect(this._signer)
            .callStatic.calculateHash(swapDetail);
        const signaturePlain = await this._signer.signMessage(swapHash);
        return ethers.utils.splitSignature(signaturePlain);
    }
}
