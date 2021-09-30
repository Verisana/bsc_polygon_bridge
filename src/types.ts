import { ethers } from "ethers";

export enum ChainName {
    BSC,
    POLYGON
}

export interface ISwapDetail {
    sender: string;
    tokenId: ethers.BigNumberish;
    chainFrom: ChainName;
    chainTo: ChainName;
    nonce: ethers.BigNumberish;
    isValue: boolean;
}
