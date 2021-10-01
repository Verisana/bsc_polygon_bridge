import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import * as dotenv from "dotenv";

import { getEnvVariable } from "../utils/utils";
import { getContract, mintNFTs } from "../utils/blockchain_utils";
import { Bridge, NFT } from "../../dist/contracts/typechain";
import { ChainName, ISwapDetail } from "../types";
import { Validator } from "../validator";
import { ethers } from "hardhat";

// Although dotenv.config() was called in hardhat.configs.ts, it must be called here too,
// because we import tasks before calling the dotenv.config()
dotenv.config();

const binanceNFTAddress = getEnvVariable("BSC_NFT_ADDRESS");
const polygonNFTAddress = getEnvVariable("POLYGON_NFT_ADDRESS");

const binanceBridgeAddress = getEnvVariable("BSC_BRIDGE_ADDRESS");
const polygonBridgeAddress = getEnvVariable("POLYGON_BRIDGE_ADDRESS");

task("mint_nft", "Mint NFT tokens of specified amount on network")
    .addParam("amount", "The amount of NFT to mint", "10")
    .addParam(
        "currentnetwork",
        "The network name on which the contract has been deployed",
        ""
    )
    .addParam("to", "The NFT receivers address", "")
    .setAction(
        async (
            taskArgs: Record<string, string>,
            hre: HardhatRuntimeEnvironment
        ) => {
            // I assume that the contract is deployed by the first account. If not,
            // this section must be revisited
            const [owner, account1] = await hre.ethers.getSigners();

            // If not provided, defaults to first account after owner
            taskArgs.to = taskArgs.to === "" ? account1.address : taskArgs.to;

            taskArgs.currentnetwork =
                taskArgs.currentnetwork === ""
                    ? hre.network.name
                    : taskArgs.currentnetwork;

            let NFTAddress;

            // Polygon testnet
            if (taskArgs.currentnetwork === "mumbai") {
                taskArgs.to = polygonBridgeAddress;
                NFTAddress = polygonNFTAddress;
                // Binance Smart Chain Testnet
            } else if (taskArgs.currentnetwork === "testnet") {
                NFTAddress = binanceNFTAddress;
            } else {
                throw new Error("This task doesn't work on that network");
            }

            const NFTContract = (await getContract(
                "NFT",
                NFTAddress,
                hre
            )) as NFT;

            await mintNFTs(
                NFTContract,
                Number(taskArgs.amount),
                owner,
                taskArgs.to,
                true
            );
            console.log(
                `Minted ${taskArgs.amount} NFT tokens on ` +
                    `${taskArgs.currentnetwork} for address: ${taskArgs.to}`
            );
        }
    );

task("send_nft", "Send NFT token to Bridge contract from the source blockchain")
    .addParam("sender", "The sender account number to use", "1")
    .addParam("tokenid", "The tokenId of sending NFT token")
    .setAction(
        async (
            taskArgs: Record<string, unknown>,
            hre: HardhatRuntimeEnvironment
        ) => {
            let chainFrom;

            let bridgeAddress;
            let NFTAddress;

            if (hre.network.name === "testnet") {
                bridgeAddress = binanceBridgeAddress;
                NFTAddress = binanceNFTAddress;
                chainFrom = ChainName.BSC;
            } else if (hre.network.name === "mumbai") {
                bridgeAddress = polygonBridgeAddress;
                NFTAddress = polygonNFTAddress;
                chainFrom = ChainName.POLYGON;
            } else {
                throw new Error(
                    `Wrong network ${hre.network.name} argument provided`
                );
            }

            const accounts = await hre.ethers.getSigners();
            const sender = accounts[Number(taskArgs.sender)];

            if ((await sender.getBalance()).eq(0))
                throw new Error(`Sender ${sender.address} must have funds!`);

            const NFTContract = (await getContract(
                "NFT",
                NFTAddress,
                hre
            )) as NFT;

            const BridgeContract = (await getContract(
                "Bridge",
                bridgeAddress,
                hre
            )) as Bridge;

            const tokenId = hre.ethers.BigNumber.from(taskArgs.tokenid);
            await NFTContract.connect(sender).approve(
                BridgeContract.address,
                tokenId
            );
            console.log(
                `Approved ${tokenId} to ${BridgeContract.address} ` +
                    `from ${sender.address}`
            );
            await BridgeContract.connect(sender).initSwap(tokenId);

            // Receive incremented nonce. So, to obtain the past one related to
            // transaction, subtract 1
            const nonce = (
                await BridgeContract.callStatic.nonceStore(sender.address)
            ).sub(1);
            console.log(
                `Token ${tokenId} was sent from ${sender.address}` +
                    ` to Bridge ${chainFrom} with nonce ${nonce.toString()}`
            );
        }
    );

task("redeem_nft", "Redeem NFT token from the second blockchain")
    .addParam("sender", "The sender account number to use", "1")
    .addParam("tokenid", "The tokenId of receiving NFT token")
    .addParam("nonce", "The nonce of the initSwap transaction")
    .setAction(
        async (
            taskArgs: Record<string, unknown>,
            hre: HardhatRuntimeEnvironment
        ) => {
            let bridgeAddress: string;
            let chainTo: number;

            if (hre.network.name === "testnet") {
                bridgeAddress = binanceBridgeAddress;
                chainTo = ChainName.BSC;
            } else if (hre.network.name === "mumbai") {
                bridgeAddress = polygonBridgeAddress;
                chainTo = ChainName.POLYGON;
            } else {
                throw new Error(
                    `Wrong network ${hre.network.name} argument provided`
                );
            }

            const accounts = await hre.ethers.getSigners();

            const sender = accounts[Number(taskArgs.sender)];

            if ((await sender.getBalance()).eq(0))
                throw new Error(`Sender ${sender.address} must have funds!`);

            const nonce = Number(taskArgs.nonce);

            const BridgeContract = (await getContract(
                "Bridge",
                bridgeAddress,
                hre
            )) as Bridge;

            const tokenId = hre.ethers.BigNumber.from(taskArgs.tokenid);

            const swapDetail: ISwapDetail = {
                sender: sender.address,
                tokenId,
                chainFrom: chainTo === 0 ? 1 : 0,
                chainTo,
                nonce,
                isValue: true
            };

            const validator = new Validator(accounts[0], BridgeContract);
            const signature = await validator._validateInitSwap(swapDetail);

            await BridgeContract.connect(sender).redeemSwap(
                swapDetail.sender,
                swapDetail.tokenId,
                swapDetail.chainFrom,
                swapDetail.chainTo,
                swapDetail.nonce,
                signature.v,
                signature.r,
                signature.s
            );
            console.log(
                `Token ${tokenId} successfully redeemed by ${sender.address} on ${ChainName[chainTo]}`
            );
        }
    );
