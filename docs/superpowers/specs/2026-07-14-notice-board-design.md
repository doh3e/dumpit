# 공지사항 게시판형 개편 설계

- 날짜: 2026-07-14
- 상태: 승인됨 (본문=아코디언, 고정공지=모든 페이지 상단, 팝업=지정만·읽을 때까지)

## 배경 / 문제

- 현재 `/notices`는 발행된 공지 전체를 본문 포함으로 한꺼번에 내려주고, NoticePage는 모든 공지의 제목+본문을 목록에 그대로 렌더링한다. 공지가 쌓일수록 페이지가 무한정 길어진다.
- 팝업(NoticeModal)은 **모든** 안 읽은 공지에 대해 순차적으로 뜬다. 사소한 공지도 전부 팝업이 되어 피로도가 높다.
- 상단 고정(중요 공지 상시 노출) 수단이 없다.

## 결정 사항

1. **본문 표시**: 목록 행(제목 | 등록일 | 수정일) 클릭 시 그 자리에서 아코디언으로 본문 펼침/접힘.
2. **고정 공지**: 모든 페이지 상단에 항상 표시(📌), 페이지당 3개 카운트에서 제외.
3. **팝업 공지**: admin이 `popup`으로 지정한 공지만 팝업 노출. 기존 읽음 처리(NoticeRead) 유지 — 확인 누르면 다시 안 뜸.
4. **정렬·등록일 기준**: `publishAt`(예약 게시 시점) 최신순. 수정일은 등록 후 실제 수정된 경우에만 표시, 아니면 `-`.
5. **페이지네이션**: 서버 사이드(Spring Pageable), 페이지당 3개.

## 변경 내역

### DB — `V5__notice_pinned_popup.sql`

```sql
ALTER TABLE notices ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS popup boolean NOT NULL DEFAULT false;
```

기존 공지는 전부 false → 배포 직후 팝업 노출 0건, admin 지정분만 뜬다.

### 백엔드

- `Notice` 엔티티: `pinned`, `popup` boolean 필드(+setter, `of()` 반영).
- `NoticeRequest`: `Boolean pinned`, `Boolean popup` 추가 — null이면 false 처리.
- `NoticeResponse`: `pinned`, `popup` 포함.
- `GET /notices?page=0` 응답 형태 변경 (`NoticePageResponse`):
  ```json
  {
    "pinned": [ /* 고정 공지 전부, publishAt desc */ ],
    "notices": [ /* 일반(비고정) 공지 3개, publishAt desc */ ],
    "page": 0,
    "totalPages": 4,
    "totalElements": 10
  }
  ```
  - 고정 목록: `status=PUBLISHED AND publishAt<=now AND pinned=true`
  - 일반 목록: `status=PUBLISHED AND publishAt<=now AND pinned=false` + `PageRequest.of(page, 3)`
  - content는 목록 응답에 포함(아코디언 클릭 시 추가 요청 불필요).
- `GET /notices/unread`: `popup = true` 조건 추가 (`NoticeReadRepository.findUnreadPublished` 쿼리 수정).
- Admin create/update: pinned/popup 저장.

### 프론트

- **NoticePage**: 게시판 스타일 재작성.
  - 고정 공지 섹션(📌) 항상 최상단, 아래 일반 공지 3행.
  - 행: `제목 | 등록일(publishAt) | 수정일(updatedAt, 미수정 시 '-')`, 클릭 시 아코디언 본문(MarkdownRenderer).
  - 하단 `◀ 1 2 3 ▶` 페이지네이션, 페이지 전환 시 서버 재조회.
- **Layout / NoticeModal**: 변경 없음 (백엔드가 popup 공지만 반환).
- **AdminPage**: 공지 폼에 「상단 고정」「팝업 노출」 체크박스, 관리 목록에 📌/팝업 뱃지.

### 테스트

- `NoticeInquiryApiTest`: 페이지네이션(3개 단위·totalPages), pinned 분리(일반 목록에서 제외), popup 필터(unread에 popup만), 읽음 처리 후 미노출 유지.
- `AdminApiTest`: pinned/popup 저장·수정 반영.

## 비고

- 수정일 판정: `updatedAt`은 `@UpdateTimestamp`라 생성 시에도 세팅됨 → 프론트에서 `updatedAt - createdAt`이 유의미한 차이(수 초 이상)일 때만 표시.
- 응답 형태가 배열 → 객체로 바뀌므로 NoticePage 외 `/notices` 소비처가 없는지 확인(현재 없음).
