/**
 * CatPad Supabase Seed Script
 * Seeds 4 verified cat charities and initial showcase launches.
 *
 * Usage:
 * npx tsx supabase/seed.ts
 */

export const INITIAL_CHARITIES = [
  {
    id: "c1111111-1111-1111-1111-111111111111",
    name: "Flatbush Cats",
    ein_tax_id: "82-4112932",
    website: "https://flatbushcats.org",
    wallet_address: "FlatCat5gB1xXkZzYF7cR4vP2m9wQeL8aN3uJsK6mTr1",
    description: "Brooklyn non-profit building high-impact affordable veterinary clinics and TNR rescue networks to eliminate feline suffering and street cat overpopulation.",
    avatar_url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop&crop=faces",
    is_verified: true,
    total_donations_sol: 42.85,
  },
  {
    id: "c2222222-2222-2222-2222-222222222222",
    name: "Alley Cat Allies",
    ein_tax_id: "52-1768407",
    website: "https://alleycat.org",
    wallet_address: "AlleyCat9mK3pL6vQ2wR8tN4xY1zF7cB5aE9sJ0dWe2",
    description: "The global leader in feline advocacy, pioneering humane trap-neuter-return (TNR) policies, disaster emergency relief, and community cat protection worldwide.",
    avatar_url: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=200&h=200&fit=crop&crop=faces",
    is_verified: true,
    total_donations_sol: 89.20,
  },
  {
    id: "c3333333-3333-3333-3333-333333333333",
    name: "Blind Cat Rescue & Sanctuary",
    ein_tax_id: "20-8025211",
    website: "https://blindcatrescue.com",
    wallet_address: "BlindCat3rT7yU1iO9pA5sD2fG4hJ6kL8zX0cV4bN6m",
    description: "A cage-free sanctuary in North Carolina dedicated exclusively to blind, visually impaired, FIV+, and FeLV+ cats who were deemed unadoptable elsewhere.",
    avatar_url: "https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=200&h=200&fit=crop&crop=faces",
    is_verified: true,
    total_donations_sol: 63.40,
  },
  {
    id: "c4444444-4444-4444-4444-444444444444",
    name: "Tabby's Place Sanctuary",
    ein_tax_id: "22-3843519",
    website: "https://tabbysplace.org",
    wallet_address: "TabbyP1ace7qW4eR2tY9uI3oP5aS8dF1gH6jK0lZ8x",
    description: "A state-of-the-art cage-free haven for felines rescued from desperate circumstances, offering lifetime unconditional care, specialized medicine, and love.",
    avatar_url: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=200&h=200&fit=crop&crop=faces",
    is_verified: true,
    total_donations_sol: 51.15,
  }
];

export const INITIAL_LAUNCHES = [
  {
    id: "l1111111-1111-1111-1111-111111111111",
    mint: "PURRz3hFk2gM8jV5aN1qT4bE7xW9yC0dZ3mK2pL4vQ8",
    name: "Purrfect Protocol",
    symbol: "PURR",
    description: "The premier purring memecoin on Solana donating 30% of all creator bonding curve volume to Flatbush Cats veterinary medical funds.",
    image_url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop",
    metadata_uri: "https://arweave.net/purr-protocol-metadata.json",
    creator_wallet: "8zC9vF3pM2qR1wE5tY7uI4oP0aS6dF8gH2jK4lZ6xV9",
    charity_id: "c1111111-1111-1111-1111-111111111111",
    donation_bps: 3000, // 30%
    is_immutable: true,
    tx_signature: "5mK9xP2rQ4wE8tY1uI3oP7aS0dF5gH2jK4lZ6xV8bN1mQ3wE5tY7uI9oP2aS4dF6g",
    config_pda: "CfgPDA1FlatCatPurr5gB1xXkZzYF7cR4vP2m9wQeL8aN3uJs",
    twitter: "https://x.com/purrprotocol",
    telegram: "https://t.me/purrprotocol",
    website: "https://purrprotocol.fun",
    is_featured: true,
    market_cap_sol: 74.2,
    bonding_curve_progress: 68.5,
    status: "confirmed",
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
  {
    id: "l2222222-2222-2222-2222-222222222222",
    name: "Whiskers DAO",
    symbol: "WHISKER",
    mint: "WHISKn5tY2uI8oP1aS4dF7gH0jK3lZ6xV9bN2mQ5wE8",
    description: "Whisker-powered community token locking 50% creator fee shares irrevocably to Alley Cat Allies trap-neuter-return missions.",
    image_url: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&h=600&fit=crop",
    metadata_uri: "https://arweave.net/whisker-metadata.json",
    creator_wallet: "7qW3eR9tY1uI5oP8aS2dF4gH6jK0lZ3xV7bN1mQ4wE6",
    charity_id: "c2222222-2222-2222-2222-222222222222",
    donation_bps: 5000, // 50%
    is_immutable: true,
    tx_signature: "4nW8yT1uI6oP3aS9dF2gH5jK7lZ0xV3bN6mQ8wE1tY4uI7oP9aS2dF5gH8jK1lZ3x",
    config_pda: "CfgPDA2AlleyWhisk9mK3pL6vQ2wR8tN4xY1zF7cB5aE9sJ0",
    twitter: "https://x.com/whiskersol",
    telegram: "https://t.me/whiskersol",
    website: "https://whiskersol.io",
    is_featured: true,
    market_cap_sol: 112.5,
    bonding_curve_progress: 89.2,
    status: "confirmed",
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: "l3333333-3333-3333-3333-333333333333",
    name: "GigaMeow",
    symbol: "MEOW",
    mint: "MEOW7xR1wE4tY8uI2oP5aS9dF3gH6jK0lZ2xV5bN8mQ",
    description: "The chadiest cat on Solana. Zero rugs, 25% automated on-chain fee distribution to Blind Cat Sanctuary.",
    image_url: "https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=600&h=600&fit=crop",
    metadata_uri: "https://arweave.net/gigameow-metadata.json",
    creator_wallet: "3rT9yU2iO6pA1sD4fG7hJ0kL3zX5cV8bN1mQ4wE7tY9",
    charity_id: "c3333333-3333-3333-3333-333333333333",
    donation_bps: 2500, // 25%
    is_immutable: true,
    tx_signature: "2mK4pL8vQ1wR5tN9xY3zF6cB8aE2sJ4dWe7mK9pL1vQ3wR6tN0xY4zF7cB9aE3sJ5",
    config_pda: "CfgPDA3BlindMeow3rT7yU1iO9pA5sD2fG4hJ6kL8zX0cV4",
    twitter: "https://x.com/gigameowsol",
    telegram: "",
    website: "https://gigameow.cat",
    is_featured: false,
    market_cap_sol: 45.8,
    bonding_curve_progress: 41.0,
    status: "confirmed",
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
  {
    id: "l4444444-4444-4444-4444-444444444444",
    name: "Nip & Tumble",
    symbol: "NIP",
    mint: "NIP4vQ8wR2tY6uI0oP3aS7dF1gH4jK8lZ2xV5bN9mQ1",
    description: "Catnip-fueled hyper-speculation with 40% creator fees locked to Tabby's Place Sanctuary.",
    image_url: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&h=600&fit=crop",
    metadata_uri: "https://arweave.net/nip-metadata.json",
    creator_wallet: "9mK2pL5vQ8wR1tN4xY7zF0cB3aE6sJ9dWe2mK5pL8vQ",
    charity_id: "c4444444-4444-4444-4444-444444444444",
    donation_bps: 4000, // 40%
    is_immutable: true,
    tx_signature: "3wE7tY1uI5oP9aS2dF6gH0jK4lZ8xV1bN5mQ8wE2tY6uI0oP3aS7dF1gH4jK8lZ2",
    config_pda: "CfgPDA4TabbyNip7qW4eR2tY9uI3oP5aS8dF1gH6jK0lZ8",
    twitter: "https://x.com/nipandsol",
    telegram: "https://t.me/nipandsol",
    website: "",
    is_featured: false,
    market_cap_sol: 31.4,
    bonding_curve_progress: 29.5,
    status: "confirmed",
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  }
];

export const INITIAL_DONATIONS: Array<{
  id: string;
  launch_id: string | null;
  charity_id: string;
  amount_sol: number;
  tx_signature: string;
  status: string;
  distribution_type: string;
  created_at: string;
}> = [
  {
    id: "d1111111-1111-1111-1111-111111111111",
    launch_id: "l1111111-1111-1111-1111-111111111111",
    charity_id: "c1111111-1111-1111-1111-111111111111",
    amount_sol: 14.50,
    tx_signature: "5mK9xP2rQ4wE8tY1uI3oP7aS0dF5gH2jK4lZ6xV8bN1mQ3wE5tY7uI9oP2aS4dF6g",
    status: "confirmed",
    distribution_type: "fee_share_distribution",
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "d2222222-2222-2222-2222-222222222222",
    launch_id: "l2222222-2222-2222-2222-222222222222",
    charity_id: "c2222222-2222-2222-2222-222222222222",
    amount_sol: 28.35,
    tx_signature: "4nW8yT1uI6oP3aS9dF2gH5jK7lZ0xV3bN6mQ8wE1tY4uI7oP9aS2dF5gH8jK1lZ3x",
    status: "confirmed",
    distribution_type: "fee_share_distribution",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: "d3333333-3333-3333-3333-333333333333",
    launch_id: "l3333333-3333-3333-3333-333333333333",
    charity_id: "c3333333-3333-3333-3333-333333333333",
    amount_sol: 8.20,
    tx_signature: "2mK4pL8vQ1wR5tN9xY3zF6cB8aE2sJ4dWe7mK9pL1vQ3wR6tN0xY4zF7cB9aE3sJ5",
    status: "confirmed",
    distribution_type: "fee_share_distribution",
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  }
];
