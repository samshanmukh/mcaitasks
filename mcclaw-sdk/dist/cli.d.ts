#!/usr/bin/env node
import { M as McclawClient } from './client-DpHAHVDL.js';
import 'viem';

declare const VERSION = "0.1.0";
interface FlagDef {
    name: string;
    required: boolean;
    description: string;
}
interface CommandDef {
    description: string;
    positional?: string[];
    flags?: FlagDef[];
}
declare const COMMANDS: Record<string, CommandDef>;
declare const USAGE: string;
interface ParsedArgs {
    command: string;
    positional: string[];
    flags: Record<string, string>;
}
declare function parseArgs(argv: string[]): ParsedArgs;
declare function getConfigDir(): string;
declare function loadConfigFile(): Record<string, string>;
declare function saveConfig(values: Record<string, string>): string;
interface CliConfig {
    apiBaseUrl: string;
    privateKey: `0x${string}`;
    rpcUrl: string;
    chainId: number;
    tokenAddress: `0x${string}` | undefined;
    escrowAddress: `0x${string}` | undefined;
    applicationStakingAddress: `0x${string}` | undefined;
    apiKey: string | undefined;
}
declare function loadConfig(command: string): CliConfig;
declare function dispatch(client: McclawClient, args: ParsedArgs): Promise<unknown>;

export { COMMANDS, type CliConfig, type ParsedArgs, USAGE, VERSION, dispatch, getConfigDir, loadConfig, loadConfigFile, parseArgs, saveConfig };
