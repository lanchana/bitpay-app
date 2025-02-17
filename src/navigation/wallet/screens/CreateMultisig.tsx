import React, {useState} from 'react';
import {TouchableOpacity} from 'react-native';
import styled from 'styled-components/native';
import {Caution, SlateDark, White, Action, Slate} from '../../../styles/colors';
import {
  Paragraph,
  BaseText,
  Link,
  InfoTitle,
  InfoHeader,
  InfoDescription,
} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {useDispatch} from 'react-redux';
import {
  showBottomNotificationModal,
  dismissOnGoingProcessModal,
  setHomeCarouselConfig,
} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useForm, Controller} from 'react-hook-form';
import BoxInput from '../../../components/form/BoxInput';
import {useLogger} from '../../../utils/hooks/useLogger';
import {KeyOptions, Status} from '../../../store/wallet/wallet.models';
import {
  RouteProp,
  useNavigation,
  useRoute,
  CommonActions,
} from '@react-navigation/native';
import {
  Info,
  InfoTriangle,
  AdvancedOptionsContainer,
  AdvancedOptionsButton,
  AdvancedOptionsButtonText,
  AdvancedOptions,
  Column,
  ScreenGutter,
  CtaContainer as _CtaContainer,
  InfoImageContainer,
} from '../../../components/styled/Containers';
import Haptic from '../../../components/haptic-feedback/haptic';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import ChevronUpSvg from '../../../../assets/img/chevron-up.svg';
import {Currencies} from '../../../constants/currencies';
import Checkbox from '../../../components/checkbox/Checkbox';
import {WalletStackParamList} from '../WalletStack';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {
  startCreateKeyMultisig,
  addWalletMultisig,
} from '../../../store/wallet/effects';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import InfoSvg from '../../../../assets/img/info.svg';
import PlusIcon from '../../../components/plus/Plus';
import MinusIcon from '../../../components/minus/Minus';
import {sleep} from '../../../utils/helper-methods';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
export interface CreateMultisigProps {
  currency?: string;
  key?: Key;
}

const schema = yup.object().shape({
  name: yup.string().required(),
  myName: yup.string().required(),
  requiredSignatures: yup
    .number()
    .required()
    .positive()
    .integer()
    .min(1)
    .max(3), // m
  totalCopayers: yup.number().required().positive().integer().min(2).max(6), // n
});

const Gutter = '10px';
export const MultisigContainer = styled.View`
  padding: ${Gutter} 0;
`;

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 10px;
`;

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const OptionTitle = styled(BaseText)`
  font-size: 16px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const VerticalPadding = styled.View`
  padding: ${ScreenGutter} 0;
`;

const OptionContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const CounterContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const RoundButton = styled.View`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin: 10px;
  border-radius: 30px;
  border: 1px solid ${({theme: {dark}}) => (dark ? White : Action)};
`;

const RemoveButton = styled.TouchableOpacity`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 30px;
  border: 1px solid ${Slate};
`;

const AddButton = styled.TouchableOpacity`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  width: 20px;
  border: 1px solid black;
  border-radius: 30px;
  border: 1px solid ${({theme: {dark}}) => (dark ? White : Action)};
`;

const CounterNumber = styled.Text`
  color: ${({theme: {dark}}) => (dark ? White : Action)};
  font-size: 16px;
`;

const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 18px;
`;

const InputContainer = styled.View`
  margin-top: 20px;
`;

const CtaContainer = styled(_CtaContainer)`
  padding: 10px 0;
`;

const CreateMultisig = () => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const navigation = useNavigation();
  const [showOptions, setShowOptions] = useState(false);
  const [testnetEnabled, setTestnetEnabled] = useState(false);
  const [options, setOptions] = useState({
    useNativeSegwit: true,
    networkName: 'livenet',
    singleAddress: false,
  });
  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

  const route = useRoute<RouteProp<WalletStackParamList, 'CreateMultisig'>>();
  const {currency, key} = route.params || {};
  const singleAddressCurrency =
    Currencies[currency?.toLowerCase() as string].properties.singleAddress;

  const showErrorModal = (e: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: 'Something went wrong',
        message: e,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'OK',
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const onSubmit = (formData: {
    name: string;
    myName: string;
    requiredSignatures: number;
    totalCopayers: number;
  }) => {
    const {name, myName, requiredSignatures, totalCopayers} = formData;

    let opts: Partial<KeyOptions> = {};
    opts.name = name;
    opts.myName = myName;
    opts.m = requiredSignatures;
    opts.n = totalCopayers;
    opts.useNativeSegwit = options.useNativeSegwit;
    opts.networkName = options.networkName;
    opts.singleAddress = options.singleAddress;
    opts.coin = currency?.toLowerCase();

    CreateMultisigWallet(opts);
  };

  const CreateMultisigWallet = async (
    opts: Partial<KeyOptions>,
  ): Promise<void> => {
    try {
      if (key) {
        await dispatch(
          startOnGoingProcessModal(OnGoingProcessMessages.ADDING_WALLET),
        );
        const wallet = (await dispatch<any>(
          addWalletMultisig({
            key,
            opts,
          }),
        )) as Wallet;

        wallet.getStatus(
          {network: wallet.network},
          (err: any, status: Status) => {
            if (err) {
              navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    {
                      name: 'Tabs',
                      params: {screen: 'Home'},
                    },
                    {
                      name: 'Wallet',
                      params: {screen: 'KeyOverview', params: {id: key.id}},
                    },
                  ],
                }),
              );
            } else {
              navigation.dispatch(
                CommonActions.reset({
                  index: 2,
                  routes: [
                    {
                      name: 'Tabs',
                      params: {screen: 'Home'},
                    },
                    {
                      name: 'Wallet',
                      params: {screen: 'KeyOverview', params: {id: key.id}},
                    },
                    {
                      name: 'Wallet',
                      params: {
                        screen: 'Copayers',
                        params: {wallet: wallet, status: status.wallet},
                      },
                    },
                  ],
                }),
              );
            }
            dispatch(dismissOnGoingProcessModal());
          },
        );
      } else {
        await dispatch(
          startOnGoingProcessModal(OnGoingProcessMessages.CREATING_KEY),
        );
        const multisigKey = (await dispatch<any>(
          startCreateKeyMultisig(opts),
        )) as Key;

        dispatch(setHomeCarouselConfig({id: multisigKey.id, show: true}));

        navigation.navigate('Wallet', {
          screen: 'BackupKey',
          params: {context: 'createNewMultisigKey', key: multisigKey},
        });
        dispatch(dismissOnGoingProcessModal());
      }
    } catch (e: any) {
      logger.error(e.message);
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      showErrorModal(e.message);
      return;
    }
  };

  const toggleTestnet = () => {
    const _testnetEnabled = !testnetEnabled;
    setTestnetEnabled(_testnetEnabled);
    setOptions({
      ...options,
      networkName: _testnetEnabled ? 'testnet' : 'livenet',
    });
  };

  return (
    <ScrollViewContainer>
      <MultisigContainer>
        <Paragraph>
          Multisig wallets require multisig devices to set up. It takes longer
          to complete but it's the recommended security configuration for long
          term storage.
        </Paragraph>

        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                label={'WALLET NAME'}
                onChangeText={(text: string) => onChange(text)}
                onBlur={onBlur}
                value={value}
              />
            )}
            name="name"
            defaultValue=""
          />

          {errors?.name?.message && (
            <ErrorText>{errors?.name?.message}</ErrorText>
          )}
        </InputContainer>

        <InputContainer>
          <Controller
            control={control}
            render={({field: {onChange, onBlur, value}}) => (
              <BoxInput
                label={'YOUR NAME'}
                onChangeText={(text: string) => onChange(text)}
                onBlur={onBlur}
                value={value}
              />
            )}
            name="myName"
            defaultValue=""
          />

          {errors?.myName?.message && (
            <ErrorText>{errors?.myName?.message}</ErrorText>
          )}
        </InputContainer>

        <Controller
          control={control}
          render={({field: {value}}) => (
            <>
              <OptionContainer>
                <OptionTitle>Required number of signatures</OptionTitle>
                <CounterContainer>
                  <RemoveButton
                    onPress={() => {
                      const newValue = value - 1;
                      if (newValue >= 1) {
                        setValue('requiredSignatures', newValue, {
                          shouldValidate: true,
                        });
                      }
                    }}>
                    <MinusIcon />
                  </RemoveButton>
                  <RoundButton>
                    <CounterNumber>{value}</CounterNumber>
                  </RoundButton>
                  <AddButton
                    onPress={() => {
                      const newValue = value + 1;
                      if (newValue <= 3) {
                        setValue('requiredSignatures', newValue, {
                          shouldValidate: true,
                        });
                      }
                    }}>
                    <PlusIcon />
                  </AddButton>
                </CounterContainer>
              </OptionContainer>
            </>
          )}
          name="requiredSignatures"
          defaultValue={2}
        />

        {errors?.requiredSignatures?.message && (
          <ErrorText>{errors?.requiredSignatures?.message}</ErrorText>
        )}

        <Controller
          control={control}
          render={({field: {value}}) => (
            <OptionContainer>
              <Column>
                <OptionTitle>Total number of copayers</OptionTitle>
              </Column>
              <CounterContainer>
                <RemoveButton
                  onPress={() => {
                    const newValue = value - 1;
                    if (newValue >= 2) {
                      setValue('totalCopayers', newValue, {
                        shouldValidate: true,
                      });
                    }
                  }}>
                  <MinusIcon />
                </RemoveButton>
                <RoundButton>
                  <CounterNumber>{value}</CounterNumber>
                </RoundButton>
                <AddButton
                  onPress={() => {
                    const newValue = value + 1;
                    if (newValue <= 6) {
                      setValue('totalCopayers', newValue, {
                        shouldValidate: true,
                      });
                    }
                  }}>
                  <PlusIcon />
                </AddButton>
              </CounterContainer>
            </OptionContainer>
          )}
          name="totalCopayers"
          defaultValue={3}
        />

        {errors?.totalCopayers?.message && (
          <ErrorText>{errors?.totalCopayers?.message}</ErrorText>
        )}

        <CtaContainer>
          <AdvancedOptionsContainer>
            <AdvancedOptionsButton
              onPress={() => {
                Haptic('impactLight');
                setShowOptions(!showOptions);
              }}>
              {showOptions ? (
                <>
                  <AdvancedOptionsButtonText>
                    Hide Advanced Options
                  </AdvancedOptionsButtonText>
                  <ChevronUpSvg />
                </>
              ) : (
                <>
                  <AdvancedOptionsButtonText>
                    Show Advanced Options
                  </AdvancedOptionsButtonText>
                  <ChevronDownSvg />
                </>
              )}
            </AdvancedOptionsButton>

            {showOptions && (
              <AdvancedOptions>
                <RowContainer
                  onPress={() => {
                    setOptions({
                      ...options,
                      useNativeSegwit: !options.useNativeSegwit,
                    });
                  }}>
                  <Column>
                    <OptionTitle>Segwit</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={options.useNativeSegwit}
                      onPress={() => {
                        setOptions({
                          ...options,
                          useNativeSegwit: !options.useNativeSegwit,
                        });
                      }}
                    />
                  </CheckBoxContainer>
                </RowContainer>
              </AdvancedOptions>
            )}
            {showOptions && (
              <AdvancedOptions>
                <RowContainer onPress={toggleTestnet}>
                  <Column>
                    <OptionTitle>Testnet</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={testnetEnabled}
                      onPress={toggleTestnet}
                    />
                  </CheckBoxContainer>
                </RowContainer>
              </AdvancedOptions>
            )}

            {showOptions && !singleAddressCurrency && (
              <AdvancedOptions>
                <RowContainer
                  activeOpacity={1}
                  onPress={() => {
                    setOptions({
                      ...options,
                      singleAddress: !options.singleAddress,
                    });
                  }}>
                  <Column>
                    <OptionTitle>Single Address</OptionTitle>
                  </Column>
                  <CheckBoxContainer>
                    <Checkbox
                      checked={options.singleAddress}
                      onPress={() => {
                        setOptions({
                          ...options,
                          singleAddress: !options.singleAddress,
                        });
                      }}
                    />
                  </CheckBoxContainer>
                </RowContainer>

                {options.singleAddress && (
                  <>
                    <Info style={{marginHorizontal: 10}}>
                      <InfoTriangle />

                      <InfoHeader>
                        <InfoImageContainer infoMargin={'0 8px 0 0'}>
                          <InfoSvg />
                        </InfoImageContainer>

                        <InfoTitle>Single Address Wallet</InfoTitle>
                      </InfoHeader>
                      <InfoDescription>
                        The single address feature will force the wallet to only
                        use one address rather than generating new addresses.
                      </InfoDescription>

                      <VerticalPadding>
                        <TouchableOpacity
                          onPress={() => {
                            Haptic('impactLight');
                            dispatch(
                              openUrlWithInAppBrowser(
                                'https://support.bitpay.com/hc/en-us/articles/360015920572-Setting-up-the-Single-Address-Feature-for-your-BitPay-Wallet',
                              ),
                            );
                          }}>
                          <Link>Learn More</Link>
                        </TouchableOpacity>
                      </VerticalPadding>
                    </Info>
                  </>
                )}
              </AdvancedOptions>
            )}
          </AdvancedOptionsContainer>
        </CtaContainer>

        <CtaContainer>
          <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
            Create Wallet
          </Button>
        </CtaContainer>
      </MultisigContainer>
    </ScrollViewContainer>
  );
};

export default CreateMultisig;
