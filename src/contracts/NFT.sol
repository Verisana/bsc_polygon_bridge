// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

// I don't know about menaningfull usecases of this tokens, so I'll
// use abstract name
contract NFT is ERC721PresetMinterPauserAutoId {
    constructor() ERC721PresetMinterPauserAutoId("NoPurposeNFT", "NPNFT", "") {}

    /**
     * @dev Burns `tokenId`. See {ERC721-_burn}.
     *
     * Restrict token burning by user. We should enforce tokenId 1 to 1 match between
     * two blockchains
     *
     * Requirements:
     *
     * - The caller must own `tokenId` or be an approved operator.
     * - And have MINTER_ROLE access
     */
    function burn(uint256 tokenId) public override virtual onlyRole(MINTER_ROLE) {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721Burnable: caller is not owner nor approved");
        _burn(tokenId);
    }
}
