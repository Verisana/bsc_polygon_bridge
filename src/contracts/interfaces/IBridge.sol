// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.4;

interface IBridge {
    event InitSwap(
        address sender,
        uint256 tokenId,
        string chainFrom,
        string chainTo,
        uint256 nonce
    );

    event RedeemSwap(
        address sender,
        uint256 tokenId,
        string chainFrom,
        string chainTo,
        uint256 nonce
    );

    function initSwap(uint256 tokenId) external view;

    function redeemSwap(
        address sender,
        uint256 tokenId,
        string memory chainFrom,
        string memory chainTo,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s,
        bytes32 hash
    ) external view;
}
