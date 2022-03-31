import React, {useEffect, useState} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-community/clipboard';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {Br} from '../../../../../components/styled/Containers';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {changellyTxData} from '../../../../../store/swap-crypto/swap-crypto.models';
import ChangellyIcon from '../../../../../../assets/img/services/changelly/changelly-icon.svg';
import {useAppDispatch} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {SwapCryptoActions} from '../../../../../store/swap-crypto';
import {
  changellyGetStatusDetails,
  changellyGetStatus,
  Status,
  changellyGetStatusColor,
} from '../../../../../navigation/services/swap-crypto/utils/changelly-utils';
import {
  RowDataContainer,
  CryptoAmountContainer,
  CryptoTitle,
  CryptoContainer,
  CryptoAmount,
  CryptoUnit,
  IconContainer,
  RowLabel,
  RowData,
  LabelTip,
  LabelTipText,
  ColumnDataContainer,
  ColumnData,
  RemoveCta,
} from '../styled/ExternalServicesDetails';

export interface ChangellyDetailsProps {
  swapTx: changellyTxData;
}

const ChangellyDetails: React.FC = () => {
  const {
    params: {swapTx},
  } = useRoute<RouteProp<{params: ChangellyDetailsProps}>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<Status>({
    statusTitle: undefined,
    statusDescription: undefined,
  });

  const copyText = (text: string) => {
    Clipboard.setString(text);
  };

  const updateStatusDescription = () => {
    setStatus(changellyGetStatusDetails(swapTx.status));
  };

  const getStatus = (force?: boolean) => {
    if (swapTx.status == 'finished' && !force) {
      return;
    }
    changellyGetStatus(swapTx.exchangeTxId, swapTx.status)
      .then(data => {
        if (data.error) {
          console.log('Changelly getStatus Error: ' + data.error.message);
          return;
        }
        if (data.result != swapTx.status) {
          console.log('Updating status to: ' + data.result);
          swapTx.status = data.result;
          updateStatusDescription();
          dispatch(
            SwapCryptoActions.successTxChangelly({
              changellyTxData: swapTx,
            }),
          );

          console.log('Saved exchange with: ', swapTx);
        }
      })
      .catch(err => {
        console.log('Changelly getStatus Error: ', err);
      });
  };

  useEffect(() => {
    updateStatusDescription();
    getStatus();
  }, []);

  return (
    <SettingsContainer>
      <Settings>
        <RowDataContainer>
          <CryptoAmountContainer>
            <CryptoTitle>Receiving amount</CryptoTitle>
            <CryptoContainer>
              <CryptoAmount>{swapTx.amountTo}</CryptoAmount>
              <CryptoUnit>{swapTx.coinTo.toUpperCase()}</CryptoUnit>
            </CryptoContainer>
          </CryptoAmountContainer>
          <ChangellyIcon width={50} height={50} />
        </RowDataContainer>

        <ColumnDataContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              copyText(swapTx.addressTo);
            }}>
            <RowLabel>Deposit address</RowLabel>
            <ColumnData>{swapTx.addressTo}</ColumnData>
          </TouchableOpacity>
        </ColumnDataContainer>

        <RowDataContainer style={{marginTop: 20}}>
          <RowLabel>Paying</RowLabel>
          <RowData>
            {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
          </RowData>
        </RowDataContainer>

        <RowDataContainer>
          <RowLabel>Created</RowLabel>
          <RowData>
            {moment(swapTx.date).format('MMM DD, YYYY hh:mm a')}
          </RowData>
        </RowDataContainer>

        {!!swapTx.status && (
          <RowDataContainer>
            <RowLabel>Status</RowLabel>
            <RowData
              style={{
                color: changellyGetStatusColor(swapTx.status),
                textTransform: 'capitalize',
              }}>
              {status.statusTitle}
            </RowData>
          </RowDataContainer>
        )}

        <LabelTip type="info">
          <LabelTipText>{status.statusDescription}</LabelTipText>
          {!!swapTx.status && ['failed', 'hold'].includes(swapTx.status) && (
            <>
              <Br />
              <TouchableOpacity
                onPress={() => {
                  haptic('impactLight');
                  copyText('security@changelly.com');
                }}>
                <LabelTipText>
                  Please contact Changelly support:{' '}
                  <LabelTipText style={{fontWeight: '700'}}>
                    security@changelly.com
                  </LabelTipText>
                </LabelTipText>
              </TouchableOpacity>
              <Br />
              <TouchableOpacity
                onPress={() => {
                  haptic('impactLight');
                  copyText(swapTx.exchangeTxId);
                }}>
                <LabelTipText>
                  Provide the transaction id:{' '}
                  <LabelTipText style={{fontWeight: '700'}}>
                    {swapTx.exchangeTxId}
                  </LabelTipText>
                </LabelTipText>
              </TouchableOpacity>
            </>
          )}
        </LabelTip>

        <ColumnDataContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              copyText(swapTx.payinAddress);
            }}>
            <RowLabel>Exchange address (Payin)</RowLabel>
            <ColumnData>{swapTx.payinAddress}</ColumnData>
          </TouchableOpacity>
        </ColumnDataContainer>

        {!!swapTx.payinExtraId && (
          <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                haptic('impactLight');
                copyText(swapTx.payinExtraId!);
              }}>
              <RowLabel>Destination Tag (Payin Extra Id)</RowLabel>
              <ColumnData>{swapTx.payinExtraId}</ColumnData>
            </TouchableOpacity>
          </ColumnDataContainer>
        )}

        <ColumnDataContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              copyText(swapTx.refundAddress);
            }}>
            <RowLabel>Refund address</RowLabel>
            <ColumnData>{swapTx.refundAddress}</ColumnData>
          </TouchableOpacity>
        </ColumnDataContainer>

        <ColumnDataContainer>
          <TouchableOpacity
            onPress={() => {
              haptic('impactLight');
              copyText(swapTx.exchangeTxId);
            }}>
            <RowLabel>Exchange Transaction ID</RowLabel>
            <ColumnData>{swapTx.exchangeTxId}</ColumnData>
          </TouchableOpacity>
        </ColumnDataContainer>

        <RemoveCta
          onPress={async () => {
            haptic('impactLight');
            dispatch(
              showBottomNotificationModal({
                type: 'question',
                title: 'Removing Transaction Data',
                message:
                  "The data of this swap will be deleted from your device. Make sure you don't need it",
                enableBackdropDismiss: true,
                actions: [
                  {
                    text: 'REMOVE',
                    action: () => {
                      dispatch(dismissBottomNotificationModal());
                      dispatch(
                        SwapCryptoActions.removeTxChangelly({
                          exchangeTxId: swapTx.exchangeTxId,
                        }),
                      );
                      navigation.goBack();
                    },
                    primary: true,
                  },
                  {
                    text: 'GO BACK',
                    action: () => {
                      console.log('Removing transaction data CANCELED');
                    },
                  },
                ],
              }),
            );
          }}>
          <Text style={{color: 'red'}}>Remove</Text>
        </RemoveCta>
      </Settings>
    </SettingsContainer>
  );
};

export default ChangellyDetails;
