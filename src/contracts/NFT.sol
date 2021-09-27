// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

// I don't know about menaningfull usecases of this tokens, so I'll
// use abstract name
contract NFT is ERC721PresetMinterPauserAutoId {
    constructor() ERC721PresetMinterPauserAutoId("NoPurposeNFT", "NPNFT", "") {}
}
