// react-native 전체를 모킹하면 jest-expo 셋업이 깨지므로 useColorScheme 모듈만 교체
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

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
