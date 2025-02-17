import React, {useCallback, useEffect} from 'react';
import {useAppSelector} from '../../../../utils/hooks';
import styled from 'styled-components/native';
import {useNavigation} from '@react-navigation/native';
import haptic from '../../../../components/haptic-feedback/haptic';
import {SettingsComponent} from '../SettingsRoot';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import {WalletConnectIconContainer} from '../../../wallet-connect/styled/WalletConnectContainers';
import WalletConnectIcon from '../../../../../assets/img/wallet-connect/wallet-connect-icon.svg';
import CoinbaseSvg from '../../../../../assets/img/logos/coinbase.svg';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import {COINBASE_ENV} from '../../../../api/coinbase/coinbase.constants';

interface ConnectionsProps {
  redirectTo?: string;
}

const ConnectionItemContainer = styled.View`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  flex: 1;
`;

const IconCoinbase = styled.View`
  width: 25px;
  height: 25px;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
`;

const CoinbaseIconContainer = (
  <IconCoinbase>
    <CoinbaseSvg width="25" height="25" />
  </IconCoinbase>
);

const Connections: React.FC<ConnectionsProps> = props => {
  const {redirectTo} = props;
  const navigation = useNavigation();
  const {connectors} = useAppSelector(({WALLET_CONNECT}) => WALLET_CONNECT);

  const goToWalletConnect = useCallback(() => {
    if (Object.keys(connectors).length) {
      navigation.navigate('WalletConnect', {
        screen: 'WalletConnectConnections',
      });
    } else {
      navigation.navigate('WalletConnect', {
        screen: 'Root',
        params: {uri: undefined},
      });
    }
  }, [connectors, navigation]);

  const token = useAppSelector(({COINBASE}) => COINBASE.token[COINBASE_ENV]);
  const goToCoinbase = () => {
    haptic('impactLight');
    if (token && token.access_token) {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseSettings',
        params: {fromScreen: 'Settings'},
      });
    } else {
      navigation.navigate('Coinbase', {
        screen: 'CoinbaseRoot',
      });
    }
  };
  useEffect(() => {
    if (redirectTo === 'walletconnect') {
      // reset params to prevent re-triggering
      navigation.setParams({redirectTo: undefined} as any);
      goToWalletConnect();
    }
  }, [redirectTo, goToWalletConnect, navigation]);

  return (
    <SettingsComponent>
      <Setting
        onPress={() => {
          haptic('impactLight');
          goToWalletConnect();
        }}>
        <ConnectionItemContainer>
          <WalletConnectIconContainer>
            <WalletConnectIcon />
          </WalletConnectIconContainer>
          <SettingTitle>WalletConnect</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting onPress={() => goToCoinbase()}>
        <ConnectionItemContainer>
          {CoinbaseIconContainer}
          <SettingTitle>Coinbase</SettingTitle>
        </ConnectionItemContainer>
        <AngleRight />
      </Setting>
    </SettingsComponent>
  );
};

export default Connections;
