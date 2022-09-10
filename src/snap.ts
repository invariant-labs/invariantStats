import { Network, Market, Pair, getMarketAddress } from "@invariant-labs/sdk";
import { PoolStructure } from "@invariant-labs/sdk/lib/market";
import { BN, Provider } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import DEVNET_DATA from "../data/devnet.json";
import MAINNET_DATA from "../data/mainnet.json";
import {
  devnetTokensData,
  getTokensData,
  getTokensPrices,
  getUsdValue24,
  PoolSnapshot,
  PoolStatsData,
  TokenData,
} from "./utils";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const createSnapshotForNetwork = async (network: Network) => {
  let provider: Provider;
  let fileName: string;
  let snaps: Record<string, PoolStatsData>;
  let tokensData: Record<string, TokenData>;

  switch (network) {
    case Network.MAIN:
      provider = Provider.local(
        "https://tame-ancient-mountain.solana-mainnet.quiknode.pro/6a9a95bf7bbb108aea620e7ee4c1fd5e1b67cc62"
      );
      fileName = "./data/mainnet.json";
      snaps = MAINNET_DATA;
      tokensData = await getTokensData();
      break;
    case Network.DEV:
    default:
      provider = Provider.local("https://api.devnet.solana.com");
      fileName = "./data/devnet.json";
      snaps = DEVNET_DATA;
      tokensData = devnetTokensData;
  }

  const idsList: string[] = [];

  Object.values(tokensData).forEach((token) => {
    if (typeof token?.coingeckoId !== "undefined") {
      idsList.push(token.coingeckoId);
    }
  });

  const coingeckoPrices = await getTokensPrices(idsList);

  const connection = provider.connection;

  const market = await Market.build(
    network,
    provider.wallet,
    connection,
    new PublicKey(getMarketAddress(network))
  );

  const allPools = await market.getAllPools();

  const poolsDict: Record<string, PoolStructure> = {};

  const poolsData = await Promise.all(
    allPools.map(async (pool) => {
      const pair = new Pair(pool.tokenX, pool.tokenY, { fee: pool.fee.v });
      const address = await pair.getAddress(market.program.programId);

      poolsDict[address.toString()] = pool;

      const { volumeX, volumeY } = await market.getVolume(pair);

      const { liquidityX, liquidityY } = await market.getPairLiquidityValues(
        pair
      );

      const { feeX, feeY } = await market.getGlobalFee(pair);

      let lastSnapshot: PoolSnapshot | undefined;
      const tokenXData = tokensData?.[pool.tokenX.toString()] ?? {
        decimals: 0,
      };
      const tokenYData = tokensData?.[pool.tokenY.toString()] ?? {
        decimals: 0,
      };
      const tokenXPrice = tokenXData.coingeckoId
        ? coingeckoPrices[tokenXData.coingeckoId] ?? 0
        : 0;
      const tokenYPrice = tokenYData.coingeckoId
        ? coingeckoPrices[tokenYData.coingeckoId] ?? 0
        : 0;

      if (snaps?.[address.toString()]) {
        lastSnapshot =
          snaps[address.toString()][
            snaps[address.toString()].snapshots.length - 1
          ];
      }

      return {
        address: address.toString(),
        stats: {
          volumeX: {
            tokenBNFromBeginning: volumeX.toString(),
            usdValue24: getUsdValue24(
              volumeX,
              tokenXData.decimals,
              tokenXPrice,
              typeof lastSnapshot !== "undefined"
                ? new BN(lastSnapshot.volumeX.tokenBNFromBeginning)
                : new BN(0)
            ),
          },
          volumeY: {
            tokenBNFromBeginning: volumeY.toString(),
            usdValue24: getUsdValue24(
              volumeY,
              tokenYData.decimals,
              tokenYPrice,
              typeof lastSnapshot !== "undefined"
                ? new BN(lastSnapshot.volumeY.tokenBNFromBeginning)
                : new BN(0)
            ),
          },
          liquidityX: {
            tokenBNFromBeginning: liquidityX.toString(),
            usdValue24: getUsdValue24(
              liquidityX,
              tokenXData.decimals,
              tokenXPrice,
              new BN(0)
            ),
          },
          liquidityY: {
            tokenBNFromBeginning: liquidityY.toString(),
            usdValue24: getUsdValue24(
              liquidityY,
              tokenYData.decimals,
              tokenYPrice,
              new BN(0)
            ),
          },
          feeX: {
            tokenBNFromBeginning: feeX.toString(),
            usdValue24: getUsdValue24(
              feeX,
              tokenXData.decimals,
              tokenXPrice,
              typeof lastSnapshot !== "undefined"
                ? new BN(lastSnapshot.feeX.tokenBNFromBeginning)
                : new BN(0)
            ),
          },
          feeY: {
            tokenBNFromBeginning: feeY.toString(),
            usdValue24: getUsdValue24(
              feeY,
              tokenYData.decimals,
              tokenYPrice,
              typeof lastSnapshot !== "undefined"
                ? new BN(lastSnapshot.feeY.tokenBNFromBeginning)
                : new BN(0)
            ),
          },
        },
      };
    })
  );

  const now = Date.now();
  const timestamp =
    Math.floor(now / (1000 * 60 * 60 * 24)) * (1000 * 60 * 60 * 24) +
    1000 * 60 * 60 * 12;

  poolsData.forEach(({ address, stats }) => {
    const xAddress = poolsDict[address].tokenX.toString();
    const yAddress = poolsDict[address].tokenY.toString();

    if (!snaps[address]) {
      snaps[address] = {
        snapshots: [],
        tokenX: {
          address: xAddress,
          decimals: tokensData?.[xAddress]?.decimals ?? 0,
        },
        tokenY: {
          address: yAddress,
          decimals: tokensData?.[yAddress]?.decimals ?? 0,
        },
      };
    }

    snaps[address].snapshots.push({
      timestamp,
      ...stats,
    });
  });

  fs.writeFile(fileName, JSON.stringify(snaps), (err) => {
    if (err) {
      throw err;
    }
  });
};

createSnapshotForNetwork(Network.DEV).then(
  () => {
    console.log("Devnet snapshot done!");
  },
  (err) => {
    console.log(err);
  }
);

createSnapshotForNetwork(Network.MAIN).then(
  () => {
    console.log("Mainnet snapshot done!");
  },
  (err) => {
    console.log(err);
  }
);
