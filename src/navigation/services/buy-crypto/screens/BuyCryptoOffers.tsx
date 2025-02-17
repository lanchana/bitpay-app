import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import styled from 'styled-components/native';
import {
  useTheme,
  RouteProp,
  useRoute,
  useNavigation,
} from '@react-navigation/native';
import cloneDeep from 'lodash.clonedeep';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import Button from '../../../../components/button/Button';
import haptic from '../../../../components/haptic-feedback/haptic';
import {
  BaseText,
  Link,
  H5,
  H7,
  Small,
} from '../../../../components/styled/Text';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {useLogger} from '../../../../utils/hooks/useLogger';
import {Currencies} from '../../../../constants/currencies';
import SimplexLogo from '../../../../components/icons/external-services/simplex/simplex-logo';
import WyreLogo from '../../../../components/icons/external-services/wyre/wyre-logo';
import {BuyCryptoExpandibleCard, ItemDivisor} from '../styled/BuyCryptoCard';
import {
  Black,
  SlateDark,
  ProgressBlue,
  White,
  LuckySevens,
} from '../../../../styles/colors';
import {
  getPaymentUrl,
  simplexFiatAmountLimits,
  simplexPaymentRequest,
  simplexEnv,
} from '../utils/simplex-utils';
import {wyreFiatAmountLimits} from '../utils/wyre-utils';
import {RootState} from '../../../../store';
import {GetPrecision} from '../../../../store/wallet/utils/currency';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {openUrlWithInAppBrowser} from '../../../../store/app/app.effects';
import {BuyCryptoActions} from '../../../../store/buy-crypto';
import {simplexPaymentData} from '../../../../store/buy-crypto/buy-crypto.models';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {APP_NAME} from '../../../../constants/config';
import {isPaymentMethodSupported} from '../utils/buy-crypto-utils';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {PaymentMethod} from '../constants/BuyCryptoConstants';
import analytics from '@segment/analytics-react-native';

export interface BuyCryptoOffersProps {
  amount: number;
  fiatCurrency: string;
  coin: string;
  country: string;
  selectedWallet: Wallet;
  paymentMethod: PaymentMethod;
}

export type CryptoOffer = {
  key: 'simplex' | 'wyre';
  showOffer: boolean;
  logo: JSX.Element;
  expanded: boolean;
  amountCost?: number;
  buyAmount?: number;
  fee?: number;
  fiatMoney?: string; // Rate without fees
  amountReceiving?: string;
  amountLimits?: any;
  errorMsg?: string;
  quoteData?: any; // Simplex
  outOfLimitMsg?: string;
};

const SummaryRow = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  margin-top: 20px;
  padding: 0px 14px;
`;

const SummaryItemContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  height: 50px;
`;

const SummaryTitle = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
  margin-bottom: 5px;
`;

const SummaryData = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-weight: 500;
  font-size: 16px;
`;

const SpinnerContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const CoinContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const CoinIconContainer = styled.View`
  width: 20px;
  height: 20px;
  margin-right: 5px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const SummaryCtaContainer = styled.View`
  margin: 4px 0px;
`;

const OfferRow = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const OfferDataContainer = styled.View`
  display: flex;
  flex-direction: column;
`;

const OfferDataCryptoAmount = styled(H5)`
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const OfferDataRate = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataInfoContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 20px;
`;

const OfferDataInfoLabel = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-right: 10px;
`;

const OfferDataInfoText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const OfferDataInfoTextSec = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-top: 10px;
`;

const OfferDataInfoTotal = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-weight: bold;
`;

const OfferExpandibleItem = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 12px;
  margin-bottom: 12px;
`;

const OfferDataRightContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const TermsContainer = styled.View`
  padding: 0 20px;
  margin-top: 20px;
  margin-bottom: 40px;
`;

const ExchangeTermsContainer = styled.View`
  padding: 0 0 10px 0;
`;

const TermsText = styled(Small)`
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
`;

const ExchangeTermsText = styled(BaseText)`
  font-size: 11px;
  line-height: 20px;
  color: ${LuckySevens};
`;

const offersDefault: {
  simplex: CryptoOffer;
  wyre: CryptoOffer;
} = {
  simplex: {
    key: 'simplex',
    amountReceiving: '0',
    showOffer: true,
    logo: <SimplexLogo width={70} height={20} />,
    expanded: false,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
  wyre: {
    key: 'wyre',
    amountReceiving: '0',
    showOffer: true,
    logo: <WyreLogo width={70} height={20} />,
    expanded: false,
    fiatMoney: undefined,
    errorMsg: undefined,
    outOfLimitMsg: undefined,
  },
};

const BuyCryptoOffers: React.FC = () => {
  const {
    params: {
      amount,
      fiatCurrency,
      coin,
      country,
      selectedWallet,
      paymentMethod,
    },
  } = useRoute<RouteProp<{params: BuyCryptoOffersProps}>>();

  const logger = useLogger();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  offersDefault.simplex.showOffer = isPaymentMethodSupported(
    'simplex',
    paymentMethod,
    coin,
    fiatCurrency,
  );
  offersDefault.wyre.showOffer = isPaymentMethodSupported(
    'wyre',
    paymentMethod,
    coin,
    fiatCurrency,
  );
  const [offers, setOffers] = useState(cloneDeep(offersDefault));
  const [finishedSimplex, setFinishedSimplex] = useState(false);
  const [finishedWyre, setFinishedWyre] = useState(false);
  const [updateView, setUpdateView] = useState(false);

  const createdOn = useAppSelector(({WALLET}: RootState) => WALLET.createdOn);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  const getSimplexQuote = (): void => {
    logger.debug('Simplex getting quote');

    offers.simplex.amountLimits = simplexFiatAmountLimits;

    if (
      amount < offers.simplex.amountLimits.min ||
      amount > offers.simplex.amountLimits.max
    ) {
      offers.simplex.outOfLimitMsg = `There are no Simplex offers available, as the current purchase limits for this exchange must be between ${offers.simplex.amountLimits.min} ${fiatCurrency} and ${offers.simplex.amountLimits.max} ${fiatCurrency}`;
      setFinishedSimplex(!finishedSimplex);
      return;
    } else {
      let paymentMethodArray: string[] = [];
      switch (paymentMethod.method) {
        case 'sepaBankTransfer':
          paymentMethodArray.push('simplex_account');
          break;
        default:
          paymentMethodArray.push('credit_card');
          break;
      }
      const requestData = {
        digital_currency: coin.toUpperCase(),
        fiat_currency: fiatCurrency.toUpperCase(),
        requested_currency: fiatCurrency.toUpperCase(),
        requested_amount: amount,
        end_user_id: selectedWallet.id,
        payment_methods: paymentMethodArray,
        env: simplexEnv,
      };

      selectedWallet
        .simplexGetQuote(requestData)
        .then(data => {
          if (data && data.quote_id) {
            offers.simplex.outOfLimitMsg = undefined;
            offers.simplex.errorMsg = undefined;
            offers.simplex.quoteData = data;
            offers.simplex.amountCost = data.fiat_money.total_amount;
            offers.simplex.buyAmount = data.fiat_money.base_amount;
            offers.simplex.fee =
              data.fiat_money.total_amount - data.fiat_money.base_amount;

            const precision = dispatch(GetPrecision(coin));
            if (offers.simplex.buyAmount && coin && precision) {
              offers.simplex.fiatMoney = Number(
                offers.simplex.buyAmount / data.digital_money.amount,
              ).toFixed(precision!.unitDecimals);
            } else {
              logger.error(
                `Simplex error: Could not get precision for ${coin}`,
              );
            }
            offers.simplex.amountReceiving =
              data.digital_money.amount.toString();
            logger.debug('Simplex getting quote: SUCCESS');
            setFinishedSimplex(!finishedSimplex);
          } else {
            if (data.message && typeof data.message === 'string') {
              logger.error('Simplex error: ' + data.message);
            }
            if (data.error && typeof data.error === 'string') {
              logger.error('Simplex error: ' + data.error);
            }
            if (data.errors) {
              logger.error(data.errors);
            }
            let err = "Can't get rates at this moment. Please try again later";
            showSimplexError(err);
          }
        })
        .catch((err: any) => {
          console.log('Simplex getting quote: FAILED', err);
        });
    }
  };

  const showSimplexError = (err?: any) => {
    let msg = 'Could not get crypto offer. Please, try again later.';
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else {
        if (err.error && err.error.error) {
          msg = err.error.error;
        } else if (err.message) {
          msg = err.message;
        }
      }
    }

    logger.error('Simplex error: ' + msg);

    offers.simplex.errorMsg = msg;
    offers.simplex.fiatMoney = undefined;
    offers.simplex.expanded = false;
    setUpdateView(!updateView);
  };

  const showWyreError = (err?: any) => {
    let msg = 'Could not get crypto offer. Please, try again later.';
    if (err) {
      if (typeof err === 'string') {
        msg = err;
      } else if (err.exceptionId && err.message) {
        logger.error('Wyre error: ' + err.message);
        if (err.errorCode) {
          switch (err.errorCode) {
            case 'validation.unsupportedCountry':
              msg = 'Country not supported: ' + country;
              break;
            default:
              msg = err.message;
              break;
          }
        } else {
          msg = err.message;
        }
      }
    }

    logger.error('Crypto offer error: ' + msg);
    offers.wyre.errorMsg = msg;
    offers.wyre.fiatMoney = undefined;
    offers.wyre.expanded = false;
    setUpdateView(!updateView);
  };

  const getWyreQuote = async () => {
    logger.debug('Wyre getting quote');

    offers.wyre.amountLimits = wyreFiatAmountLimits;

    if (
      amount < offers.wyre.amountLimits.min ||
      amount > offers.wyre.amountLimits.max
    ) {
      offers.wyre.outOfLimitMsg = `There are no Wyre offers available, as the current purchase limits for this exchange must be between ${offers.wyre.amountLimits.min} ${fiatCurrency} and ${offers.wyre.amountLimits.max} ${fiatCurrency}`;
    } else {
      let address: string = '';
      try {
        address = (await dispatch<any>(
          createWalletAddress({wallet: selectedWallet, newAddress: false}),
        )) as string;
      } catch (err) {
        console.error(err);
        showWyreError(err);
      }

      const dest = setPrefix(address, coin, selectedWallet.credentials.network);

      let walletType: string;
      switch (paymentMethod.method) {
        case 'applePay':
          walletType = 'APPLE_PAY';
          break;
        default:
          walletType = 'DEBIT_CARD';
          break;
      }

      const requestData = {
        sourceAmount: amount.toString(),
        sourceCurrency: fiatCurrency.toUpperCase(),
        destCurrency: coin.toUpperCase(),
        dest,
        country,
        amountIncludeFees: true, // If amountIncludeFees is true, use sourceAmount instead of amount
        walletType,
        env: simplexEnv,
      };

      selectedWallet
        .wyreWalletOrderQuotation(requestData)
        .then(data => {
          if (data && (data.exceptionId || data.error)) {
            showWyreError(data);
            return;
          }

          offers.wyre.amountCost = data.sourceAmount; // sourceAmount = Total amount (including fees)
          offers.wyre.buyAmount = data.sourceAmountWithoutFees;
          offers.wyre.fee = data.sourceAmount - data.sourceAmountWithoutFees;

          if (offers.wyre.fee < 0) {
            const err = `Wyre has returned a wrong value for the fee. Fee: ${offers.wyre.fee}`;
            showWyreError(err);
            return;
          }

          offers.wyre.fiatMoney =
            offers.wyre.buyAmount && data.destAmount
              ? Number(offers.wyre.buyAmount / data.destAmount).toFixed(8)
              : undefined;

          offers.wyre.amountReceiving = data.destAmount.toFixed(8);

          logger.debug('Wyre getting quote: SUCCESS');
          setFinishedWyre(!finishedWyre);
        })
        .catch((err: any) => {
          console.log('Wyre getting quote: FAILED', err);
        });
    }
  };

  const setPrefix = (
    address: string,
    coin: string,
    network: 'livenet' | 'testnet',
  ): string => {
    const prefix =
      Currencies[coin.toLocaleLowerCase()].paymentInfo.protocolPrefix[network];
    const addr = `${prefix}:${address}`;
    return addr;
  };

  const continueToSimplex = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      showSimplexError(err);
    }

    const quoteData = {
      quoteId: offers.simplex.quoteData.quote_id,
      currency: fiatCurrency,
      fiatTotalAmount: offers.simplex.quoteData.fiat_money.total_amount,
      cryptoAmount: offers.simplex.quoteData.digital_money.amount,
    };

    simplexPaymentRequest(selectedWallet, address, quoteData, createdOn)
      .then(req => {
        if (req && req.error) {
          showSimplexError(req.error);
          return;
        }

        logger.debug('Simplex creating payment request: SUCCESS');

        const remoteData: any = {
          address,
          api_host: req.api_host,
          app_provider_id: req.app_provider_id,
          order_id: req.order_id,
          payment_id: req.payment_id,
        };

        const newData: simplexPaymentData = {
          address,
          created_on: Date.now(),
          crypto_amount: offers.simplex.quoteData.digital_money.amount,
          coin: coin.toUpperCase(),
          env: __DEV__ ? 'dev' : 'prod',
          fiat_base_amount: offers.simplex.quoteData.fiat_money.base_amount,
          fiat_total_amount: offers.simplex.quoteData.fiat_money.total_amount,
          fiat_total_amount_currency: fiatCurrency,
          order_id: req.order_id,
          payment_id: req.payment_id,
          status: 'paymentRequestSent',
          user_id: selectedWallet.id,
        };

        dispatch(
          BuyCryptoActions.successPaymentRequestSimplex({
            simplexPaymentData: newData,
          }),
        );

        analytics.track('BitPay App - Requested Crypto Purchase', {
          exchange: 'simplex',
          walletId: selectedWallet.id,
          fiatAmount: amount,
          fiatCurrency: fiatCurrency,
          paymentMethod: paymentMethod.method,
          coin: selectedWallet.currencyAbbreviation,
          appUser: user?.eid || '',
        });

        const paymentUrl: string = getPaymentUrl(
          selectedWallet,
          quoteData,
          remoteData,
        );

        Linking.openURL(paymentUrl)
          .then(() => {
            navigation.goBack();
          })
          .catch(err => console.error("Couldn't load page", err));
      })
      .catch(err => {
        showSimplexError(err);
      });
  };

  const goToWyreBuyPage = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      showWyreError(err);
    }
    let _paymentMethod: string;
    switch (paymentMethod.method) {
      case 'applePay':
        _paymentMethod = 'apple-pay';
        break;
      default:
        _paymentMethod = 'debit-card';
        break;
    }
    const appName = APP_NAME;
    const redirectUrl =
      APP_NAME +
      '://wyre?walletId=' +
      selectedWallet.id +
      '&destAmount=' +
      offers.wyre.amountReceiving;
    const failureRedirectUrl = appName + '://wyreError';
    const dest = setPrefix(address, coin, selectedWallet.credentials.network);
    const requestData = {
      sourceAmount: amount.toString(),
      dest,
      destCurrency: coin.toUpperCase(),
      lockFields: ['dest', 'destCurrency', 'country'],
      paymentMethod: _paymentMethod,
      sourceCurrency: fiatCurrency.toUpperCase(),
      country,
      amountIncludeFees: true, // If amountIncludeFees is true, use sourceAmount instead of amount
      redirectUrl,
      failureRedirectUrl,
      env: simplexEnv,
    };

    selectedWallet
      .wyreWalletOrderReservation(requestData)
      .then((data: any) => {
        if (data && (data.exceptionId || data.error)) {
          showWyreError(data);
          return;
        }

        const paymentUrl = data.url;
        openPopUpConfirmation('wyre', paymentUrl);
      })
      .catch((err: any) => {
        showWyreError(err);
      });
  };

  const continueToWyre = (paymentUrl: string) => {
    analytics.track('BitPay App - Requested Crypto Purchase', {
      exchange: 'wyre',
      walletId: selectedWallet.id,
      fiatAmount: amount,
      fiatCurrency: fiatCurrency,
      paymentMethod: paymentMethod.method,
      coin: selectedWallet.currencyAbbreviation,
      appUser: user?.eid || '',
    });
    Linking.openURL(paymentUrl)
      .then(() => {
        navigation.goBack();
      })
      .catch(err => console.error("Couldn't load page", err));
  };

  const goTo = (key: string): void => {
    switch (key) {
      case 'simplex':
        goToSimplexBuyPage();
        break;

      case 'wyre':
        goToWyreBuyPage();
        break;
    }
  };

  const goToSimplexBuyPage = () => {
    if (offers.simplex.errorMsg || offers.simplex.outOfLimitMsg) {
      return;
    }
    openPopUpConfirmation('simplex');
  };

  const openPopUpConfirmation = (exchange: string, url?: string): void => {
    let title, message;

    switch (exchange) {
      case 'simplex':
        title = 'Continue to Simplex';
        message =
          "In order to finish the payment process you will be redirected to Simplex's page";
        break;

      case 'wyre':
        title = 'Continue to Wyre';
        message =
          "In order to finish the payment process you will be redirected to Wyre's page";
        break;

      default:
        title = 'Continue to the exchange page';
        message =
          'In order to finish the payment process you will be redirected to the exchange page';
        break;
    }

    dispatch(
      showBottomNotificationModal({
        type: 'question',
        title,
        message,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'CONTINUE',
            action: () => {
              dispatch(dismissBottomNotificationModal());
              switch (exchange) {
                case 'simplex':
                  continueToSimplex();
                  break;
                case 'wyre':
                  url ? continueToWyre(url) : () => {};
                  break;

                default:
                  if (url) {
                    Linking.openURL(url)
                      .then(() => {
                        navigation.goBack();
                      })
                      .catch(err => console.error("Couldn't load page", err));
                  }
                  break;
              }
            },
            primary: true,
          },
          {
            text: 'GO BACK',
            action: () => {
              console.log('Continue to the exchange website CANCELED');
            },
          },
        ],
      }),
    );
  };

  const expandCard = (offer: CryptoOffer) => {
    const key = offer.key;
    if (!offer.fiatMoney) {
      return;
    }
    if (offers[key]) {
      offers[key].expanded = offers[key].expanded ? false : true;
    }
    setUpdateView(!updateView);
  };

  useEffect(() => {
    if (offers.simplex.showOffer) {
      getSimplexQuote();
    }
    if (offers.wyre.showOffer) {
      getWyreQuote();
    }
  }, []);

  useEffect(() => {
    setOffers(offers);
  }, [finishedSimplex, finishedWyre, updateView]);

  return (
    <ScrollView>
      <SummaryRow>
        <SummaryItemContainer>
          <SummaryTitle>Amount</SummaryTitle>
          <SummaryData>
            {formatFiatAmount(Number(amount), fiatCurrency, {
              customPrecision: 'minimal',
            })}
          </SummaryData>
        </SummaryItemContainer>
        <SummaryItemContainer>
          <SummaryTitle>Crypto</SummaryTitle>
          <CoinContainer>
            <CoinIconContainer>
              <CurrencyImage img={selectedWallet.img} size={20} />
            </CoinIconContainer>
            <SummaryData>{coin.toUpperCase()}</SummaryData>
          </CoinContainer>
        </SummaryItemContainer>
        <SummaryItemContainer>
          <SummaryTitle>Payment Type</SummaryTitle>
          <SummaryData>{paymentMethod.label}</SummaryData>
        </SummaryItemContainer>
        <SummaryCtaContainer>
          <Button
            buttonStyle={'secondary'}
            buttonType={'pill'}
            buttonOutline={true}
            onPress={() => {
              navigation.goBack();
            }}>
            Edit
          </Button>
        </SummaryCtaContainer>
      </SummaryRow>

      {Object.values(offers)
        .sort(
          (a, b) =>
            parseFloat(b.amountReceiving || '0') -
            parseFloat(a.amountReceiving || '0'),
        )
        .map(offer => {
          return (
            offer.showOffer && (
              <BuyCryptoExpandibleCard
                key={offer.key}
                onPress={() => {
                  expandCard(offer);
                }}>
                {!offer.fiatMoney && !offer.errorMsg && !offer.outOfLimitMsg && (
                  <SpinnerContainer>
                    <ActivityIndicator color={ProgressBlue} />
                  </SpinnerContainer>
                )}
                {!offer.fiatMoney && offer.outOfLimitMsg && (
                  <OfferDataContainer>
                    <OfferDataInfoLabel>
                      {offer.outOfLimitMsg}
                    </OfferDataInfoLabel>
                  </OfferDataContainer>
                )}
                {!offer.fiatMoney && offer.errorMsg && (
                  <OfferDataContainer>
                    <OfferDataInfoLabel>
                      Error: {offer.errorMsg}
                    </OfferDataInfoLabel>
                  </OfferDataContainer>
                )}
                <OfferRow>
                  <OfferDataContainer>
                    {offer.fiatMoney &&
                      !offer.errorMsg &&
                      !offer.outOfLimitMsg && (
                        <>
                          <OfferDataCryptoAmount>
                            {offer.amountReceiving} {coin.toUpperCase()}
                          </OfferDataCryptoAmount>
                          <OfferDataRate>
                            1 {coin.toUpperCase()} ={' '}
                            {formatFiatAmount(
                              Number(offer.fiatMoney),
                              fiatCurrency,
                            )}
                          </OfferDataRate>
                        </>
                      )}
                    <OfferDataInfoContainer>
                      <OfferDataInfoLabel>Provided By</OfferDataInfoLabel>
                      {offer.logo}
                    </OfferDataInfoContainer>
                  </OfferDataContainer>
                  {offer.fiatMoney && (
                    <SummaryCtaContainer>
                      <Button
                        buttonType={'pill'}
                        onPress={() => {
                          haptic('impactLight');
                          goTo(offer.key);
                        }}>
                        Buy
                      </Button>
                    </SummaryCtaContainer>
                  )}
                </OfferRow>

                {offer.expanded && (
                  <>
                    <ItemDivisor style={{marginTop: 20}} />
                    <OfferExpandibleItem>
                      <OfferDataInfoLabel>Buy Amount</OfferDataInfoLabel>
                      <OfferDataRightContainer>
                        <OfferDataInfoText>
                          {formatFiatAmount(
                            Number(offer.buyAmount),
                            fiatCurrency,
                          )}
                        </OfferDataInfoText>
                        <OfferDataInfoTextSec>
                          {Number(offer.amountReceiving).toFixed(6)}{' '}
                          {coin.toUpperCase()}
                        </OfferDataInfoTextSec>
                      </OfferDataRightContainer>
                    </OfferExpandibleItem>
                    <ItemDivisor />
                    <OfferExpandibleItem>
                      <OfferDataInfoLabel>Fee</OfferDataInfoLabel>
                      <OfferDataInfoText>
                        {formatFiatAmount(Number(offer.fee), fiatCurrency)}
                      </OfferDataInfoText>
                    </OfferExpandibleItem>
                    <ItemDivisor />
                    <OfferExpandibleItem>
                      <OfferDataInfoTotal>TOTAL</OfferDataInfoTotal>
                      <OfferDataInfoTotal>
                        {formatFiatAmount(
                          Number(offer.amountCost),
                          fiatCurrency,
                          {customPrecision: 'minimal'},
                        )}
                      </OfferDataInfoTotal>
                    </OfferExpandibleItem>
                    {offer.key == 'simplex' && (
                      <ExchangeTermsContainer>
                        <ExchangeTermsText>
                          What service fees am I paying?
                        </ExchangeTermsText>
                        {paymentMethod.method == 'sepaBankTransfer' && (
                          <ExchangeTermsText>
                            1.5% of the amount.
                          </ExchangeTermsText>
                        )}
                        {paymentMethod.method != 'sepaBankTransfer' && (
                          <ExchangeTermsText>
                            Can range from 3.5% to 5% of the transaction,
                            depending on the volume of traffic (with a minimum
                            of 10 USD or its equivalent in any other fiat
                            currency) + 1% of the transaction.
                            <TouchableOpacity
                              onPress={() => {
                                haptic('impactLight');
                                dispatch(
                                  openUrlWithInAppBrowser(
                                    'https://support.simplex.com/hc/en-gb/articles/360014078420-What-fees-am-I-paying-',
                                  ),
                                );
                              }}>
                              <Link
                                style={{fontSize: 12, marginLeft: 2, top: 2}}>
                                Read more
                              </Link>
                            </TouchableOpacity>
                          </ExchangeTermsText>
                        )}
                        <ExchangeTermsText style={{marginTop: 4}}>
                          This service is provided by a third party, and you are
                          subject to their
                          <TouchableOpacity
                            onPress={() => {
                              haptic('impactLight');
                              dispatch(
                                openUrlWithInAppBrowser(
                                  'https://www.simplex.com/terms-of-use/',
                                ),
                              );
                            }}>
                            <Link style={{fontSize: 12, top: 2}}>
                              Terms of use
                            </Link>
                          </TouchableOpacity>
                        </ExchangeTermsText>
                      </ExchangeTermsContainer>
                    )}
                    {offer.key == 'wyre' && (
                      <ExchangeTermsContainer>
                        <ExchangeTermsText>
                          What service fees am I paying?
                        </ExchangeTermsText>
                        {country == 'US' && (
                          <ExchangeTermsText>
                            5 USD minimum fee or 2.9% of the amount + 0.30 USD,
                            whichever is greater + Required miners fee.
                          </ExchangeTermsText>
                        )}
                        {country != 'US' && (
                          <ExchangeTermsText>
                            5 USD minimum fee or 3.9% of the amount + 0.30 USD,
                            whichever is greater + Required miners fee.
                          </ExchangeTermsText>
                        )}
                        {fiatCurrency.toUpperCase() != 'USD' && (
                          <ExchangeTermsText>
                            Or its equivalent in {fiatCurrency.toUpperCase()}.
                          </ExchangeTermsText>
                        )}
                        <TouchableOpacity
                          onPress={() => {
                            haptic('impactLight');
                            dispatch(
                              openUrlWithInAppBrowser(
                                'https://support.sendwyre.com/hc/en-us/articles/360059565013-Wyre-card-processing-fees',
                              ),
                            );
                          }}>
                          <Link style={{fontSize: 12, top: 2}}>Read more</Link>
                        </TouchableOpacity>
                        <ExchangeTermsText style={{marginTop: 4}}>
                          This service is provided by a third party, and you are
                          subject to their
                          <TouchableOpacity
                            onPress={() => {
                              haptic('impactLight');
                              dispatch(
                                openUrlWithInAppBrowser(
                                  'https://www.sendwyre.com/user-agreement/',
                                ),
                              );
                            }}>
                            <Link style={{fontSize: 12, top: 2}}>
                              User Agreement
                            </Link>
                          </TouchableOpacity>
                        </ExchangeTermsText>
                      </ExchangeTermsContainer>
                    )}
                  </>
                )}
              </BuyCryptoExpandibleCard>
            )
          );
        })}

      <TermsContainer>
        <TermsText>
          The final crypto amount you receive when the transaction is complete
          may differ because it is based on the exchange rates of the providers.
        </TermsText>
        <TermsText>Additional third-party fees may apply.</TermsText>
      </TermsContainer>
    </ScrollView>
  );
};

export default BuyCryptoOffers;
