import { hostFrom, resolveBaseUrl } from '../devHost';

const PROD = 'https://api.dumpit.kr/api';

describe('hostFrom', () => {
  it('host:port에서 호스트만 뽑는다', () => {
    expect(hostFrom('172.30.1.5:8081')).toBe('172.30.1.5');
  });

  it('스킴이 붙어 있어도 처리한다', () => {
    expect(hostFrom('exp://172.30.1.5:8081')).toBe('172.30.1.5');
    expect(hostFrom('http://192.168.0.7:8081/')).toBe('192.168.0.7');
  });

  it('포트가 없어도 처리한다', () => {
    expect(hostFrom('172.30.1.5')).toBe('172.30.1.5');
  });

  it('없으면 null', () => {
    expect(hostFrom(null)).toBeNull();
    expect(hostFrom(undefined)).toBeNull();
    expect(hostFrom('')).toBeNull();
  });
});

describe('resolveBaseUrl', () => {
  describe('프로덕션 (Metro 없음)', () => {
    it('설정값을 그대로 쓴다', () => {
      expect(resolveBaseUrl(PROD, null, PROD)).toBe(PROD);
    });

    it('설정이 없으면 프로드 폴백', () => {
      expect(resolveBaseUrl(undefined, null, PROD)).toBe(PROD);
    });

    it('사설망 설정값도 건드리지 않는다 (Metro가 없으니 보정할 근거가 없다)', () => {
      expect(resolveBaseUrl('http://172.30.1.75:8080/api', null, PROD))
        .toBe('http://172.30.1.75:8080/api');
    });
  });

  describe('개발 (Metro 있음)', () => {
    it('낡은 사설 IP를 Metro 호스트로 갈아끼운다 — 포트·경로는 유지', () => {
      expect(resolveBaseUrl('http://172.30.1.75:8080/api', '172.30.1.5', PROD))
        .toBe('http://172.30.1.5:8080/api');
    });

    it('192.168 대역도 보정한다', () => {
      expect(resolveBaseUrl('http://192.168.0.9:8080/api', '192.168.0.14', PROD))
        .toBe('http://192.168.0.14:8080/api');
    });

    it('localhost도 보정한다 (실기기에서는 PC를 못 가리키므로)', () => {
      expect(resolveBaseUrl('http://localhost:8080/api', '172.30.1.5', PROD))
        .toBe('http://172.30.1.5:8080/api');
    });

    it('공개 도메인은 존중한다 — 개발 중 프로드를 겨냥하는 경우', () => {
      expect(resolveBaseUrl(PROD, '172.30.1.5', PROD)).toBe(PROD);
    });

    it('이미 맞는 주소면 그대로 둔다', () => {
      const url = 'http://172.30.1.5:8080/api';
      expect(resolveBaseUrl(url, '172.30.1.5', PROD)).toBe(url);
    });

    it('설정이 없으면 Metro 호스트 + 기본 포트로 조립한다', () => {
      expect(resolveBaseUrl(undefined, '172.30.1.5', PROD)).toBe('http://172.30.1.5:8080/api');
    });

    it('포트 없는 설정값도 형태를 유지한다', () => {
      expect(resolveBaseUrl('http://10.0.0.2/api', '172.30.1.5', PROD))
        .toBe('http://172.30.1.5/api');
    });

    it('경로 없는 설정값도 처리한다', () => {
      expect(resolveBaseUrl('http://10.0.0.2:8080', '172.30.1.5', PROD))
        .toBe('http://172.30.1.5:8080');
    });

    it('URL 형태가 아니면 손대지 않는다', () => {
      expect(resolveBaseUrl('not-a-url', '172.30.1.5', PROD)).toBe('not-a-url');
    });

    it('172.15·172.32는 사설 대역이 아니므로 존중한다', () => {
      expect(resolveBaseUrl('http://172.15.0.1:8080/api', '172.30.1.5', PROD))
        .toBe('http://172.15.0.1:8080/api');
      expect(resolveBaseUrl('http://172.32.0.1:8080/api', '172.30.1.5', PROD))
        .toBe('http://172.32.0.1:8080/api');
    });
  });
});
