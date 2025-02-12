/* eslint-disable @typescript-eslint/naming-convention */
import { MOCK_TOKENS, Network } from "@invariant-labs/sdk-eclipse";
// import { Network as StakerNetwork } from "@invariant-labs/staker-sdk";
import {
  Market,
  PoolStructure,
  Tick,
} from "@invariant-labs/sdk-eclipse/lib/market";
import { Market as EclipseMarket } from "@invariant-labs/sdk-eclipse/lib/market";
import { DECIMAL, Range } from "@invariant-labs/sdk-eclipse/lib/utils";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import axios, { AxiosResponse } from "axios";
import MAINNET_TOKENS from "../../data/mainnet_tokens.json";
import { TokenInfo } from "@solana/spl-token-registry";
import { Network as EclipseNetwork } from "@invariant-labs/sdk-eclipse";

export interface SnapshotValueData {
  tokenBNFromBeginning: string;
  usdValue24: number;
}

export interface PoolSnapshot {
  timestamp: number;
  volumeX: SnapshotValueData;
  volumeY: SnapshotValueData;
  liquidityX: SnapshotValueData;
  liquidityY: SnapshotValueData;
  feeX: SnapshotValueData;
  feeY: SnapshotValueData;
  lockedX?: SnapshotValueData;
  lockedY?: SnapshotValueData;
  protocolFeeX?: string;
  protocolFeeY?: string;
}

export interface PoolStatsData {
  snapshots: PoolSnapshot[];
  tokenX: {
    address: string;
    decimals: number;
  };
  tokenY: {
    address: string;
    decimals: number;
  };
}

export interface PoolsApyStatsData {
  apy: number;
  weeklyFacetor: number[];
  weeklyRange: Range[];
}

export interface PoolLock {
  lockedX: BN;
  lockedY: BN;
}

export const printBN = (amount: BN, decimals: number): string => {
  const balanceString = amount.toString();
  if (balanceString.length <= decimals) {
    return "0." + "0".repeat(decimals - balanceString.length) + balanceString;
  } else {
    return (
      balanceString.substring(0, balanceString.length - decimals) +
      "." +
      balanceString.substring(balanceString.length - decimals)
    );
  }
};

export const printBNtoBN = (amount: string, decimals: number): BN => {
  const balanceString = amount.split(".");
  if (balanceString.length !== 2) {
    return new BN(balanceString[0] + "0".repeat(decimals));
  }
  if (balanceString[1].length <= decimals) {
    return new BN(
      balanceString[0] +
        balanceString[1] +
        "0".repeat(decimals - balanceString[1].length)
    );
  }
  return new BN(0);
};

export interface TokenData {
  ticker?: string;
  coingeckoId?: string;
  decimals: number;
  solAddress?: string;
}

export const getTokensData = async (): Promise<Record<string, TokenData>> => {
  const tokensObj: Record<string, TokenData> = {};

  (MAINNET_TOKENS as TokenInfo[]).forEach((token) => {
    tokensObj[token.address.toString()] = {
      decimals: token.decimals,
      coingeckoId: token.extensions?.coingeckoId,
      ticker: token?.symbol,
    };
  });

  return tokensObj;
};

export interface IPriceData {
  data: Record<string, { price: number }>;
  lastUpdateTimestamp: number;
}

export const getTokensPrices = async (
  network: Network
): Promise<Record<string, { price: number }>> => {
  const supportedNetworks = {
    [Network.TEST]: "eclipse-testnet",
    [Network.MAIN]: "eclipse-mainnet",
  };
  const { data } = await axios.get<IPriceData>(
    `https://price.invariant.app/${
      supportedNetworks[network] ?? "eclipse-testnet"
    }`
  );

  return data.data;
};

export const getUsdValue24 = (
  total: BN,
  decimals: number,
  price: number | string,
  lastTotal: BN
) => {
  const priceString =
    typeof price === "string" ? price : price.toFixed(DECIMAL);
  const bnPrice = printBNtoBN(priceString, DECIMAL);

  return +printBN(
    total
      .sub(lastTotal)
      .mul(bnPrice)
      .div(new BN(10 ** DECIMAL)),
    decimals
  );
};

export const devnetTokensData = {
  [MOCK_TOKENS.USDC]: {
    decimals: 6,
    coingeckoId: "usd-coin",
    ticker: "USDC",
  },
  [MOCK_TOKENS.USDT]: {
    decimals: 6,
    coingeckoId: "tether",
    ticker: "USDT",
  },
  [MOCK_TOKENS.SOL]: {
    decimals: 9,
    coingeckoId: "solana",
    ticker: "SOL",
  },
  [MOCK_TOKENS.MSOL]: {
    decimals: 9,
    coingeckoId: "msol",
    ticker: "mSOL",
  },
  [MOCK_TOKENS.BTC]: {
    decimals: 6,
    coingeckoId: "bitcoin",
    ticker: "BTC",
  },
  [MOCK_TOKENS.REN_DOGE]: {
    decimals: 8,
    coingeckoId: "rendoge",
    ticker: "renDOGE",
  },
};

export const eclipseDevnetTokensData = {
  GEds1ARB3oywy2sSdiNGDyxz9MhpfqPkFYYStdZmHaiN: {
    decimals: 9,
    coingeckoId: "usd-coin",
    ticker: "USDC",
  },
  CfwLhXJ2r2NmUE1f7oAeySY6eEZ7f5tC8v95nopUs5ez: {
    decimals: 9,
    coingeckoId: "bitcoin",
    ticker: "BTC",
  },
  So11111111111111111111111111111111111111112: {
    decimals: 9,
    coingeckoId: "ethereum",
    ticker: "WETH",
  },
};

export const eclipseTestnetTokensData = {
  "5gFSyxjNsuQsZKn9g5L9Ky3cSUvJ6YXqWVuPzmSi8Trx": {
    decimals: 9,
    coingeckoId: "usd-coin",
    ticker: "USDC",
    solAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  "2F5TprcNBqj2hXVr9oTssabKdf8Zbsf9xStqWjPm8yLo": {
    decimals: 9,
    coingeckoId: "bitcoin",
    ticker: "BTC",
    solAddress: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
  },
  So11111111111111111111111111111111111111112: {
    decimals: 9,
    coingeckoId: "ethereum",
    ticker: "WETH",
    solAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  },
};

export const eclipseMainnetTokensData = {
  So11111111111111111111111111111111111111112: {
    decimals: 9,
    coingeckoId: "ethereum",
    ticker: "WETH",
    solAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  },
  CEBP3CqAbW4zdZA57H2wfaSG1QNdzQ72GiQEbQXyW9Tm: {
    decimals: 6,
    coingeckoId: "tether",
    ticker: "USDT",
    solAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
  GU7NS9xCwgNPiAdJ69iusFrRfawjDDPjeMBovhV1d4kn: {
    decimals: 9,
    coingeckoId: "turbo-eth",
    ticker: "tETH",
  },
  // 2022 tokens
  AKEWE7Bgh87GPp171b4cJPSSZfmZwQ3KaqYqXoKLNAEE: {
    decimals: 6,
    coingeckoId: "usd-coin",
    ticker: "USDC",
    solAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  BeRUj3h7BqkbdfFU7FBNYbodgf8GCHodzKvF9aVjNNfL: {
    decimals: 9,
    coingeckoId: "solana",
    ticker: "SOL",
    solAddress: "So11111111111111111111111111111111111111112",
  },
  "841P4tebEgNux2jaWSjCoi9LhrVr9eHGjLc758Va3RPH": {
    decimals: 6,
    coingeckoId: "dogwifhat",
    ticker: "WIF",
    solAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  },
  "9RryNMhAVJpAwAGjCAMKbbTFwgjapqPkzpGMfTQhEjf8": {
    decimals: 6,
    coingeckoId: "bridged-tia-hyperlane",
    ticker: "TIA",
  },
  V5m1Cc9VK61mKL8xVYrjR7bjD2BC5VpADLa6ws3G8KM: {
    decimals: 6,
    coingeckoId: "stride-staked-tia",
    ticker: "stTIA",
  },
};

export interface QuotientSnapshot {
  timestamp: number;
  quotient: number;
}

export interface TicksSnapshot {
  timestamp: number;
  ticks: Tick[];
  volumeX: string;
  volumeY: string;
}

export const jsonToTicks = (data: Record<string, any[]>) => {
  const snaps: Record<string, TicksSnapshot[]> = {};

  Object.entries(data).forEach(([address, poolSnaps]) => {
    snaps[address] = [];

    poolSnaps.forEach((snap) => {
      const ticks: Tick[] = [];

      snap.ticks.forEach((tick) => {
        ticks.push({
          index: tick.index,
          sign: tick.sign,
          bump: tick.bump,
          liquidityChange: new BN(tick.liquidityChange.v, "hex"),
          liquidityGross: new BN(tick.liquidityGross.v, "hex"),
          sqrtPrice: new BN(tick.sqrtPrice.v, "hex"),
          feeGrowthOutsideX: new BN(tick.feeGrowthOutsideX.v, "hex"),
          feeGrowthOutsideY: new BN(tick.feeGrowthOutsideY.v, "hex"),
          secondsPerLiquidityOutside: new BN(
            tick.secondsPerLiquidityOutside.v,
            "hex"
          ),
          pool: new PublicKey(address),
        });
      });

      snaps[address].push({
        timestamp: snap.timestamp,
        ticks,
        volumeX: snap.volumeX,
        volumeY: snap.volumeY,
      });
    });
  });

  return snaps;
};

// export const marketToStakerNetwork = (network: Network): StakerNetwork => {
//   switch (network) {
//     case Network.DEV:
//       return StakerNetwork.DEV;
//     case Network.MAIN:
//       return StakerNetwork.MAIN;
//     default:
//       return StakerNetwork.DEV;
//   }
// };

export interface RewardsData {
  token: string;
  total: number;
}

export interface ApySnapshot {
  apy: number;
  weeklyFactor: number[];
  weeklyRange: Range[];
}

export interface IncentiveApySnapshot {
  apy: number;
  apySingleTick: number;
}

export const jsonArrayToTicks = (address: string, data: any[]) => {
  const snaps: TicksSnapshot[] = [];

  data.forEach((snap) => {
    const ticks: Tick[] = [];

    snap.ticks.forEach((tick) => {
      ticks.push({
        index: tick.index,
        sign: tick.sign,
        bump: tick.bump,
        liquidityChange: new BN(tick.liquidityChange.v, "hex"),
        liquidityGross: new BN(tick.liquidityGross.v, "hex"),
        sqrtPrice: new BN(tick.sqrtPrice.v, "hex"),
        feeGrowthOutsideX: new BN(tick.feeGrowthOutsideX.v, "hex"),
        feeGrowthOutsideY: new BN(tick.feeGrowthOutsideY.v, "hex"),
        secondsPerLiquidityOutside: new BN(
          tick.secondsPerLiquidityOutside.v,
          "hex"
        ),
        pool: new PublicKey(address),
      });
    });

    snaps.push({
      timestamp: snap.timestamp,
      ticks,
      volumeX: snap.volumeX,
      volumeY: snap.volumeY,
    });
  });

  return snaps;
};

export interface PoolApyArchiveSnapshot {
  timestamp: number;
  apy: number;
  range: Range;
  tokenXAmount?: string;
  volumeX?: number;
  weeklyFactor?: number[];
  tokenX?: {
    address: string;
    ticker: string;
    decimals: number;
  };
  tokenY?: {
    address: string;
    ticker: string;
    decimals: number;
  };
}

export interface PoolWithAddress extends PoolStructure {
  address: PublicKey;
}

export interface TokenStatsDataWithString {
  address: string;
  price: number;
  volume24: number;
  tvl: number;
}

export interface TimeData {
  timestamp: number;
  value: number;
}

export interface PoolStatsDataWithString {
  poolAddress: string;
  tokenX: string;
  tokenY: string;
  fee: number;
  volume24: number;
  tvl: number;
  apy: number;
  liquidityX: number;
  liquidityY: number;
  lockedX: number;
  lockedY: number;
}

export const getPoolsFromAdresses = async (
  addresses: PublicKey[],
  marketProgram: Market | EclipseMarket
): Promise<PoolWithAddress[]> => {
  const pools = (await marketProgram.program.account.pool.fetchMultiple(
    addresses
  )) as Array<PoolStructure | null>;

  return pools
    .map((pool, index) =>
      pool !== null
        ? {
            ...pool,
            address: addresses[index],
          }
        : null
    )
    .filter((pool) => pool !== null) as PoolWithAddress[];
};

export interface TokenPriceData {
  price: number;
}

interface RawJupApiResponse {
  data: Record<
    string,
    {
      id: string;
      price: string;
    }
  >;
  timeTaken: number;
}

export const DEFAULT_TOKENS = ["bitcoin", "ethereum", "usd-coin", "aleph-zero"];

export const getEclipseTokensData = (
  network: EclipseNetwork
): Record<string, TokenData> => {
  switch (network) {
    case EclipseNetwork.MAIN:
      return eclipseMainnetTokensData;
    case EclipseNetwork.TEST:
      return eclipseTestnetTokensData;
    default:
      return {};
  }
};

export const supportedTokens = {
  LaihKXA47apnS599tyEyasY2REfEzBNe4heunANhsMx: {
    decimals: 5,
  },
  trbts2EsWyMdnCjsHUFBKLtgudmBD7Rfbz8zCg1s4EK: {
    decimals: 9,
  },
};
