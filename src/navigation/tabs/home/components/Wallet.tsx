import React from 'react';
import styled, {useTheme} from 'styled-components/native';
import HomeCard from '../../../../components/home-card/HomeCard';
import {BaseText} from '../../../../components/styled/Text';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  LightBlack,
  NeutralSlate,
  Slate,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {
  formatFiatAmount,
  formatFiatAmountObj,
} from '../../../../utils/helper-methods';
import {getRemainingWalletCount} from '../../../../store/wallet/utils/wallet';
import {
  ActiveOpacity,
  Column,
  Row,
  ScreenGutter,
} from '../../../../components/styled/Containers';
import {Balance, KeyName} from '../../../wallet/components/KeyDropdownOption';
import {HomeCarouselLayoutType} from '../../../../store/app/app.models';
import {BoxShadow} from './Styled';
import {View} from 'react-native';
import Percentage from '../../../../components/percentage/Percentage';
import {useAppSelector} from '../../../../utils/hooks';

interface WalletCardComponentProps {
  wallets: Wallet[];
  totalBalance: number;
  percentageDifference: number;
  onPress: () => void;
  needsBackup: boolean;
  keyName: string | undefined;
  layout: HomeCarouselLayoutType;
}

export const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
`;

export const ListCard = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  margin: 10px ${ScreenGutter};
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  height: 75px;
`;

export const Img = styled.View<{isFirst: boolean}>`
  min-height: 22px;
  margin-left: ${({isFirst}) => (isFirst ? 0 : '-5px')};
`;

export const RemainingAssetsLabel = styled(BaseText)`
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: 0;
  color: ${Slate};
  margin-left: 5px;
`;

const NeedBackupText = styled(BaseText)`
  font-size: 12px;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  padding: 2px 4px;
  border: 1px solid ${({theme: {dark}}) => (dark ? White : '#E1E4E7')};
  border-radius: 3px;
`;

const BalanceCode = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : SlateDark)};
  font-weight: 500;
`;

const BalanceCodeContainer = styled.View`
  padding-left: 2px;
`;

export const WALLET_DISPLAY_LIMIT = 3;
export const ICON_SIZE = 20;

const WalletCardComponent: React.FC<WalletCardComponentProps> = ({
  wallets,
  totalBalance,
  percentageDifference,
  onPress,
  needsBackup,
  keyName = 'My Key',
  layout,
}) => {
  const theme = useTheme();
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const walletInfo = wallets.slice(0, WALLET_DISPLAY_LIMIT);
  const remainingWalletCount = getRemainingWalletCount(wallets);
  const isListView = layout === 'listView';
  const HeaderComponent = (
    <HeaderImg>
      {walletInfo.map((wallet, index) => {
        const {id, img} = wallet;
        return (
          wallet && (
            <Img key={id} isFirst={index === 0}>
              <CurrencyImage img={img} size={isListView ? 15 : ICON_SIZE} />
            </Img>
          )
        );
      })}
      {remainingWalletCount ? (
        <View style={isListView ? {paddingBottom: 5} : null}>
          <RemainingAssetsLabel>
            + {remainingWalletCount} more{' '}
          </RemainingAssetsLabel>
        </View>
      ) : null}
    </HeaderImg>
  );

  /* ////////////////////////////// LISTVIEW */
  if (layout === 'listView') {
    const {amount, code} = formatFiatAmountObj(
      totalBalance,
      defaultAltCurrency.isoCode,
    );
    return (
      <ListCard
        activeOpacity={ActiveOpacity}
        onPress={onPress}
        style={!theme.dark ? BoxShadow : null}>
        <Row style={{alignItems: 'center', justifyContent: 'center'}}>
          <Column>
            {HeaderComponent}
            <KeyName>{keyName}</KeyName>
          </Column>
          <Column style={{justifyContent: 'center', alignItems: 'flex-end'}}>
            {needsBackup ? (
              <NeedBackupText>Needs Backup</NeedBackupText>
            ) : (
              <>
                <Balance>
                  {amount}
                  {code ? (
                    <BalanceCodeContainer>
                      <BalanceCode>{code}</BalanceCode>
                    </BalanceCodeContainer>
                  ) : null}
                </Balance>
                {percentageDifference ? (
                  <Percentage
                    percentageDifference={percentageDifference}
                    darkModeColor={Slate}
                  />
                ) : null}
              </>
            )}
          </Column>
        </Row>
      </ListCard>
    );
  }

  // todo refactor to not use multiple layers for home card as it will no longer be used for anything other then keys

  /* ////////////////////////////// CAROUSEL */
  return (
    <HomeCard
      header={HeaderComponent}
      body={{
        title: keyName,
        value: formatFiatAmount(totalBalance, defaultAltCurrency.isoCode),
        percentageDifference,
        needsBackup,
      }}
      onCTAPress={onPress}
    />
  );
};

export default WalletCardComponent;
