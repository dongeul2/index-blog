# 설계 결정 기록 (ADR)

되돌리기 어렵거나 나중에 "왜?"가 나올 결정을 한 장씩 남깁니다.
형식은 [Michael Nygard의 ADR](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)을 줄인 것입니다.

| # | 제목 | 상태 |
| --- | --- | --- |
| [0001](0001-record-decisions.md) | 결정을 ADR로 기록한다 | 채택 |
| [0002](0002-rls-as-visibility-source.md) | 공개 범위는 앱이 아니라 RLS가 정한다 | 채택 |
| [0003](0003-testing-and-ci.md) | 테스트 층과 CI 관문 | 채택 |
| [0004](0004-portfolio-restructure.md) | 블로그를 포트폴리오 구조로 재편한다 | 제안 |
| [0005](0005-public-data-cache-policy.md) | 공개 화면의 DB 조회에 명시적인 캐시 정책을 둔다 | 채택 |

새 ADR은 `NNNN-kebab-title.md`로, 아래 틀을 씁니다.

```md
# NNNN. 제목
- 상태: 제안 | 채택 | 대체됨(→ NNNN)
- 날짜: YYYY-MM-DD

## 맥락
## 결정
## 대안
## 결과 (좋은 점 / 감수하는 점)
```
