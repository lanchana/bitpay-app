import {useNavigation} from '@react-navigation/native';
import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import ExchangeRateItem from './ExchangeRateItem';

export interface ExchangeRateItemProps {
  id: string;
  img: string | ((props: any) => ReactElement);
  currencyName?: string;
  currencyAbbreviation?: string;
  average?: number;
  currentPrice?: number;
  priceDisplay: Array<any>;
}

const ExchangeRateListContainer = styled.View`
  margin: 35px ${ScreenGutter} 10px;
`;
interface ExchangeRateProps {
  items: Array<ExchangeRateItemProps>;
  defaultAltCurrencyIsoCode: string;
}

const ExchangeRatesList: React.FC<ExchangeRateProps> = props => {
  const {items, defaultAltCurrencyIsoCode} = props;
  const navigation = useNavigation();

  return (
    <ExchangeRateListContainer>
      {items.map(item => (
        <ExchangeRateItem
          item={item}
          key={item.id}
          onPress={() => {
            haptic('impactLight');
            navigation.navigate('Wallet', {
              screen: 'PriceCharts',
              params: {item},
            });
          }}
          defaultAltCurrencyIsoCode={defaultAltCurrencyIsoCode}
        />
      ))}
    </ExchangeRateListContainer>
  );
};

export default ExchangeRatesList;
