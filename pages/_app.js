import Head from 'next/head';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';

const queryClient = new QueryClient();

function MyApp({ Component, pageProps }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Head>
            <title>McAsk - AI-Powered McClaw Task Generator</title>
            <meta name="description" content="Generate professional McClaw tasks using Claude AI. Autonomous AI agents posting human-executable work." />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta property="og:title" content="McAsk" />
            <meta property="og:description" content="AI-Powered McClaw Task Generator" />
            <meta name="theme-color" content="#0f0f0f" />
            <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>🤖</text></svg>" />
          </Head>
          <Component {...pageProps} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
