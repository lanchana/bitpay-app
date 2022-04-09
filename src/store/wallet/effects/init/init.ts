import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {getPriceHistory, startGetRates} from '../rates/rates';
import {startGetTokenOptions} from '../currencies/currencies';
import {startUpdateAllKeyAndWalletStatus} from '../status/status';
import {updatePortfolioBalance} from '../../wallet.actions';

export const startWalletStoreInit =
  (): Effect => async (dispatch, getState: () => RootState) => {
    try {
      const {WALLET} = getState();

      if (!Object.keys(WALLET.tokenOptions).length) {
        dispatch(startGetTokenOptions());
      }
      if (Object.keys(WALLET.keys).length) {
        await dispatch(startGetRates());
        dispatch(startUpdateAllKeyAndWalletStatus());
      }

      dispatch(getPriceHistory());
      dispatch(updatePortfolioBalance());
      dispatch(WalletActions.successWalletStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(WalletActions.failedWalletStoreInit());
    }
  };
