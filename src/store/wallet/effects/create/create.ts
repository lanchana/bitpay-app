import {
  Currencies,
  SUPPORTED_COINS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_TOKENS,
  SupportedCoins,
  SupportedTokens,
} from '../../../../constants/currencies';
import {Effect, RootState} from '../../../index';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildKeyObj, buildWalletObj} from '../../utils/wallet';
import {
  failedAddWallet,
  successAddWallet,
  successCreateKey,
} from '../../wallet.actions';
import API from 'bitcore-wallet-client/ts_build';
import {Key, KeyMethods, KeyOptions, Token, Wallet} from '../../wallet.models';
import {Network} from '../../../../constants';
import {BitpaySupportedTokenOpts} from '../../../../constants/tokens';

export interface CreateOptions {
  network?: Network;
  account?: number;
  walletName?: string;
  password?: string;
}

const BWC = BwcProvider.getInstance();

export const startCreateKey =
  (currencies: string[]): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        const network = state.APP.network;

        const _key = BWC.createKey({
          seedType: 'new',
        });

        const wallets = await dispatch(
          createMultipleWallets({
            key: _key,
            currencies,
            options: {
              network,
            },
          }),
        );

        const key = buildKeyObj({key: _key, wallets});

        dispatch(
          successCreateKey({
            key,
          }),
        );
        resolve(key);
      } catch (err) {
        console.error(err);
        reject();
      }
    });
  };

/////////////////////////////////////////////////////////////

export const addWallet =
  ({
    key,
    currency,
    associatedWallet,
    isToken,
    options,
  }: {
    key: Key;
    currency: string;
    associatedWallet?: Wallet;
    isToken?: boolean;
    options: CreateOptions;
  }): Effect<Promise<Wallet>> =>
  async (dispatch, getState): Promise<Wallet> => {
    return new Promise(async (resolve, reject) => {
      try {
        let newWallet;
        const state = getState();
        const tokenOpts = {
          ...BitpaySupportedTokenOpts,
          ...state.WALLET.tokenOptions,
          ...state.WALLET.customTokenOptions,
        };
        const {walletName} = options;

        if (isToken) {
          if (!associatedWallet) {
            associatedWallet = (await createWallet({
              key: key.methods,
              coin: 'eth',
              options,
            })) as Wallet;

            key.wallets.push(
              merge(
                associatedWallet,
                dispatch(
                  buildWalletObj(associatedWallet.credentials, tokenOpts),
                ),
              ),
            );
          }

          newWallet = (await createTokenWallet(
            associatedWallet,
            currency,
            tokenOpts,
          )) as Wallet;
        } else {
          newWallet = (await createWallet({
            key: key.methods,
            coin: currency as SupportedCoins,
            options,
          })) as Wallet;
        }

        if (!newWallet) {
          return reject();
        }

        key.wallets.push(
          merge(
            newWallet,
            dispatch(
              buildWalletObj(newWallet.credentials, tokenOpts, {
                walletName,
              }),
            ),
          ),
        );

        dispatch(successAddWallet({key}));
        console.log('Added Wallet', currency);
        resolve(newWallet);
      } catch (err) {
        dispatch(failedAddWallet());
        console.error(err);
        reject();
      }
    });
  };

/////////////////////////////////////////////////////////////

const createMultipleWallets =
  ({
    key,
    currencies,
    options,
  }: {
    key: KeyMethods;
    currencies: string[];
    options: CreateOptions;
  }): Effect<Promise<Wallet[]>> =>
  async (dispatch, getState) => {
    const {WALLET} = getState();
    const tokenOpts = {
      ...BitpaySupportedTokenOpts,
      ...WALLET.tokenOptions,
      ...WALLET.customTokenOptions,
    };
    const supportedCoins = currencies.filter(
      (currency): currency is SupportedCoins =>
        SUPPORTED_COINS.includes(currency),
    );
    const supportedTokens = currencies.filter(
      (currency): currency is SupportedTokens =>
        SUPPORTED_TOKENS.includes(currency),
    );
    const customTokens = currencies.filter(
      currency => !SUPPORTED_CURRENCIES.includes(currency),
    );
    const tokens = [...supportedTokens, ...customTokens];
    const wallets: API[] = [];

    for (const coin of supportedCoins) {
      const wallet = (await createWallet({key, coin, options})) as Wallet;
      wallets.push(wallet);

      if (coin === 'eth') {
        wallet.preferences = wallet.preferences || {
          tokenAddresses: [],
        };
        for (const token of tokens) {
          const tokenWallet = await createTokenWallet(wallet, token, tokenOpts);
          wallets.push(tokenWallet);
        }
      }
    }

    // build out app specific props
    return wallets.map(wallet => {
      return merge(
        wallet,
        dispatch(buildWalletObj(wallet.credentials, tokenOpts)),
      );
    });
  };

/////////////////////////////////////////////////////////////

const DEFAULT_CREATION_OPTIONS: CreateOptions = {
  network: Network.mainnet,
  account: 0,
};

const createWallet = (params: {
  key: KeyMethods;
  coin: SupportedCoins;
  options: CreateOptions;
}): Promise<API> => {
  return new Promise((resolve, reject) => {
    const bwcClient = BWC.getClient();
    const {key, coin, options} = params;

    // set defaults
    const {account, network, password} = {
      ...DEFAULT_CREATION_OPTIONS,
      ...options,
    };

    bwcClient.fromString(
      key.createCredentials(password, {
        coin,
        network,
        account,
        n: 1,
        m: 1,
      }),
    );

    bwcClient.createWallet(
      Currencies[coin.toLowerCase()].name,
      'me',
      1,
      1,
      {
        network,
        singleAddress: false,
        coin,
        useNativeSegwit: ['btc', 'ltc'].includes(coin),
      },
      (err: any) => {
        if (err) {
          console.log(err);
          switch (err.name) {
            case 'bwc.ErrorCOPAYER_REGISTERED': {
              // eslint-disable-next-line no-shadow
              const account = options.account || 0;
              if (account >= 20) {
                return reject(
                  new Error(
                    '20 Wallet limit from the same coin and network has been reached.',
                  ),
                );
              }
              return resolve(
                createWallet({
                  key,
                  coin,
                  options: {...options, account: account + 1},
                }),
              );
            }
          }

          reject(err);
        } else {
          console.log('added coin', coin);
          resolve(bwcClient);
        }
      },
    );
  });
};

/////////////////////////////////////////////////////////////

const createTokenWallet = (
  wallet: Wallet,
  token: string,
  tokenOpts: {[key in string]: Token},
): Promise<API> => {
  return new Promise((resolve, reject) => {
    try {
      const bwcClient = BWC.getClient();
      const tokenCredentials: Credentials =
        wallet.credentials.getTokenCredentials(tokenOpts[token]);
      bwcClient.fromObj(tokenCredentials);
      // push walletId as reference - this is used later to build out nested overview lists
      wallet.tokens = wallet.tokens || [];
      wallet.tokens.push(tokenCredentials.walletId);
      // Add the token info to the ethWallet for BWC/BWS
      wallet.preferences?.tokenAddresses?.push(
        // @ts-ignore
        tokenCredentials.token.address,
      );
      wallet.savePreferences(wallet.preferences, (err: any) => {
        if (err) {
          console.error(`Error saving token: ${token}`);
        }
        console.log('added token', token);
        resolve(bwcClient);
      });
    } catch (err) {
      console.error(err);
      reject();
    }
  });
};

/////////////////////////////////////////////////////////////

export const startCreateKeyWithOpts =
  (opts: Partial<KeyOptions>): Effect =>
  async (dispatch): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const _key = BWC.createKey({
          seedType: opts.seedType!,
          seedData: opts.mnemonic || opts.extendedPrivateKey,
          useLegacyCoinType: opts.useLegacyCoinType,
          useLegacyPurpose: opts.useLegacyPurpose,
          passphrase: opts.passphrase,
        });

        const _wallet = await createWalletWithOpts({key: _key, opts});

        // build out app specific props
        const wallet = merge(
          _wallet,
          dispatch(buildWalletObj(_wallet.credentials)),
        ) as Wallet;

        const key = buildKeyObj({
          key: _key,
          wallets: [wallet],
          backupComplete: true,
        });

        dispatch(
          successCreateKey({
            key,
          }),
        );

        resolve(key);
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  };

/////////////////////////////////////////////////////////////

export const createWalletWithOpts = (params: {
  key: KeyMethods;
  opts: Partial<KeyOptions>;
}): Promise<API> => {
  return new Promise((resolve, reject) => {
    const bwcClient = BWC.getClient();
    const {key, opts} = params;
    try {
      bwcClient.fromString(
        key.createCredentials(undefined, {
          coin: opts.coin || 'btc',
          network: opts.networkName || 'livenet',
          account: opts.account || 0,
          n: opts.n || 1,
          m: opts.m || 1,
        }),
      );
      bwcClient.createWallet(
        opts.name,
        opts.myName || 'me',
        opts.m || 1,
        opts.n || 1,
        {
          network: opts.networkName,
          singleAddress: opts.singleAddress,
          coin: opts.coin,
          useNativeSegwit: opts.useNativeSegwit,
        },
        (err: Error) => {
          if (err) {
            console.log(err);
            switch (err.name) {
              case 'bwc.ErrorCOPAYER_REGISTERED': {
                const account = opts.account || 0;
                if (account >= 20) {
                  return reject(
                    new Error(
                      '20 Wallet limit from the same coin and network has been reached.',
                    ),
                  );
                }
                return resolve(
                  createWalletWithOpts({
                    key,
                    opts: {...opts, account: account + 1},
                  }),
                );
              }
            }

            reject(err);
          } else {
            console.log('added coin', opts.coin);
            resolve(bwcClient);
          }
        },
      );
    } catch (err) {
      reject(err);
    }
  });
};
