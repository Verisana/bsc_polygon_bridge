// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import {IBridge} from "./interfaces/IBridge.sol";
import {NFT} from "./NFT.sol";
import "./libraries/SignatureChecker.sol";

contract Bridge is
    IBridge,
    IERC721Receiver,
    Ownable,
    ReentrancyGuard,
    Pausable
{
    NFT private _NFTContract;
    ChainName internal _chainFrom;
    ChainName internal _chainTo;

    mapping(bytes32 => SwapDetail) public eventStore;

    mapping(address => uint256) public nonceStore;

    constructor(address addressNFT, ChainName chainFrom) {
        _NFTContract = NFT(addressNFT);
        _chainFrom = chainFrom;
        _chainTo = _chainFrom == ChainName.POLYGON
            ? ChainName.BSC
            : ChainName.POLYGON;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        // Here we can create some bumping mechanism to prevent stuck tokens.
        // But I'm not sure when this function is called. It's delayed till better times

        return this.onERC721Received.selector;
    }

    function calculateHash(SwapDetail memory swapDetail)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encode(
                    swapDetail.sender,
                    swapDetail.tokenId,
                    swapDetail.chainFrom,
                    swapDetail.chainTo,
                    swapDetail.nonce
                )
            );
    }

    function isInEventStore(bytes32 eventHash) public view returns (bool) {
        if (eventStore[eventHash].isValue) {
            return true;
        } else {
            return false;
        }
    }

    function initSwap(uint256 tokenId)
        external
        payable
        override
        nonReentrant
        whenNotPaused
    {
        _NFTContract.safeTransferFrom(msg.sender, address(this), tokenId);
        require(
            _NFTContract.ownerOf(tokenId) == address(this),
            "Token can not be transferd"
        );

        SwapDetail memory swapDetail = SwapDetail({
            sender: msg.sender,
            tokenId: tokenId,
            chainFrom: _chainFrom,
            chainTo: _chainTo,

            // I don't understand the purpose of this nonce. I think it's redundant
            nonce: nonceStore[msg.sender],
            isValue: true
        });

        bytes32 eventHash = calculateHash(swapDetail);

        require(
            isInEventStore(eventHash) == false,
            "eventHash must not be initialized"
        );

        // I don't quite understand why we need to store this hash because tokenId
        // is unique
        eventStore[eventHash] = swapDetail;

        emit InitSwap(
            swapDetail.sender,
            swapDetail.tokenId,
            swapDetail.chainFrom,
            swapDetail.chainTo,
            swapDetail.nonce
        );
        nonceStore[msg.sender]++;
    }

    function redeemSwap(
        address sender,
        uint256 tokenId,
        ChainName chainFrom,
        ChainName chainTo,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable override nonReentrant whenNotPaused {
        SwapDetail memory swapDetail = SwapDetail({
            sender: sender,
            tokenId: tokenId,
            chainFrom: chainFrom,
            chainTo: chainTo,
            nonce: nonce,
            isValue: true
        });

        require(
            _NFTContract.ownerOf(swapDetail.tokenId) == address(this),
            "Token must be owned by Bridge"
        );

        bytes32 eventHash = calculateHash(swapDetail);


        // This check may be redundant because the token availability is
        // checked previously
        require(
            isInEventStore(eventHash) == false,
            "eventHash must not be initialized"
        );

        eventStore[eventHash] = swapDetail;

        bytes32 prefixedEventHash = ECDSA.toEthSignedMessageHash(eventHash);

        require(
            SignatureChecker.isValidSignatureNow(
                this.owner(),
                prefixedEventHash,
                v,
                r,
                s
            ),
            "redeemSwap: invalid signature"
        );

        _NFTContract.safeTransferFrom(
            address(this),
            swapDetail.sender,
            swapDetail.tokenId
        );

        emit RedeemSwap(
            swapDetail.sender,
            swapDetail.tokenId,
            swapDetail.chainFrom,
            swapDetail.chainTo,
            swapDetail.nonce
        );
    }
}
