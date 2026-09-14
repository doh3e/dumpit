import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockAnimations = [];
const mockCancelAnimation = jest.fn();
const mockTheme = {
  current: {
    colors: {
      accent: '#aa0000', accent2: '#00aa00', starlight: '#0000aa', card: '#fff', edge: '#222',
      shadowHero: '#333', shadowSm: '#444', fg: '#111', sub: '#555',
    },
    fonts: { chrome: 'Chrome', displayBold: 'Display', body: 'Body' },
  },
};

jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: { View: 'AnimatedView', Image: 'AnimatedImage' },
    Easing: { linear: 'linear', quad: 'quad', out: (value) => value },
    FadeInUp: { springify: () => ({ damping: () => 'fade-in' }) },
    FadeOut: { duration: () => 'fade-out' },
    cancelAnimation: (...args) => mockCancelAnimation(...args),
    runOnJS: (callback) => callback,
    useAnimatedStyle: (factory) => factory(),
    useReducedMotion: () => false,
    useSharedValue: (initial) => ReactActual.useRef({ value: initial }).current,
    withTiming: (toValue, config, callback) => {
      mockAnimations.push({ toValue, config, callback });
      return toValue;
    },
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('../../../auth/AuthContext', () => ({ useAuth: () => ({ me: { equipments: {} } }) }));
jest.mock('../../../theme/useTheme', () => ({ useTheme: () => mockTheme.current }));
jest.mock('../../../celebration/registry', () => ({
  celebrationFor: () => ({ img: { uri: 'sprite' } }),
}));
jest.mock('../../../celebration/motions', () => ({
  TOTAL_MS: 3000,
  buildParticles: () => [],
}));

const { CelebrationOverlay } = require('../CelebrationOverlay');
const { CoinToast } = require('../CoinToast');
const { PixelBurst } = require('../PixelBurst');

describe('완료 효과 수명', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();
    mockAnimations.length = 0;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it.each([
    ['코인 토스트', CoinToast, { coins: 5, taskTitle: '완료 일', duration: 2500 }],
    ['전체 완주', CelebrationOverlay, { duration: 3000 }],
  ])('%s는 callback 교체로 타이머를 재시작하지 않고 종료 시 최신 callback만 호출한다', (_name, Component, props) => {
    const first = jest.fn();
    const latest = jest.fn();
    let tree;
    act(() => {
      tree = create(<React.StrictMode><Component {...props} onDone={first} /></React.StrictMode>);
    });
    act(() => {
      jest.advanceTimersByTime(Math.floor(props.duration / 2));
    });

    act(() => {
      tree.update(<React.StrictMode><Component {...props} onDone={latest} /></React.StrictMode>);
    });
    act(() => {
      jest.advanceTimersByTime(Math.ceil(props.duration / 2) - 1);
    });
    expect(first).not.toHaveBeenCalled();
    expect(latest).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });

  it('타이머 효과는 unmount 뒤 callback을 호출하지 않는다', () => {
    const coinDone = jest.fn();
    const celebrationDone = jest.fn();
    let coin;
    let celebration;
    act(() => {
      coin = create(<CoinToast coins={3} taskTitle="완료" onDone={coinDone} />);
      celebration = create(<CelebrationOverlay onDone={celebrationDone} />);
    });
    act(() => {
      coin.unmount();
      celebration.unmount();
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(coinDone).not.toHaveBeenCalled();
    expect(celebrationDone).not.toHaveBeenCalled();
  });

  it('PixelBurst는 실제 난수 geometry를 인스턴스당 한 번만 만들고 테마 색만 갱신한다', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const firstDone = jest.fn();
    const latestDone = jest.fn();
    let tree;
    try {
      act(() => { tree = create(<PixelBurst x={10} y={20} onDone={firstDone} />); });
      expect(mockAnimations).toHaveLength(1);
      expect(mockAnimations[0].config.duration).toBe(600);

      act(() => { tree.update(<PixelBurst x={10} y={20} onDone={latestDone} />); });
      const beforeTheme = tree.root.findAllByType('AnimatedView');
      expect(beforeTheme).toHaveLength(10);
      expect(random).toHaveBeenCalledTimes(30);
      expect(beforeTheme[0].props.style[0]).toEqual(expect.objectContaining({
        width: 6,
        height: 6,
        backgroundColor: '#aa0000',
      }));
      const transforms = beforeTheme.map((particle) => particle.props.style[1].transform);

      mockTheme.current = {
        ...mockTheme.current,
        colors: { ...mockTheme.current.colors, accent: '#bb0000', accent2: '#00bb00', starlight: '#0000bb' },
      };
      act(() => { tree.update(<PixelBurst x={10} y={20} onDone={latestDone} />); });
      const afterTheme = tree.root.findAllByType('AnimatedView');
      expect(afterTheme.map((particle) => particle.props.style[1].transform)).toEqual(transforms);
      expect(afterTheme.map((particle) => particle.props.style[0].backgroundColor)).toEqual([
        '#bb0000', '#00bb00', '#0000bb', '#bb0000', '#00bb00',
        '#0000bb', '#bb0000', '#00bb00', '#0000bb', '#bb0000',
      ]);
      expect(random).toHaveBeenCalledTimes(30);
      expect(mockAnimations).toHaveLength(1);

      act(() => { mockAnimations[0].callback(true); });
      expect(firstDone).not.toHaveBeenCalled();
      expect(latestDone).toHaveBeenCalledTimes(1);
      act(() => tree.unmount());
    } finally {
      random.mockRestore();
    }
  });

  it('PixelBurst는 StrictMode cleanup과 unmount 뒤 완료 callback을 호출하지 않는다', () => {
    const onDone = jest.fn();
    let tree;
    act(() => { tree = create(<React.StrictMode><PixelBurst x={0} y={0} onDone={onDone} /></React.StrictMode>); });

    act(() => { mockAnimations.forEach((animation) => animation.callback(true)); });
    expect(onDone).toHaveBeenCalledTimes(1);

    const callbacks = mockAnimations.map((animation) => animation.callback);
    act(() => tree.unmount());
    act(() => { callbacks.forEach((callback) => callback(true)); });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(mockCancelAnimation).toHaveBeenCalled();
  });
});
