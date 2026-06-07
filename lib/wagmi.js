import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';

export const AGENT_WALLET = '0x4f9515024c205d5b80D44A61e5808F418B59dC94';
export const MCLAW_TOKEN  = '0x7a1c46ca55a420c2c7111e505acdc8b4cdca7e9b';

export const config = getDefaultConfig({
  appName: 'McAsk',
  projectId: 'mcask',
  chains: [base],
  ssr: true,
});

export const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint8' }] },
];
