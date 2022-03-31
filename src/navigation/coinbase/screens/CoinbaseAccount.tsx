import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {useAppDispatch} from '../../../utils/hooks';
import styled from 'styled-components/native';
import {FlatList, RefreshControl} from 'react-native';
import {find} from 'lodash';
import moment from 'moment';
import {sleep} from '../../../utils/helper-methods';
import {useNavigation, useTheme} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../store';
import {formatFiatAmount, shouldScale} from '../../../utils/helper-methods';
import {Hr, ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, Balance, H5} from '../../../components/styled/Text';
import {Air, Black, LightBlack, SlateDark, White} from '../../../styles/colors';
import GhostSvg from '../../../../assets/img/ghost-straight-face.svg';
import WalletTransactionSkeletonRow from '../../../components/list/WalletTransactionSkeletonRow';
import LinkingButtons from '../../tabs/home/components/LinkingButtons';
import TransactionRow from '../../../components/list/TransactionRow';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import GlobalSelect from '../../../navigation/wallet/screens/GlobalSelect';

import {getCoinbaseExchangeRate} from '../../../store/coinbase/coinbase.effects';
import {StackScreenProps} from '@react-navigation/stack';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import {
  CoinbaseErrorsProps,
  CoinbaseTransactionProps,
} from '../../../api/coinbase/coinbase.types';
import CoinbaseIcon from '../components/CoinbaseIcon';
import {CoinbaseEffects} from '../../../store/coinbase';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {
  createWalletAddress,
  ToCashAddress,
  TranslateToBchCashAddress,
} from '../../../store/wallet/effects/address/address';
import CoinbaseAPI from '../../../api/coinbase';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import Amount from '../../wallet/screens/Amount';
import {Wallet} from '../../../store/wallet/wallet.models';

const AccountContainer = styled.View`
  flex: 1;
`;

const Row = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
`;

const BalanceContainer = styled.View`
  margin: 20px 0;
  padding: 0 15px 10px;
  flex-direction: column;
`;

const Type = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#E1E4E7')};
  padding: 2px 4px;
  border-radius: 3px;
  margin-bottom: 7px;
`;

const TransactionListHeader = styled.View`
  padding: 10px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F6F7')};
`;

const BorderBottom = styled.View`
  border-bottom-width: 1px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Air)};
`;

const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
`;

const SkeletonContainer = styled.View`
  margin-bottom: 20px;
`;

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

export const WalletSelectMenuContainer = styled.View`
  padding: ${ScreenGutter};
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  max-height: 75%;
`;

export const WalletSelectMenuHeaderContainer = styled.View`
  padding: 50px 0;
`;

const AmountContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

export type CoinbaseAccountScreenParamList = {
  accountId: string;
};

const CoinbaseAccount = ({
  route,
}: StackScreenProps<CoinbaseStackParamList, 'CoinbaseAccount'>) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {accountId} = route.params;

  const [refreshing, setRefreshing] = useState(false);
  const [customSupportedCurrencies, setCustomSupportedCurrencies] = useState(
    [] as string[],
  );
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [fiatAmount, setFiatAmount] = useState(0);
  const [txs, setTxs] = useState([] as CoinbaseTransactionProps[]);

  const [selectedWallet, setSelectedWallet] = useState<Wallet>();

  const exchangeRates = useSelector(
    ({COINBASE}: RootState) => COINBASE.exchangeRates,
  );
  const user = useSelector(
    ({COINBASE}: RootState) => COINBASE.user[COINBASE_ENV],
  );
  const transactions = useSelector(
    ({COINBASE}: RootState) => COINBASE.transactions[COINBASE_ENV],
  );
  const account = useSelector(({COINBASE}: RootState) => {
    return find(COINBASE.accounts[COINBASE_ENV], {id: accountId});
  });

  const txsStatus = useSelector<RootState, 'success' | 'failed' | null>(
    ({COINBASE}) => COINBASE.getTransactionsStatus,
  );

  const txsLoading = useSelector<RootState, boolean>(
    ({COINBASE}) => COINBASE.isApiLoading,
  );

  const [isLoading, setIsLoading] = useState<boolean>();
  const [errorLoadingTxs, setErrorLoadingTxs] = useState<boolean>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: account?.name,
    });
  }, [navigation, account]);

  const parseTime = (timestamp?: string) => {
    if (!timestamp) return '';
    return moment(timestamp).format('MMM D, YYYY');
  };

  const parseAmount = (amount?: string, coin?: string) => {
    if (!amount || !coin) return '';
    return amount + ' ' + coin;
  };

  const getIcon = (coinbaseTx: CoinbaseTransactionProps) => {
    return CoinbaseIcon(coinbaseTx);
  };

  const onPressTransaction = useMemo(
    () => (transaction: any) => {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseTransaction',
        params: {tx: transaction},
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({item}) => (
      <TransactionRow
        icon={getIcon(item)}
        description={item.details.title}
        details={item.details.subtitle}
        time={parseTime(item.created_at)}
        value={parseAmount(item.amount.amount, item.amount.currency)}
        onPressTransaction={() => onPressTransaction(item)}
      />
    ),
    [onPressTransaction],
  );

  const listFooterComponent = () => {
    return (
      <>
        {isLoading ? (
          <SkeletonContainer>
            <WalletTransactionSkeletonRow />
          </SkeletonContainer>
        ) : null}
      </>
    );
  };

  const listEmptyComponent = () => {
    return (
      <>
        {!isLoading && !errorLoadingTxs && (
          <EmptyListContainer>
            <H5>It's a ghost town in here</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}

        {!isLoading && errorLoadingTxs && (
          <EmptyListContainer>
            <H5>Could not update transaction history</H5>
            <GhostSvg style={{marginTop: 20}} />
          </EmptyListContainer>
        )}
      </>
    );
  };

  useEffect(() => {
    if (account && account.balance) {
      const fa = getCoinbaseExchangeRate(
        account.balance.amount,
        account.balance.currency,
        exchangeRates,
      );
      setFiatAmount(fa);
      const currencies: string[] = [];
      currencies.push(account.balance.currency.toLowerCase());
      setCustomSupportedCurrencies(currencies);
    }

    if (transactions && transactions[accountId]) {
      const tx = transactions[accountId].data;
      setTxs(tx);
    }

    if (txsLoading) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }

    if (txsStatus && txsStatus === 'failed') {
      setErrorLoadingTxs(true);
    }
  }, [account, transactions, txsLoading, txsStatus, accountId, exchangeRates]);

  const deposit = async () => {
    // Deposit:
    //   Transfer from BitPay wallet to Coinbase Account
    dispatch(
      showOnGoingProcessModal(OnGoingProcessMessages.FETCHING_COINBASE_DATA),
    );
    dispatch(CoinbaseEffects.createAddress(accountId)).then(
      async newAddress => {
        if (account?.currency.code === 'BCH') {
          // Convert old format bch address to bch cash address
          newAddress = TranslateToBchCashAddress(newAddress);
          newAddress = ToCashAddress(newAddress, false);
        }
        dispatch(dismissOnGoingProcessModal());
        await sleep(400);
        navigation.navigate('Wallet', {
          screen: 'GlobalSelect',
          params: {
            context: 'deposit',
            toCoinbase: {
              account: account?.name || 'Coinbase',
              currency: account?.currency.code.toLowerCase() || '',
              address: newAddress,
              title: 'Send from BitPay Wallet',
            },
          },
        });
      },
    );
  };

  const onSelectedWallet = async (newWallet?: Wallet) => {
    setWalletModalVisible(false);

    if (newWallet) {
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.GENERATING_ADDRESS),
      );
      await dispatch<any>(
        createWalletAddress({wallet: newWallet, newAddress: false}),
      );
      setSelectedWallet(newWallet);
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      setAmountModalVisible(true);
    }
  };

  const onEnteredAmount = (newAmount?: number) => {
    setAmountModalVisible(false);
    if (newAmount) {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseWithdraw',
        params: {accountId, wallet: selectedWallet, amount: newAmount},
      });
    }
  };

  const showError = async (error: CoinbaseErrorsProps) => {
    const errMsg = CoinbaseAPI.parseErrorToString(error);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: 'Coinbase Error',
        message: errMsg,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'OK',
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await sleep(1000);

    try {
      await dispatch(CoinbaseEffects.getAccountsAndBalance());
      await dispatch(CoinbaseEffects.getTransactionsByAccount(accountId));
    } catch (err: CoinbaseErrorsProps | any) {
      setRefreshing(false);
      showError(err);
    }
    setRefreshing(false);
  };

  return (
    <AccountContainer>
      <BalanceContainer>
        <Row>
          <Balance scale={shouldScale(account?.balance.amount)}>
            {account?.balance.amount} {account?.balance.currency}
          </Balance>
        </Row>
        <Row>
          <H5>
            {fiatAmount
              ? formatFiatAmount(
                  fiatAmount,
                  user?.data.native_currency.toLowerCase() || 'usd',
                )
              : '...'}{' '}
            {user?.data.native_currency}
          </H5>
          {account?.primary && <Type>Primary</Type>}
        </Row>
        <LinkingButtons
          receive={{cta: deposit, label: 'deposit'}}
          send={{
            cta: () => {
              setWalletModalVisible(true);
            },
            label: 'withdraw',
          }}
          buy={{cta: () => null, hide: true}}
          swap={{cta: () => null, hide: true}}
        />
      </BalanceContainer>
      <Hr />
      <FlatList
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={() => {
          return (
            <TransactionListHeader>
              <H5>Transactions</H5>
            </TransactionListHeader>
          );
        }}
        data={txs}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <BorderBottom />}
        ListFooterComponent={listFooterComponent}
        ListEmptyComponent={listEmptyComponent}
      />

      <SheetModal
        isVisible={walletModalVisible}
        onBackdropPress={() => setWalletModalVisible(false)}>
        <GlobalSelectContainer>
          <GlobalSelect
            title={'Select destination wallet'}
            customSupportedCurrencies={customSupportedCurrencies}
            useAsModal={true}
            onDismiss={onSelectedWallet}
          />
        </GlobalSelectContainer>
      </SheetModal>

      <SheetModal
        isVisible={amountModalVisible}
        onBackdropPress={() => {
          setAmountModalVisible(false);
        }}>
        <AmountContainer>
          <Amount
            useAsModal={true}
            currencyAbbreviationModal={account?.balance.currency}
            onDismiss={onEnteredAmount}
          />
        </AmountContainer>
      </SheetModal>
    </AccountContainer>
  );
};

export default CoinbaseAccount;
