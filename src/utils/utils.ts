export function getEnvVariable(key: string): string {
    const value = process.env[key];
    if (value === undefined)
        throw new Error(`You must set required env variable: ${key}`);
    return value;
}
