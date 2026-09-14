import { contentFrame } from '../contentFrame';

describe('contentFrame', () => {
  it('작은 화면과 최대 폭 경계에서는 기본 여백만 적용한다', () => {
    expect(contentFrame(320, 0, 0)).toEqual({ paddingLeft: 16, paddingRight: 16 });
    expect(contentFrame(760, 0, 0)).toEqual({ paddingLeft: 16, paddingRight: 16 });
  });

  it('대형 화면에서는 760dp 읽기 폭을 가운데에 둔다', () => {
    expect(contentFrame(1200, 0, 0)).toEqual({ paddingLeft: 236, paddingRight: 236 });
  });

  it('비대칭 safe area를 제외한 가용 폭을 가운데에 둔다', () => {
    expect(contentFrame(1200, 40, 0)).toEqual({ paddingLeft: 256, paddingRight: 216 });
  });

  it('호출자가 지정한 여백을 사용한다', () => {
    expect(contentFrame(600, 0, 0, 4)).toEqual({ paddingLeft: 4, paddingRight: 4 });
  });
});
