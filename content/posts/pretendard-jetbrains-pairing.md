---
title: "한글 주석이 있는 코드 블록의 폭 문제"
date: 2026-06-17
category: devlog
tags: ["css", "타이포그래피", "폰트"]
source: manual
project: index-blog
summary: "JetBrains Mono에 한글 글리프가 없어서 폴백이 잡는데, D2Coding이면 폭이 2:1로 맞습니다."
---
코드 블록에 한글 주석을 넣으면 줄이 미묘하게 어긋나 보입니다. 원인은 폰트 폴백입니다.

## 무슨 일이 일어나는가 {#what-happens}

`JetBrains Mono`에는 한글 글리프가 없습니다. 브라우저는 한글 문자만 폴백 폰트로 그립니다. 그 폴백이 고정폭이 아니거나, 고정폭이어도 라틴 문자 폭의 정확히 2배가 아니면 정렬이 깨집니다.

```css:tokens.css
--font-mono: "JetBrains Mono", "D2Coding", "Noto Sans Mono CJK KR",
  "Sarasa Mono K", ui-monospace, monospace;
```

`D2Coding`은 한글이 라틴 폭의 정확히 2배입니다. 설치되어 있으면 정렬이 맞고, 없으면 다음 후보로 넘어갑니다.

> [!NOTE]
> D2Coding은 웹폰트로 싣지 않았습니다. 한글 코드 폰트는 용량이 크고, 이 문제는 한글 주석이 있는 블록에서만 나타납니다. 로컬 폴백으로 두는 편이 낫다고 봤습니다.

## 남는 어긋남 {#remaining}

둘 다 없는 환경에서는 여전히 어긋납니다. 그래서 코드 블록은 줄바꿈하지 않고 가로 스크롤로 두었습니다 — 줄이 접히면 어긋남이 훨씬 눈에 띕니다.
