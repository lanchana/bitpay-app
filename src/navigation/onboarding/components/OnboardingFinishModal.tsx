import Modal from 'react-native-modal';
import React from 'react';
import styled from 'styled-components/native';
import {H3, Paragraph, TextAlign} from '../../../components/styled/Text';
import {
  ActionContainer,
  CtaContainer,
  TextContainer,
  TitleContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {RootState} from '../../../store';
import {useDispatch, useSelector} from 'react-redux';
import {AppActions} from '../../../store/app';
import {White} from '../../../styles/colors';
import LinearGradient from 'react-native-linear-gradient';
import haptic from '../../../components/haptic-feedback/haptic';

interface OnboardingFinishModalProps {
  id: string;
  title: string;
  description?: string;
  buttons: Array<ButtonProps>;
}

interface ButtonProps {
  onPress: () => void;
  text: string;
}

const BackgroundGradient = styled(LinearGradient).attrs({
  colors: ['#AD4FF7', '#1A3B8B'],
  start: {x: 0, y: 0},
  end: {x: 0, y: 0},
  useAngle: true,
  angle: 225,
})`
  border-radius: 10px;
`;

const OnboardingFinishModalContainer = styled.View`
  justify-content: center;
  align-items: center;
  width: ${WIDTH - 16}px;
  padding: 20px;
`;

const OnboardingFinishModal: React.FC = () => {
  const isVisible = useSelector(
    ({APP}: RootState) => APP.showOnboardingFinishModal,
  );
  const dispatch = useDispatch();
  const keys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const modalType = keys.length ? 'addFunds' : 'createWallet';
  const dismissModal = () => {
    haptic('impactLight');
    dispatch(AppActions.setOnboardingCompleted());
    dispatch(AppActions.dismissOnboardingFinishModal());
  };

  // TODO add navigation
  const OnboardingFinishModalTypes: {
    [key in string]: OnboardingFinishModalProps;
  } = {
    addFunds: {
      id: 'addFunds',
      title: "Let's add funds",
      description: 'To start using your wallets, you will need to have crypto.',
      buttons: [
        {
          text: 'Buy Crypto',
          onPress: () => {
            dismissModal();
          },
        },
        {
          text: 'Receive Crypto',
          onPress: () => {
            dismissModal();
          },
        },
      ],
    },
    createWallet: {
      id: 'createWallet',
      title: "Let's create a key",
      description:
        'To start using the app, you need to have a key. You can create or import a key.',
      buttons: [
        {
          text: 'Create key',
          onPress: () => {
            dismissModal();
          },
        },
        {
          text: 'Import',
          onPress: () => {
            dismissModal();
          },
        },
      ],
    },
  };

  const {title, description, buttons} = OnboardingFinishModalTypes[modalType];

  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.4}
      animationIn={'fadeInUp'}
      animationOut={'fadeOutDown'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      onBackdropPress={dismissModal}
      style={{
        alignItems: 'center',
      }}>
      <BackgroundGradient>
        <OnboardingFinishModalContainer>
          <TitleContainer style={{marginTop: 10}}>
            <TextAlign align={'center'}>
              <H3 style={{color: White}}>{title}</H3>
            </TextAlign>
          </TitleContainer>
          <TextContainer>
            <TextAlign align={'center'}>
              <Paragraph style={{color: White}}>{description}</Paragraph>
            </TextAlign>
          </TextContainer>
          <CtaContainer style={{marginTop: 10}}>
            {buttons.map(({onPress, text}, index) => {
              return (
                <ActionContainer key={index}>
                  <Button
                    buttonStyle={'primary'}
                    buttonType={'pill'}
                    onPress={onPress}>
                    {text}
                  </Button>
                </ActionContainer>
              );
            })}
          </CtaContainer>
        </OnboardingFinishModalContainer>
      </BackgroundGradient>
    </Modal>
  );
};

export default OnboardingFinishModal;
