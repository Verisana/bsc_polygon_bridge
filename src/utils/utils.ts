import { HardhatRuntimeEnvironment } from "hardhat/types";

export function getEnvVariable(key: string): string {
    const value = process.env[key];
    if (value === undefined)
        throw new Error(`You must set required env variable: ${key}`);
    return value;
}

export async function resetForkBlockchain(
    hre: HardhatRuntimeEnvironment,
    nodeUrl?: string
) {
    const requestParams: {
        method: string;
        params?: { forking: { jsonRpcUrl: string } }[];
    } = {
        method: "hardhat_reset"
    };
    if (nodeUrl !== undefined) {
        requestParams.params = [
            {
                forking: {
                    jsonRpcUrl: nodeUrl
                }
            }
        ];
    }
    await hre.network.provider.request(requestParams);
}
