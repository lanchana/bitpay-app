import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {StyleProp, Text, TextStyle} from 'react-native';
import {useSelector} from 'react-redux';
import styled, {useTheme} from 'styled-components/native';
import {RootState} from '../../../../../store';
import {LogLevel} from '../../../../../store/log/log.models';
import {AboutStackParamList} from '../AboutStack';

export interface SessionLogsParamList {}

type SessionLogsScreenProps = StackNavigationProp<
  AboutStackParamList,
  'SessionLogs'
>;

const ScrollView = styled.ScrollView`
  margin: 20px 15px;
`;

const SessionLogs: React.FC<SessionLogsScreenProps> = () => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const logs = useSelector(({LOG}: RootState) => LOG.logs);
  const [filterLevel] = useState(LogLevel.None);

  const filteredLogs = logs
    .filter(log => log.level <= filterLevel)
    .map(log => {
      const formattedLevel = LogLevel[log.level].toLowerCase();

      return `[${log.timestamp}] [${formattedLevel}] ${log.message}\n`;
    });

  return (
    <ScrollView>
      <Text style={textStyle}>{filteredLogs}</Text>
    </ScrollView>
  );
};

export default SessionLogs;
