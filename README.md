# 음악이론 교과서 인터랙티브 웹앱 (music_rudiment_interactive)

교과서 페이지를 한 장씩 인터랙티브 HTML 웹앱으로 만드는 프로젝트입니다.

## 구성
- `dist/oseon-book.html` — 표지 + 2쪽(오선, 덧줄, 덧간)을 이전/다음 버튼으로 넘기는 모바일 교과서
- `dist/oseon-001-mobile-guitar.html` — 2쪽 단독 (기타 아이콘 팔레트 스킨, 다크/화이트 버튼)
- `dist/oseon-001-mobile.html` — 2쪽 단독 (\ubcf4\ub77c 파스텔 스킨)
- `src/` — 소스: `engine.js`(오선 자리 엔진, `node test-engine.js`로 검증), `glyphs.json`(Bravura 글리프, SIL OFL), `page.*.template.html`, 점검 스크립트
- `web3d/` — Three.js 오선 3D 학습 앱: 음표 드래그, 합성 소리, 덧줄 상태, 세 번의 자리 찾기 연습, 반응형 UI

## 빌드
```
cd src
node test-engine.js
python3 build.py page.book.template.html oseon-book   # -> oseon-book.html
python3 check_contrast.py page.book.template.html     # 색 대비 계산

cd ../web3d
npm install
npm run build   # -> dist/
```
글꼴은 Jua, Gowun Dodum(Google Fonts, OFL)을 링크로 불러옵니다. Three.js와 Bravura 출처는 `web3d/CREDITS.md`를 참고하세요.
