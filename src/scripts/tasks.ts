import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import * as dotenv from "dotenv";

import { getEnvVariable } from "../utils/utils";
import { mintNFTs, getContract } from "../utils/blockchain_utils";
import { Bridge, NFT } from "../../dist/contracts/typechain";
import { ChainName } from "../types";
import { Validator } from "../validator";

// Although dotenv.config() was called in hardhat.configs.ts, it must be called here too,
// because we import tasks before calling the dotenv.config()
dotenv.config();

const binanceNFTAddress = getEnvVariable("BSC_NFT_ADDRESS");
const polygonNFTAddress = getEnvVariable("POLYGON_NFT_ADDRESS");

const binanceBridgeAddress = getEnvVariable("BSC_BRIDGE_ADDRESS");
const polygonBridgeAddress = getEnvVariable("POLYGON_BRIDGE_ADDRESS");

task("mint_nft", "Mint 10 NFT tokens on specified network")
    .addParam("amount", "The amount of NFT to mint", "10")
    .addParam(
        "currentNetwork",
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

            taskArgs.currentNetwork =
                taskArgs.currentNetwork === ""
                    ? hre.network.name
                    : taskArgs.currentNetwork;

            // Polygon testnet
            let NFTContract;
            if (taskArgs.currentNetwork === "mumbai") {
                taskArgs.to = polygonBridgeAddress;
                NFTContract = (await getContract(
                    "NFT",
                    polygonNFTAddress,
                    hre
                )) as NFT;

                // Binance Smart Chain Testnet
            } else if (taskArgs.currentNetwork === "testnet") {
                NFTContract = (await getContract(
                    "NFT",
                    binanceNFTAddress,
                    hre
                )) as NFT;
            } else {
                throw new Error("This task doesn't work on that network");
            }
            mintNFTs(NFTContract, Number(taskArgs.amount), owner, taskArgs.to);

            console.log(
                `Minted ${taskArgs.amount} NFT tokens on ` +
                    `${taskArgs.currentNetwork} for address: ${taskArgs.to}`
            );
        }
    );

task("swap_nft", "Swap NFT token from one blockchain to another")
    .addParam("sender", "1")
    .addParam("chainFrom", "0")
    .addParam("tokenID", "")
    .setAction(
        async (
            taskArgs: Record<string, string>,
            hre: HardhatRuntimeEnvironment
        ) => {
            const accounts = await hre.ethers.getSigners();

            const sender = accounts[Number(taskArgs.sender)];
            const chainFrom = Number(taskArgs.chainFrom);
            const chainTo = chainFrom === 0 ? 1 : 0;

            let bridgeAddressFrom = binanceBridgeAddress;
            let NFTAddressFrom = binanceNFTAddress;

            let bridgeAddressTo = polygonBridgeAddress;

            if (chainFrom === ChainName.POLYGON) {
                bridgeAddressFrom = polygonBridgeAddress;
                NFTAddressFrom = polygonNFTAddress;

                bridgeAddressTo = binanceBridgeAddress;
            }

            const NFTContractFrom = (await getContract(
                "NFT",
                NFTAddressFrom,
                hre
            )) as NFT;

            const BridgeContractFrom = (await getContract(
                "Bridge",
                bridgeAddressFrom,
                hre
            )) as Bridge;

            const BridgeContractTo = (await getContract(
                "Bridge",
                bridgeAddressTo,
                hre
            )) as Bridge;

            const tokenId =
                taskArgs.tokenId === ""
                    ? await NFTContractFrom.tokenOfOwnerByIndex(
                          sender.address,
                          0
                      )
                    : hre.ethers.BigNumber.from(taskArgs.tokenId);

            await NFTContractFrom.connect(sender).approve(
                BridgeContractFrom.address,
                tokenId
            );
            console.log(
                `Approved ${tokenId} to ${BridgeContractFrom.address} ` +
                    `from ${sender.address}`
            );
            await BridgeContractFrom.connect(sender).initSwap(tokenId);
            console.log(
                `Token ${tokenId} was sent from ${sender.address}` +
                    ` to Bridge ${chainFrom}`
            );

            // The Redeem Phase start !!!

            const validator = new Validator(accounts[0], BridgeContractFrom);
            const event = await Validator.queryInitSwapEvent(
                BridgeContractFrom
            );
            const swapDetail = Validator.createSwapDetail(event);
            const signature = await validator.validateInitSwap(event);

            await BridgeContractTo.connect(sender).redeemSwap(
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
