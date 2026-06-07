import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { AGENT_WALLET, MCLAW_TOKEN, ERC20_ABI } from '../lib/wagmi';
import styles from '../styles/topup.module.css';

const TOPUP_AMOUNT = parseUnits('10', 18); // default 10 MCLAW

export default function TopUpWallet() {
  const { address, isConnected } = useAccount();
  const [sent, setSent] = useState(false);

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: MCLAW_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address },
  });

  const { data: agentBalance, refetch: refetchAgent } = useReadContract({
    address: MCLAW_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [AGENT_WALLET],
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    onSuccess: () => {
      setSent(true);
      refetchBalance();
      refetchAgent();
    },
  });

  const fmt = (wei) => {
    if (wei === undefined || wei === null) return '...';
    return Number(formatUnits(BigInt(wei.toString()), 18)).toFixed(2);
  };

  const handleTopUp = () => {
    writeContract({
      address: MCLAW_TOKEN,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [AGENT_WALLET, TOPUP_AMOUNT],
    });
  };

  return (
    <div className={styles.wrapper}>
      <ConnectButton
        chainStatus="icon"
        showBalance={false}
        accountStatus="avatar"
      />

      {isConnected && (
        <div className={styles.panel}>
          <div className={styles.balanceRow}>
            <span className={styles.label}>Your MCLAW</span>
            <span className={styles.value}>{fmt(userBalance)}</span>
          </div>
          <div className={styles.balanceRow}>
            <span className={styles.label}>Agent wallet</span>
            <span className={`${styles.value} ${Number(fmt(agentBalance)) < 1 ? styles.low : styles.ok}`}>
              {fmt(agentBalance)}
            </span>
          </div>

          {Number(fmt(agentBalance)) < 1 && (
            <div className={styles.warning}>
              ⚠️ Agent wallet low — top up to post tasks
            </div>
          )}

          <button
            className={styles.topupBtn}
            onClick={handleTopUp}
            disabled={isPending || isConfirming || !userBalance || Number(fmt(userBalance)) < 10}
          >
            {isPending ? 'Confirm in wallet...'
              : isConfirming ? 'Confirming...'
              : isSuccess || sent ? '✅ Sent!'
              : 'Send 10 MCLAW to Agent'}
          </button>

          {txHash && (
            <a
              className={styles.txLink}
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View tx ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
