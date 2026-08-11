import type { IdeaResponse } from '../../api/types';
import { buildTreeRows, sortParentCandidates } from '../tree';

const idea = (ideaId: string, over: Partial<IdeaResponse> = {}): IdeaResponse => ({
  ideaId, parentIdeaId: null, convertedTaskId: null, title: `제목${ideaId}`, content: null,
  category: null, pinned: false, convertedAt: null, createdAt: '', updatedAt: '', stickerCode: null,
  ...over,
});

const ideas = [
  idea('a'),
  idea('a1', { parentIdeaId: 'a', title: '피자 아이디어' }),
  idea('a1x', { parentIdeaId: 'a1' }),
  idea('b', { content: '파스타 레시피' }),
];

describe('buildTreeRows (웹 IdeaDumpPage 이식)', () => {
  it('접힌 상태에선 루트만, depth·childCount 계산', () => {
    const rows = buildTreeRows(ideas, '', new Set());
    expect(rows.map((r) => r.idea.ideaId)).toEqual(['a', 'b']);
    expect(rows[0]).toMatchObject({ depth: 0, childCount: 1, isExpanded: false });
  });

  it('펼치면 자식이 depth+1로 이어진다', () => {
    const rows = buildTreeRows(ideas, '', new Set(['a', 'a1']));
    expect(rows.map((r) => r.idea.ideaId)).toEqual(['a', 'a1', 'a1x', 'b']);
    expect(rows[2].depth).toBe(2);
  });

  it('검색어가 있으면 강제 펼침 + 자손 매칭 시 조상 유지', () => {
    const rows = buildTreeRows(ideas, '피자', new Set());
    expect(rows.map((r) => r.idea.ideaId)).toEqual(['a', 'a1']); // a1x는 비매칭·자손 없음
    expect(rows[0].isExpanded).toBe(true);
  });

  it('content로도 검색된다', () => {
    expect(buildTreeRows(ideas, '파스타', new Set()).map((r) => r.idea.ideaId)).toEqual(['b']);
  });

  it('부모가 목록에 없는 고아는 루트로 승격', () => {
    const rows = buildTreeRows([idea('c', { parentIdeaId: 'ghost' })], '', new Set());
    expect(rows.map((r) => r.idea.ideaId)).toEqual(['c']);
    expect(rows[0].depth).toBe(0);
  });
});

describe('sortParentCandidates', () => {
  const list = [
    idea('n2', { parentIdeaId: 't1', title: '나하위' }),
    idea('t2', { title: '바탕' }),
    idea('n1', { parentIdeaId: 't1', title: '가하위' }),
    idea('t1', { title: '가지' }),
  ];

  it('최상위를 먼저, 각 묶음 안에서 제목 오름차순', () => {
    expect(sortParentCandidates(list, list).map((i) => i.ideaId)).toEqual(['t1', 't2', 'n1', 'n2']);
  });

  it('부모가 목록에 없는 고아는 최상위로 본다', () => {
    const withOrphan = [...list, idea('o1', { parentIdeaId: 'ghost', title: '나고아' })];
    expect(sortParentCandidates(withOrphan, withOrphan).map((i) => i.ideaId))
      .toEqual(['t1', 'o1', 't2', 'n1', 'n2']);
  });

  it('원본 배열을 건드리지 않는다', () => {
    const original = [...list];
    sortParentCandidates(list, list);
    expect(list).toEqual(original);
  });
});
