// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.4;

import {IBridge} from "./interfaces/IBridge.sol";

contract Bridge is IBridge {
    constructor() {}

    function initSwap(uint256 tokenId) external view override {}

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
    ) external view override {}
}
