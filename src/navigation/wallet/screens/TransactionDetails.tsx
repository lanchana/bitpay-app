import {
  BaseText,
  H7,
  H6,
  HeaderTitle,
  Link,
  H2,
} from '../../../components/styled/Text';
import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  buildTransactionDetails,
  EditTxNote,
  getDetailsTitle,
  IsMoved,
  IsMultisigEthInfo,
  IsReceived,
  IsSent,
  IsShared,
  NotZeroAmountEth,
  TxActions,
} from '../../../store/wallet/effects/transactions/transactions';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  Column,
  Hr,
  ImportTextInput,
  Row,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {
  GetBlockExplorerUrl,
  IsCustomERCToken,
  IsERCToken,
} from '../../../store/wallet/utils/currency';
import {TouchableOpacity} from 'react-native';
import {TransactionIcons} from '../../../constants/TransactionIcons';
import Button from '../../../components/button/Button';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import Clipboard from '@react-native-community/clipboard';
import MultipleOutputsTx from '../components/MultipleOutputsTx';
import {URL} from '../../../constants';
import {
  Black,
  Caution,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Banner from '../../../components/banner/Banner';
import Info from '../../../components/icons/info/Info';
import TransactionDetailSkeleton from '../components/TransactionDetailSkeleton';
import {sleep} from '../../../utils/helper-methods';
import {GetAmFormatDate} from '../../../store/wallet/utils/time';
import {
  createProposalAndBuildTxDetails,
  getTx,
  handleCreateTxProposalError,
} from '../../../store/wallet/effects/send/send';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {FormatAmount} from '../../../store/wallet/effects/amount/amount';
import {TransactionOptionsContext} from '../../../store/wallet/wallet.models';
import CopiedSvg from '../../../../assets/img/copied-success.svg';

const TxsDetailsContainer = styled.View`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const SubTitle = styled(BaseText)`
  font-size: 14px;
  font-weight: 300;
`;

export const DetailContainer = styled.View`
  min-height: 55px;
  justify-content: center;
  margin: 5px 0;
`;

const VerticalSpace = styled.View`
  margin: 10px 0;
`;

const MemoHeader = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin: 10px 0;
`;

export const DetailRow = styled(Row)`
  align-items: center;
  justify-content: space-between;
`;

const TransactionIdText = styled(H7)`
  max-width: 150px;
`;

export const DetailColumn = styled(Column)`
  align-items: flex-end;
`;

const TimelineContainer = styled.View`
  padding: 15px 0;
`;

const TimelineItem = styled.View`
  padding: 10px 0;
`;

const TimelineDescription = styled.View`
  margin: 0 10px;
`;

const TimelineBorderLeft = styled.View<{isFirst: boolean; isLast: boolean}>`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  position: absolute;
  top: ${({isFirst}) => (isFirst ? '45px' : 0)};
  bottom: ${({isLast}) => (isLast ? '15px' : 0)};
  left: 18px;
  width: 1px;
  z-index: -1;
`;
const TimelineTime = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const IconBackground = styled.View`
  height: 35px;
  width: 35px;
  border-radius: 50px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const NumberIcon = styled(IconBackground)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
`;

const DetailLink = styled(Link)`
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
`;

const InputText = styled(ImportTextInput)`
  height: 75px;
`;

const CopyImgContainer = styled.View`
  justify-content: center;
  margin-right: 5px;
`;

const CopyTransactionId = styled.TouchableOpacity`
  flex-direction: row;
`;

const TimelineList = ({actions}: {actions: TxActions[]}) => {
  return (
    <>
      {actions.map(
        (
          {type, time, description, by}: TxActions,
          index: number,
          {length}: {length: number},
        ) => {
          return (
            <DetailRow key={index}>
              <TimelineBorderLeft
                isFirst={index === 0}
                isLast={index === length - 1}
              />
              <TimelineItem>
                <DetailRow>
                  {type === 'rejected' ? (
                    <IconBackground>
                      <Info size={35} bgColor={Caution} />
                    </IconBackground>
                  ) : null}

                  {type === 'broadcasted' ? (
                    <IconBackground>
                      {TransactionIcons.broadcast}
                    </IconBackground>
                  ) : null}

                  {type !== 'broadcasted' && type !== 'rejected' ? (
                    <NumberIcon>
                      <H7>{length - index}</H7>
                    </NumberIcon>
                  ) : null}

                  <TimelineDescription>
                    <H7>{description}</H7>
                    {by ? <H7>{by}</H7> : null}
                  </TimelineDescription>
                </DetailRow>
              </TimelineItem>

              <TimelineTime>{GetAmFormatDate(time * 1000)}</TimelineTime>
            </DetailRow>
          );
        },
      )}
    </>
  );
};

const TransactionDetails = () => {
  const {
    params: {transaction, wallet},
  } = useRoute<RouteProp<WalletStackParamList, 'TransactionDetails'>>();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [txs, setTxs] = useState<any>();
  const [memo, setMemo] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const title = getDetailsTitle(transaction, wallet);
  let {
    currencyAbbreviation,
    keyId,
    credentials: {network, coin, walletName, walletId},
  } = wallet;
  currencyAbbreviation = currencyAbbreviation.toLowerCase();
  const isTestnet = network === 'testnet';

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{title}</HeaderTitle>,
    });
  }, [navigation, title]);

  const init = async () => {
    try {
      const _transaction = await dispatch(
        buildTransactionDetails({
          transaction,
          wallet,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
        }),
      );
      setTxs(_transaction);
      setMemo(_transaction.detailsMemo);
      await sleep(500);
      setIsLoading(false);
    } catch (e) {
      await sleep(500);
      setIsLoading(false);
      console.log(e);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const speedup = async () => {
    try {
      const txp = await getTx(wallet, transaction.proposalId);
      const toAddress = transaction.outputs[0].address;
      const recipient = {
        type: 'wallet',
        name: walletName,
        walletId,
        keyId,
        address: toAddress,
      };

      const tx = {
        wallet,
        walletId,
        context: 'fromReplaceByFee' as TransactionOptionsContext,
        amount: Number(dispatch(FormatAmount(coin, transaction.amount))),
        toAddress,
        coin,
        network,
        inputs: txp.inputs,
        feeLevel: 'priority',
        recipient,
      };

      const {txDetails, txp: newTxp} = await dispatch(
        createProposalAndBuildTxDetails(tx),
      );

      navigation.navigate('Wallet', {
        screen: 'Confirm',
        params: {
          wallet,
          recipient,
          txp: newTxp,
          txDetails,
          amount: tx.amount,
          speedup: true,
        },
      });
    } catch (err: any) {
      const [errorMessageConfig] = await Promise.all([
        dispatch(handleCreateTxProposalError(err)),
        sleep(400),
      ]);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {},
            },
          ],
        }),
      );
    }
  };

  const [copied, setCopied] = useState(false);

  const copyText = (text: string) => {
    if (!copied) {
      Clipboard.setString(text);
      setCopied(true);
    }
  };

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [copied]);

  const goToBlockchain = () => {
    let url = dispatch(GetBlockExplorerUrl(currencyAbbreviation, network));
    switch (currencyAbbreviation) {
      case 'doge':
        url =
          network === 'livenet'
            ? `https://${url}dogecoin/transaction/${txs.txid}`
            : `https://${url}tx/DOGETEST/${txs.txid}`;
        break;
      default:
        url = `https://${url}tx/${txs.txid}`;
    }

    dispatch(openUrlWithInAppBrowser(url));
  };

  const saveMemo = async () => {
    if (memo) {
      try {
        await EditTxNote(wallet, {txid: txs.txid, body: memo});
        transaction.note = {
          body: memo,
        };
        transaction.uiDescription = memo;
      } catch (e) {
        console.log('Edit note err: ', e);
      }
    }
  };

  return (
    <TxsDetailsContainer>
      {isLoading ? (
        <TransactionDetailSkeleton />
      ) : txs ? (
        <ScrollView>
          <>
            {NotZeroAmountEth(txs.amount, currencyAbbreviation) ? (
              <H2 medium={true}>{txs.amountStr}</H2>
            ) : null}

            {!IsCustomERCToken(currencyAbbreviation) ? (
              <SubTitle>
                {!txs.fiatRateStr
                  ? '...'
                  : isTestnet
                  ? 'Test Only - No Value'
                  : txs.fiatRateStr}
              </SubTitle>
            ) : null}

            {!NotZeroAmountEth(txs.amount, currencyAbbreviation) ? (
              <SubTitle>Interaction with contract</SubTitle>
            ) : null}
          </>

          {/* --------- Info ----------------*/}
          {(currencyAbbreviation === 'eth' ||
            dispatch(IsERCToken(currencyAbbreviation))) &&
          txs.error ? (
            <Banner
              type={'error'}
              title={'Waning!'}
              description={`Error encountered during contract execution (${txs.error})`}
            />
          ) : null}

          {currencyAbbreviation === 'btc' &&
          (IsReceived(txs.action) || IsMoved(txs.action)) &&
          txs.lowAmount ? (
            <Banner
              type={'warning'}
              title={'Amount Too Low To Spend'}
              description={
                'This transaction amount is too small compared to current Bitcoin network fees.'
              }
              link={{
                text: 'Learn More',
                onPress: () => {
                  dispatch(openUrlWithInAppBrowser(URL.HELP_LOW_AMOUNT));
                },
              }}
            />
          ) : null}

          {currencyAbbreviation === 'btc' &&
          txs.isRBF &&
          (IsSent(txs.action) || IsMoved(txs.action)) ? (
            <Banner
              type={'info'}
              title={'RBF transaction'}
              description={
                'This transaction can be accelerated using a higher fee.'
              }
              link={{
                text: 'Speed Up',
                onPress: speedup,
              }}
            />
          ) : null}

          {IsReceived(txs.action) && txs.lowFee ? (
            <Banner
              type={'error'}
              title={'Low Fee'}
              description={
                'This transaction may take time to confirm or be dropped due to the low fee set by the sender.'
              }
            />
          ) : null}
          {/* ------------------------------------------- */}

          <DetailContainer>
            <H6>DETAILS</H6>
          </DetailContainer>
          <Hr />

          {txs.feeStr && !IsReceived(txs.action) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>Miner fee</H7>
                  <DetailColumn>
                    <H6>{txs.feeStr}</H6>
                    {!isTestnet ? (
                      <H7>
                        {txs.feeFiatStr}{' '}
                        {txs.feeRateStr
                          ? '(' + txs.feeRateStr + ' of total amount)'
                          : null}
                      </H7>
                    ) : (
                      <SubTitle>Test Only - No Value</SubTitle>
                    )}
                  </DetailColumn>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          {IsSent(txs.action) ? <MultipleOutputsTx tx={txs} /> : null}

          {txs.creatorName && IsShared(wallet) ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>Created by</H7>

                  <H7>{txs.creatorName}</H7>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>Date</H7>
              <H7>
                {GetAmFormatDate((txs.ts || txs.createdOn || txs.time) * 1000)}
              </H7>
            </DetailRow>
          </DetailContainer>

          <Hr />

          {txs.nonce ? (
            <>
              <DetailContainer>
                <DetailRow>
                  <H7>Nonce</H7>
                  <H7>{txs.nonce}</H7>
                </DetailRow>
              </DetailContainer>
              <Hr />
            </>
          ) : null}

          <DetailContainer>
            <DetailRow>
              <H7>Confirmations</H7>
              <DetailColumn>
                {!txs.confirmations ? (
                  <TouchableOpacity
                    activeOpacity={ActiveOpacity}
                    onPress={() => {
                      dispatch(
                        openUrlWithInAppBrowser(URL.HELP_TXS_UNCONFIRMED),
                      );
                    }}>
                    <DetailLink>Unconfirmed?</DetailLink>
                  </TouchableOpacity>
                ) : null}
                {txs.feeRate ? (
                  <SubTitle>Fee rate: {txs.feeRate}</SubTitle>
                ) : null}
                {!!txs.confirmations && !txs.safeConfirmed ? (
                  <H7>{txs.conformations}</H7>
                ) : null}
                {txs.safeConfirmed ? <H7>{txs.safeConfirmed}</H7> : null}
              </DetailColumn>
            </DetailRow>
          </DetailContainer>

          <Hr />

          <VerticalSpace>
            <MemoHeader>MEMO</MemoHeader>

            <InputText
              multiline
              numberOfLines={3}
              value={memo}
              onChangeText={text => setMemo(text)}
              onEndEditing={saveMemo}
            />
          </VerticalSpace>

          <Hr />

          <DetailContainer>
            <DetailRow>
              <H7>Transaction ID</H7>

              <CopyTransactionId onPress={() => copyText(txs.txid)}>
                <CopyImgContainer>
                  {copied ? <CopiedSvg width={17} /> : null}
                </CopyImgContainer>
                <TransactionIdText numberOfLines={1} ellipsizeMode={'tail'}>
                  {txs.txid}
                </TransactionIdText>
              </CopyTransactionId>
            </DetailRow>
          </DetailContainer>

          <Hr />

          {/*  TODO: Add Notify unconfirmed transaction  row */}

          {!IsMultisigEthInfo(wallet) && txs.actionsList?.length ? (
            <>
              <TimelineContainer>
                <H7>Timeline</H7>

                <TimelineList actions={txs.actionsList} />
              </TimelineContainer>

              <Hr />
            </>
          ) : null}

          <VerticalSpace>
            <Button buttonStyle={'secondary'} onPress={goToBlockchain}>
              View On Blockchain
            </Button>
          </VerticalSpace>
        </ScrollView>
      ) : null}
    </TxsDetailsContainer>
  );
};

export default TransactionDetails;
