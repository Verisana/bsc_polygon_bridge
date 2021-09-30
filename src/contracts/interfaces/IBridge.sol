// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.4;

interface IBridge {
    struct SwapDetail {
        address sender;
        uint256 tokenId;
        ChainName chainFrom;
        ChainName chainTo;
        uint256 nonce;
        bool isValue;
    }

    enum ChainName {
        BSC,
        POLYGON
    }

    event InitSwap(
        address sender,
        uint256 tokenId,
        ChainName chainFrom,
        ChainName chainTo,
        uint256 nonce
    );

    event RedeemSwap(
        address sender,
        uint256 tokenId,
        ChainName chainFrom,
        ChainName chainTo,
        uint256 nonce
    );

    event FinalizeSwap(bytes32 hashEvent);

    function initSwap(uint256 tokenId) external payable;

    function redeemSwap(
        address sender,
        uint256 tokenId,
        ChainName chainFrom,
        ChainName chainTo,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable;
}
