import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect} from 'react';
import {Platform, ScrollView} from 'react-native';
import {requestNotifications, RESULTS} from 'react-native-permissions';
import {useAndroidBackHandler} from 'react-navigation-backhandler';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import haptic from '../../../components/haptic-feedback/haptic';
import {
  ActionContainer,
  CtaContainer,
  HeaderRightContainer,
  HEIGHT,
  ImageContainer,
  TextContainer,
  TitleContainer,
} from '../../../components/styled/Containers';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {AppEffects} from '../../../store/app';
import {useAppDispatch} from '../../../utils/hooks';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {OnboardingStackParamList} from '../OnboardingStack';
import {OnboardingImage} from '../components/Containers';

const NotificationsContainer = styled.SafeAreaView`
  flex: 1;
  align-items: stretch;
`;

const NotificationImage = {
  light: (
    <OnboardingImage
      style={{width: 190, height: 178}}
      source={require('../../../../assets/img/onboarding/light/notifications.png')}
    />
  ),
  dark: (
    <OnboardingImage
      style={{width: 190, height: 170}}
      source={require('../../../../assets/img/onboarding/dark/notifications.png')}
    />
  ),
};

// estimated a number, tweak if neccessary based on the content length
const scrollEnabledForSmallScreens = HEIGHT < 600;

const NotificationsScreen: React.VFC<
  StackScreenProps<OnboardingStackParamList, 'Notifications'>
> = ({navigation}) => {
  const dispatch = useAppDispatch();
  const themeType = useThemeType();

  useAndroidBackHandler(() => true);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
      headerRight: () => (
        <HeaderRightContainer>
          <Button
            buttonType={'pill'}
            onPress={() => {
              haptic('impactLight');
              navigation.navigate('Pin');
            }}>
            Skip
          </Button>
        </HeaderRightContainer>
      ),
    });
  }, [navigation]);

  const onSetNotificationsPress = async (notificationsAccepted: boolean) => {
    const setAndNavigate = async (accepted: boolean) => {
      haptic('impactLight');
      const systemEnabled = await AppEffects.checkNotificationsPermissions();
      if (systemEnabled) {
        dispatch(AppEffects.setNotifications(accepted));
        dispatch(AppEffects.setConfirmTxNotifications(accepted));
        dispatch(AppEffects.setProductsUpdatesNotifications(accepted));
        dispatch(AppEffects.setOffersAndPromotionsNotifications(accepted));
      }
      navigation.navigate('Pin');
    };

    if (!notificationsAccepted) {
      setAndNavigate(false);
      return;
    }

    if (Platform.OS === 'ios') {
      try {
        const {status: updatedStatus} = await requestNotifications([
          'alert',
          'badge',
          'sound',
        ]);
        setAndNavigate(updatedStatus === RESULTS.GRANTED);
        return;
      } catch (err) {
        console.error(err);
      }
    }

    setAndNavigate(true);
  };

  return (
    <NotificationsContainer>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
        }}
        scrollEnabled={scrollEnabledForSmallScreens}>
        <ImageContainer justifyContent={'flex-end'}>
          {NotificationImage[themeType]}
        </ImageContainer>
        <TitleContainer>
          <TextAlign align={'center'}>
            <H3>Turn on notifications</H3>
          </TextAlign>
        </TitleContainer>
        <TextContainer>
          <TextAlign align={'center'}>
            <Paragraph>
              Get important updates on your account, new features, promos and
              more. You can change this at any time in Settings.
            </Paragraph>
          </TextAlign>
        </TextContainer>

        <CtaContainer>
          <ActionContainer>
            <Button
              buttonStyle={'primary'}
              onPress={() => onSetNotificationsPress(true)}>
              Allow
            </Button>
          </ActionContainer>
          <ActionContainer>
            <Button
              buttonStyle={'secondary'}
              onPress={() => onSetNotificationsPress(false)}>
              Deny
            </Button>
          </ActionContainer>
        </CtaContainer>
      </ScrollView>
    </NotificationsContainer>
  );
};

export default NotificationsScreen;
