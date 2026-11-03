# 음악이론 교과서 인터랙티브 웹앱 (music_rudiment_interactive)

교과서 페이지를 한 장씩 인터랙티브 HTML 웹앱으로 만드는 프로젝트입니다.

## 구성
- `dist/oseon-book.html` — 표지 + 2쪽(오선, 덧줄, 덧간)을 이전/다음 버튼으로 넘기는 모바일 교과서
- `dist/oseon-001-mobile-guitar.html` — 2쪽 단독 (기타 아이콘 팔레트 스킨, 다크/화이트 버튼)
- `dist/oseon-001-mobile.html` — 2쪽 단독 (보라 파스텔 스킨)
- `src/` — 소스: `engine.js`(오선 자리 엔진, `node test-engine.js`로 검증), `glyphs.json`(Bravura 글리프, SIL OFL), `page.*.template.html`, 점검 스크립트

## 빌드
```
cd src
node test-engine.js
python3 build.py page.book.template.html oseon-book   # -> oseon-book.html
python3 check_contrast.py page.book.template.html     # 색 대비 계산
```
글꼴은 Jua, Gowun Dodum(Google Fonts, OFL)을 링크로 불러옵니다.
