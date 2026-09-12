import { createQueryClient } from '../queryClient';

describe('createQueryClient', () => {
  it('기존 query 기본값을 유지하는 독립 client를 만든다', () => {
    expect(createQueryClient).toEqual(expect.any(Function));

    const first = createQueryClient();
    const second = createQueryClient();

    expect(first).not.toBe(second);
    expect(first.getDefaultOptions()).toEqual({
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    });

    first.clear();
    second.clear();
  });
});
