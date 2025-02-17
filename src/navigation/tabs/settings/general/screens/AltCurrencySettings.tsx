import React, {useCallback, useState} from 'react';
import styled from 'styled-components/native';
import {RootState} from '../../../../../store';
import debounce from 'lodash.debounce';
import AltCurrenciesRow, {
  AltCurrenciesRowProps,
} from '../../../../../components/list/AltCurrenciesRow';
import {
  Hr as _Hr,
  SearchContainer,
  SearchInput,
  ScreenGutter,
  NoResultsContainer,
  NoResultsImgContainer,
  NoResultsDescription,
} from '../../../../../components/styled/Containers';
import {FlatList, InteractionManager, Keyboard} from 'react-native';
import {BaseText} from '../../../../../components/styled/Text';
import {setDefaultAltCurrency} from '../../../../../store/app/app.actions';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';

import {useNavigation} from '@react-navigation/native';
import {LightBlack, White} from '../../../../../styles/colors';
import GhostSvg from '../../../../../../assets/img/ghost-cheeky.svg';
import SearchSvg from '../../../../../../assets/img/search.svg';
import {FormatKeyBalances} from '../../../../../store/wallet/effects/status/status';
import {updatePortfolioBalance} from '../../../../../store/wallet/wallet.actions';
import {getPriceHistory} from '../../../../../store/wallet/effects';
import {batch} from 'react-redux';

const AltCurrencySettingsContainer = styled.SafeAreaView`
  margin-top: 20px;
  flex: 1;
`;

const Header = styled.View`
  padding: 0 ${ScreenGutter};
`;

const SearchResults = styled.View`
  margin: 0 0 50px 0;
`;

const Label = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : LightBlack)};
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  text-transform: uppercase;
  opacity: 0.75;
  margin-bottom: 6px;
`;

const Hr = styled(_Hr)`
  margin: 0 15px;
`;

const SearchIconContainer = styled.View`
  padding: 10px;
`;

interface HideableViewProps {
  show: boolean;
}

const HideableView = styled.View<HideableViewProps>`
  display: ${({show}) => (show ? 'flex' : 'none')};
`;

const AltCurrencySettings = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const alternativeCurrencies = useAppSelector(
    ({APP}: RootState) => APP.altCurrencyList,
  );
  const selectedAltCurrency = useAppSelector(
    ({APP}: RootState) => APP.defaultAltCurrency,
  );

  const altCurrencyList = alternativeCurrencies.filter(
    altCurrency => selectedAltCurrency.isoCode !== altCurrency.isoCode,
  ) as Array<AltCurrenciesRowProps>;
  altCurrencyList.unshift(selectedAltCurrency);

  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState(
    [] as AltCurrenciesRowProps[],
  );

  const updateSearchResults = debounce((text: string) => {
    setSearchVal(text);
    const results = altCurrencyList.filter(
      altCurrency =>
        altCurrency.name.toLowerCase().includes(text.toLocaleLowerCase()) ||
        altCurrency.isoCode.toLowerCase().includes(text.toLocaleLowerCase()),
    );
    setSearchResults(results);
  }, 300);

  const keyExtractor = (item: AltCurrenciesRowProps) => {
    return item.isoCode;
  };

  const renderItem = useCallback(
    ({item}) => {
      const selected = selectedAltCurrency.isoCode === item.isoCode;
      return (
        <>
          <AltCurrenciesRow
            altCurrency={item}
            selected={selected}
            onPress={async () => {
              Keyboard.dismiss();
              navigation.goBack();
              InteractionManager.runAfterInteractions(() => {
                batch(() => {
                  dispatch(setDefaultAltCurrency(item));
                  dispatch(FormatKeyBalances());
                  dispatch(updatePortfolioBalance());
                  dispatch(getPriceHistory(item.isoCode));
                });
              });
            }}
          />
          {!selected ? <Hr /> : null}
        </>
      );
    },
    [selectedAltCurrency],
  );

  return (
    <AltCurrencySettingsContainer>
      <Header>
        <Label>Search Currency</Label>
        <SearchContainer>
          <SearchInput
            placeholder={''}
            onChangeText={(text: string) => {
              updateSearchResults(text);
            }}
          />
          <SearchIconContainer>
            <SearchSvg height={25} width={25} />
          </SearchIconContainer>
        </SearchContainer>
      </Header>
      <HideableView show={!!searchVal}>
        {searchResults.length ? (
          <SearchResults>
            <FlatList
              data={searchResults}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          </SearchResults>
        ) : (
          <NoResultsContainer>
            <NoResultsImgContainer>
              <GhostSvg style={{marginTop: 20}} />
            </NoResultsImgContainer>
            <NoResultsDescription>
              {"We couldn't find a match for "}
              <BaseText style={{fontWeight: 'bold'}}>{searchVal}</BaseText>.
            </NoResultsDescription>
          </NoResultsContainer>
        )}
      </HideableView>
      <HideableView show={!searchVal}>
        <SearchResults>
          <FlatList
            contentContainerStyle={{paddingBottom: 150, marginTop: 5}}
            data={altCurrencyList}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
          />
        </SearchResults>
      </HideableView>
    </AltCurrencySettingsContainer>
  );
};

export default AltCurrencySettings;
