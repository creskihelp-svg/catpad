import React from 'react';
import { ExternalLink, FileCheck2 } from 'lucide-react';
import { Charity, Donation, Launch } from '../types.ts';
import { EmptyState, SectionLabel } from '../components/ui/Primitives.tsx';
import { useNetworkStatus } from '../hooks/useNetworkStatus.ts';
import { formatPercent, shortAddress } from '../lib/format.ts';

interface TransparencyPageProps {
  launches: Launch[];
  charities: Charity[];
  donations: Donation[];
  isLoading: boolean;
}

/**
 * Public receipts. Every launch and donation listed here was verified against a
 * Solana RPC node before it was recorded, and every row links to the chain so a
 * reader does not have to take the site's word for it.
 */
export const TransparencyPage: React.FC<TransparencyPageProps> = ({
  launches,
  charities,
  donations,
  isLoading,
}) => {
  const { network } = useNetworkStatus();
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  const totalDonated = donations.reduce((sum, d) => sum + Number(d.amount_sol), 0);

  const stats = [
    { label: 'Verified shelters', value: String(charities.length) },
    { label: 'Coins listed', value: String(launches.length) },
    { label: 'Donations recorded', value: String(donations.length) },
    { label: 'Donated to shelters', value: `${totalDonated.toFixed(3)} SOL` },
  ];

  const tableHead = 'bg-surface text-muted uppercase font-mono border-b border-line';
  const th = 'py-3 px-4 font-medium';
  const td = 'py-3 px-4 align-top';

  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <SectionLabel>05 / On-chain receipts</SectionLabel>
          <h1 className="mt-4 max-w-3xl font-grotesk text-4xl font-bold tracking-[-0.035em] text-ink sm:text-5xl">
            Follow the money.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Every coin and donation below was checked against the Solana {network} cluster before it
            was recorded, and every row links to the transaction itself. Nothing here is an estimate.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <SectionLabel className="tracking-[0.16em]">{stat.label}</SectionLabel>
                <p className="mt-2 font-mono text-2xl text-ink sm:text-3xl">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <SectionLabel>Shelter wallets</SectionLabel>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-ink">Where fees land</h2>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:block">
            {network}
          </span>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full text-left text-xs">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Shelter</th>
                <th className={th}>Receiving wallet</th>
                <th className={th}>Recorded donations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {charities.map((charity) => (
                <tr key={charity.id}>
                  <td className={`${td} font-semibold text-ink`}>{charity.name}</td>
                  <td className={`${td} font-mono`}>
                    <a
                      href={`https://solscan.io/account/${charity.wallet_address}${cluster}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-muted transition hover:text-ink"
                    >
                      {shortAddress(charity.wallet_address, 6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className={`${td} font-mono text-ink`}>
                    {Number(charity.total_donations_sol).toFixed(3)} SOL
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && charities.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-muted">
              No shelters have been added yet.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-14 lg:px-8">
        <SectionLabel>Coins</SectionLabel>
        <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-ink">
          Every launch, with its transaction
        </h2>

        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full text-left text-xs">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Coin</th>
                <th className={th}>Shelter</th>
                <th className={th}>Fee share</th>
                <th className={th}>Launch transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {launches.map((launch) => {
                const charity = charities.find((c) => c.id === launch.charity_id);
                return (
                  <tr key={launch.id}>
                    <td className={td}>
                      <a
                        href={`/coin/${launch.mint}`}
                        className="font-semibold text-ink transition hover:text-accent"
                      >
                        {launch.name}
                      </a>
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                        ${launch.symbol}
                      </span>
                    </td>
                    <td className={`${td} text-muted`}>{charity?.name ?? 'Shelter removed'}</td>
                    <td className={`${td} font-mono text-ink`}>{formatPercent(launch.donation_bps)}</td>
                    <td className={`${td} font-mono`}>
                      <a
                        href={`https://solscan.io/tx/${launch.tx_signature}${cluster}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted transition hover:text-ink"
                      >
                        {shortAddress(launch.tx_signature, 5)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLoading && launches.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-muted">
              No coins have been launched yet.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 lg:px-8">
        <SectionLabel>Donations</SectionLabel>
        <h2 className="mt-3 text-2xl font-bold tracking-[-0.02em] text-ink">
          Confirmed transfers to shelter wallets
        </h2>

        {donations.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<FileCheck2 className="h-6 w-6" />}
              title={isLoading ? 'Loading receipts' : 'No donations recorded yet'}
              copy="Direct donations appear here once their transfer to a shelter wallet is confirmed on Solana."
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-card">
            <table className="w-full text-left text-xs">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Shelter</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Type</th>
                  <th className={th}>Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {donations.map((donation) => {
                  const charity = charities.find((c) => c.id === donation.charity_id);
                  return (
                    <tr key={donation.id}>
                      <td className={`${td} font-mono text-muted`}>
                        {new Date(donation.created_at).toLocaleDateString()}
                      </td>
                      <td className={`${td} text-ink`}>{charity?.name ?? 'Shelter removed'}</td>
                      <td className={`${td} font-mono text-ink`}>
                        {Number(donation.amount_sol).toFixed(3)} SOL
                      </td>
                      <td className={`${td} font-mono capitalize text-muted`}>
                        {donation.distribution_type.replace(/_/g, ' ')}
                      </td>
                      <td className={`${td} font-mono`}>
                        <a
                          href={`https://solscan.io/tx/${donation.tx_signature}${cluster}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-muted transition hover:text-ink"
                        >
                          {shortAddress(donation.tx_signature, 5)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 max-w-2xl text-[11px] leading-relaxed text-muted">
          Market cap and bonding-curve figures are left blank until a market data feed reports a
          value; CatPad never fills them in with an estimate. Fee shares are set by the creator at
          launch and are immutable on-chain when the launch locks them.
        </p>
      </section>
    </div>
  );
};
