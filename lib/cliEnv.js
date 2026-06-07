import path from 'path';

export const CLI_PATH = path.join(process.cwd(), 'mcclaw-sdk/dist/cli.mjs');

export function getCliEnv(req) {
  return {
    ...process.env,
    MCCLAW_PRIVATE_KEY: req?.headers?.['x-mcclaw-private-key'] || process.env.MCCLAW_PRIVATE_KEY,
    MCCLAW_API_KEY:     req?.headers?.['x-mcclaw-api-key']     || process.env.MCCLAW_API_KEY,
    MCCLAW_RPC_URL:     process.env.MCCLAW_RPC_URL  || 'https://mainnet.base.org',
    MCCLAW_API_URL:     process.env.MCCLAW_API_URL  || 'https://mcclaw.io/api/v1',
  };
}

export function validateMcclawKeys(req) {
  const privateKey = req?.headers?.['x-mcclaw-private-key'] || process.env.MCCLAW_PRIVATE_KEY;
  const apiKey     = req?.headers?.['x-mcclaw-api-key']     || process.env.MCCLAW_API_KEY;
  if (!privateKey) return 'No MCCLAW private key configured. Add it in Settings.';
  if (!apiKey)     return 'No MCCLAW API key configured. Add it in Settings.';
  return null;
}
