import {
  Network,
  Market,
  getMarketAddress,
  IWallet,
} from "@invariant-labs/sdk-eclipse";
import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import DEVNET_DATA from "../../data/eclipse/devnet.json";
import TESTNET_DATA from "../../data/eclipse/testnet.json";
import MAINNET_DATA from "../../data/eclipse/mainnet.json";
import {
  eclipseDevnetTokensData,
  eclipseMainnetTokensData,
  eclipseTestnetTokensData,
  getTokensPrices,
  getUsdValue24,
  PoolLock,
  PoolStatsData,
  supportedTokens,
  TokenData,
} from "./utils";
import { Locker } from "@invariant-labs/locker-eclipse-sdk";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const createSnapshotForNetwork = async (network: Network) => {
  let provider: AnchorProvider;
  let fileName: string;
  let snaps: Record<string, PoolStatsData>;
  let tokensData: Record<string, TokenData>;

  switch (network) {
    case Network.DEV:
      provider = AnchorProvider.local(
        "https://staging-rpc.dev2.eclipsenetwork.xyz"
      );
      fileName = "../data/eclipse/devnet.json";
      snaps = DEVNET_DATA;
      tokensData = eclipseDevnetTokensData;
      break;
    case Network.TEST:
      provider = AnchorProvider.local(
        "https://testnet.dev2.eclipsenetwork.xyz"
      );
      fileName = "../data/eclipse/testnet.json";
      snaps = TESTNET_DATA;
      tokensData = eclipseTestnetTokensData;
      break;
    case Network.MAIN:
      provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
      fileName = "../data/eclipse/mainnet.json";
      snaps = MAINNET_DATA;
      tokensData = eclipseMainnetTokensData;
      break;
    default:
      throw new Error("Unknown network");
  }

  const tokenPrices = Object.entries(await getTokensPrices(network)).reduce(
    (acc, [key, { price }]) => {
      acc[key] = price;
      return acc;
    },
    {} as Record<string, number>
  );

  const connection = provider.connection;

  const locker = Locker.build(network, provider.wallet as IWallet, connection);
  const market = Market.build(
    network,
    provider.wallet as IWallet,
    connection,
    new PublicKey(getMarketAddress(network))
  );

  const readPools: Record<string, PoolStatsData> = JSON.parse(
    fs.readFileSync(fileName, "utf-8")
  );

  const supportedTokensWithPrices = {};

  if (network === Network.MAIN) {
    for (const supportedToken of Object.keys(supportedTokens)) {
      const result = await market.getCurrentTokenStats(
        supportedToken,
        "So11111111111111111111111111111111111111112",
        tokenPrices["So11111111111111111111111111111111111111112"]
      );

      if (!("error" in result)) {
        supportedTokensWithPrices[supportedToken] = +result.priceUsd;
      }

      tokensData[supportedToken] = supportedTokens[supportedToken];
    }
  }

  const poolLocks: Record<string, PoolLock> = {};
  const allLocks = await locker.getAllLockedPositions(market);

  allLocks.forEach((lock) => {
    const pool = lock.pool.toString();
    if (!poolLocks[pool]) {
      poolLocks[pool] = {
        lockedX: lock.amountTokenX,
        lockedY: lock.amountTokenY,
      };
    } else {
      const newX = poolLocks[pool].lockedX.add(lock.amountTokenX);
      const newY = poolLocks[pool].lockedY.add(lock.amountTokenY);

      poolLocks[pool] = {
        lockedX: newX,
        lockedY: newY,
      };
    }
  });

  let poolsData: any[] = [];

  Object.entries(readPools).forEach(([address, poolStatsData]) => {
    const snaps = poolStatsData.snapshots;
    const recent = snaps.length - 1;
    const lastSnapshot = snaps[recent];

    let tokenXData = tokensData?.[poolStatsData.tokenX.address] ?? {
      decimals: 0,
    };
    let tokenYData = tokensData?.[poolStatsData.tokenY.address] ?? {
      decimals: 0,
    };
    let tokenXPrice = tokenXData.coingeckoId
      ? tokenPrices[tokenXData.coingeckoId] ?? 0
      : 0;
    let tokenYPrice = tokenYData.coingeckoId
      ? tokenPrices[tokenYData.coingeckoId] ?? 0
      : 0;

    if (Object.keys(supportedTokens).includes(poolStatsData.tokenX.address)) {
      tokenXPrice = supportedTokensWithPrices[poolStatsData.tokenX.address];
    }

    if (Object.keys(supportedTokens).includes(poolStatsData.tokenY.address)) {
      tokenYPrice = supportedTokensWithPrices[poolStatsData.tokenY.address];
    }

    if (!poolLocks[address]) {
      poolsData.push(poolStatsData);
    } else {
      const lockedX = poolLocks[address.toString()]
        ? poolLocks[address.toString()].lockedX
        : new BN(0);

      const lockedY = poolLocks[address.toString()]
        ? poolLocks[address.toString()].lockedY
        : new BN(0);

      lastSnapshot["lockedX"] = {
        tokenBNFromBeginning: lockedX.toString(),
        usdValue24: getUsdValue24(
          lockedX,
          tokenXData.decimals,
          tokenXPrice,
          new BN(0)
        ),
      };
      lastSnapshot["lockedY"] = {
        tokenBNFromBeginning: lockedY.toString(),
        usdValue24: getUsdValue24(
          lockedY,
          tokenYData.decimals,
          tokenYPrice,
          new BN(0)
        ),
      };

      snaps[recent] = lastSnapshot;
      poolStatsData.snapshots = snaps;
      poolsData.push(poolStatsData);
    }
  });

  fs.writeFile(fileName, JSON.stringify(snaps), (err) => {
    if (err) {
      throw err;
    }
  });
};

// createSnapshotForNetwork(Network.DEV).then(
//   () => {
//     console.log("Eclipse: Devnet snapshot done!");
//   },
//   (err) => {
//     console.log(err);
//   }
// );

createSnapshotForNetwork(Network.TEST).then(
  () => {
    console.log("Eclipse: Testnet locks snapshot done!");
  },
  (err) => {
    console.log(err);
  }
);

createSnapshotForNetwork(Network.MAIN).then(
  () => {
    console.log("Eclipse: Mainnet locks snapshot done!");
  },
  (err) => {
    console.log(err);
  }
);
