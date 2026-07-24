import type { IdeaResponse } from '../../api/types';
import { buildTreeRows } from '../tree';

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
