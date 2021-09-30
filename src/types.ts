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

export type EventType = [
    string,
    ethers.BigNumber,
    number,
    number,
    ethers.BigNumber
] & {
    sender: string;
    tokenId: ethers.BigNumber;
    chainFrom: number;
    chainTo: number;
    nonce: ethers.BigNumber;
};
