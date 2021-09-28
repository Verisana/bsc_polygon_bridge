import { deploy } from "../utils/deploy";

async function main() {
    await deploy("NFT");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
