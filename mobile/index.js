import 'expo-router/entry';
import { AppRegistry } from 'react-native';
import { runPomodoroCommand } from './src/widget/headless';

// 위젯 → PomodoroCommandService(HeadlessJsTaskService)가 이 이름으로 실행한다
AppRegistry.registerHeadlessTask('DumpitPomodoroCommand', () => runPomodoroCommand);
