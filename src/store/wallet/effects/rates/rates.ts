import {Effect} from '../../../index';
import axios from 'axios';
import {BASE_BWS_URL} from '../../../../constants/config';
import {WalletActions} from '../../index';
import {SUPPORTED_COINS} from '../../../../constants/currencies';
import {PriceHistory} from '../../wallet.models';

export const getPriceHistory = (): Effect => async dispatch => {
  try {
    //TODO: update exchange currency
    const coinsList = SUPPORTED_COINS.map(coin => `${coin.toUpperCase()}:USD`)
      .toString()
      .split(',')
      .join('","');
    const {
      data: {data},
    } = await axios.get(
      `https://bitpay.com/currencies/prices?currencyPairs=["${coinsList}"]`,
    );
    const formattedData = data.map((d: PriceHistory) => {
      return {
        ...d,
        coin: d.currencyPair.split(':')[0].toLowerCase(),
      };
    });

    dispatch(WalletActions.successGetPriceHistory(formattedData));
  } catch (err) {
    console.error(err);
    dispatch(WalletActions.failedGetPriceHistory());
  }
};

export const startGetRates = (): Effect => async dispatch => {
  return new Promise(async (resolve, reject) => {
    try {
      const {data: rates} = await axios.get(`${BASE_BWS_URL}/v3/fiatrates/`);
      dispatch(WalletActions.successGetRates({rates}));
      resolve(rates);
    } catch (err) {
      console.error(err);
      dispatch(WalletActions.failedGetRates());
      reject();
    }
  });
};
