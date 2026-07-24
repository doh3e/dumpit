// react-native 전체를 모킹하면 jest-expo 셋업이 깨지므로 useColorScheme 모듈만 교체
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));
// 렌더 밖 직접 호출 테스트 — ThemeProvider 부재(ctx null) 폴백 경로를 검증한다
jest.mock('react', () => ({ ...jest.requireActual('react'), useContext: () => null }));

import { palettes } from '../tokens';
import { useTheme } from '../useTheme';

const mocked = require('react-native/Libraries/Utilities/useColorScheme').default as jest.Mock;

it('dark 스킴이면 dark 팔레트', () => {
  mocked.mockReturnValue('dark');
  expect(useTheme()).toEqual({ colors: palettes.dark, scheme: 'dark' });
});

it('light 스킴이면 light 팔레트', () => {
  mocked.mockReturnValue('light');
  expect(useTheme()).toEqual({ colors: palettes.light, scheme: 'light' });
});

it('null(미지정)이면 light 폴백', () => {
  mocked.mockReturnValue(null);
  expect(useTheme().scheme).toBe('light');
});
