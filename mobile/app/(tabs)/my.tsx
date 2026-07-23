import { Alert } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { RetroButton } from '../../src/components/retro/RetroButton';
import { ComingSoon } from '../../src/components/shell/ComingSoon';

export default function MyScreen() {
  const { signOut } = useAuth();

  const confirmSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => { signOut(); } },
    ]);
  };

  return (
    <ComingSoon emoji="👤" title="MY는 준비 중" phase="Phase 3에서 만나요">
      <RetroButton label="로그아웃" variant="ghost" onPress={confirmSignOut} />
    </ComingSoon>
  );
}
