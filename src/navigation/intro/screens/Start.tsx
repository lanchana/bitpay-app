import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import styled, {useTheme} from 'styled-components/native';
import FeatureCard from '../../../components/feature-card/FeatureCard';
import {IntroStackParamList} from '../IntroStack';

const lightImage = require('../../../../assets/img/intro/light/whats-new.png');
const darkImage = require('../../../../assets/img/intro/dark/whats-new.png');

const IntroStartContainer = styled.View`
  flex: 1;
`;

type IntroStartScreenProps = StackScreenProps<IntroStackParamList, 'Start'>;

const Start: React.VFC<IntroStartScreenProps> = ({navigation}) => {
  const theme = useTheme();

  const onNext = () => {
    navigation.navigate('WhatsNew');
  };

  return (
    <IntroStartContainer>
      <FeatureCard
        image={theme.dark ? darkImage : lightImage}
        descriptionTitle={'Explore the new BitPay App'}
        descriptionText={
          'Your home tab is now your launchpad. View all your keys and check out new offerings from BitPay.'
        }
        ctaText={'Check it out'}
        cta={onNext}
      />
    </IntroStartContainer>
  );
};

export default Start;
