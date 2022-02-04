import React, {useLayoutEffect} from 'react';
import {BaseText, HeaderTitle, Link} from '../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletStackParamList} from '../WalletStack';
import {View, TouchableOpacity} from 'react-native';
import styled from 'styled-components/native';
import {
  Hr,
  Info,
  InfoTriangle,
  ScreenGutter,
  Setting,
  SettingTitle,
  SettingView,
} from '../../../components/styled/Containers';
import ChevronRightSvg from '../../../../assets/img/angle-right.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import WalletSettingsRow from '../../../components/list/WalletSettingsRow';
import Button from '../../../components/button/Button';
import {SlateDark, White} from '../../../styles/colors';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {useDispatch} from 'react-redux';
import InfoIcon from '../../../components/icons/info/InfoIcon';
import RequestEncryptPasswordToggle from '../components/RequestEncryptPasswordToggle';
import {buildNestedWalletList} from './KeyOverview';
import {URL} from '../../../constants';

const WalletSettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const Title = styled(BaseText)`
  font-weight: bold;
  font-size: 18px;
  margin: 5px 0;
  color: ${({theme}) => theme.colors.text};
`;

const WalletHeaderContainer = styled.View`
  padding-top: ${ScreenGutter};
  flex-direction: row;
  align-items: center;
`;

const WalletNameContainer = styled.TouchableOpacity`
  padding: 10px 0 20px 0;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const InfoImageContainer = styled.View<{infoMargin: string}>`
  margin: ${({infoMargin}) => infoMargin};
`;

const InfoTitle = styled(BaseText)`
  font-size: 16px;
  color: ${({theme}) => theme.colors.text};
`;

const InfoHeader = styled.View`
  flex-direction: row;
  margin-bottom: 10px;
`;

const InfoDescription = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const WalletSettingsTitle = styled(SettingTitle)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const KeySettings = () => {
  const {
    params: {key},
  } = useRoute<RouteProp<WalletStackParamList, 'KeySettings'>>();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const wallets = buildNestedWalletList(key.wallets);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Key Settings</HeaderTitle>,
    });
  });

  return (
    <WalletSettingsContainer>
      <ScrollView>
        <WalletNameContainer
          onPress={() => {
            haptic('impactLight');
            //    TODO: Redirect me
          }}>
          <View>
            <Title>Key Name</Title>
            <WalletSettingsTitle>key 1</WalletSettingsTitle>
          </View>

          <ChevronRightSvg height={16} />
        </WalletNameContainer>
        <Hr />

        <WalletHeaderContainer>
          <Title>Wallets</Title>
          <InfoImageContainer infoMargin={'0 0 0 8px'}>
            <InfoIcon />
          </InfoImageContainer>
        </WalletHeaderContainer>

        {wallets.map(({id, currencyName, img, isToken}) => (
          <WalletSettingsRow
            id={id}
            img={img}
            currencyName={currencyName}
            key={id}
            isToken={isToken}
          />
        ))}

        <VerticalPadding>
          <Button
            buttonType={'link'}
            onPress={() => {
              //  TODO: Redirect me
            }}>
            Add a wallet
          </Button>
        </VerticalPadding>

        <VerticalPadding>
          <Title>Security</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>Backup</WalletSettingsTitle>
          </Setting>
          <Hr />

          <SettingView>
            <WalletSettingsTitle>Request Encrypt Password</WalletSettingsTitle>

            <RequestEncryptPasswordToggle currentKey={key} />
          </SettingView>

          <Info>
            <InfoTriangle />

            <InfoHeader>
              <InfoImageContainer infoMargin={'0 8px 0 0'}>
                <InfoIcon />
              </InfoImageContainer>

              <InfoTitle>Password Not Recoverable</InfoTitle>
            </InfoHeader>
            <InfoDescription>
              This password cannot be recovered. If this password is lost, funds
              can only be recovered by reimporting your 12-word recovery phrase.
            </InfoDescription>

            <VerticalPadding>
              <TouchableOpacity
                onPress={() => {
                  haptic('impactLight');
                  dispatch(openUrlWithInAppBrowser(URL.HELP_SPENDING_PASSWORD));
                }}>
                <Link>Learn More</Link>
              </TouchableOpacity>
            </VerticalPadding>
          </Info>

          <Hr />
        </VerticalPadding>

        <VerticalPadding>
          <Title>Advanced</Title>
          <Setting
            onPress={() => {
              haptic('impactLight');
              //    TODO: Redirect me
            }}>
            <WalletSettingsTitle>
              Sync Wallets Across Devices
            </WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Wallet', {
                screen: 'ExportKey',
                params: {key},
              });
            }}>
            <WalletSettingsTitle>Export Key</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Wallet', {
                screen: 'ExtendedPrivateKey',
                params: {key},
              });
            }}>
            <WalletSettingsTitle>Extended Private Key</WalletSettingsTitle>
          </Setting>
          <Hr />

          <Setting
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Wallet', {
                screen: 'DeleteKey',
                params: {keyId: key.id},
              });
            }}>
            <WalletSettingsTitle>Delete</WalletSettingsTitle>
          </Setting>
        </VerticalPadding>
      </ScrollView>
    </WalletSettingsContainer>
  );
};

export default KeySettings;
