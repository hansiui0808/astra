/* ASTRA — 천체 데이터 (UI와 분리)
 *
 * 좌표: 적경(RA, 시간 단위 h) / 적위(Dec, 도 단위), 분점 J2000.0 기준, 표준 성표에서 반올림한 값.
 * mag: 겉보기 등급(숫자가 작을수록 밝음). 변광성·다중성은 대표(합성) 값.
 * dist: 지구까지의 거리(광년, 반올림 근사). 카탈로그마다 오차가 크므로 '약'의 개념.
 *       확신할 수 없는 값은 null 로 두고 화면에서 '—' 로 표시한다.
 * spec: 분광형. 모르는 값은 null.
 *
 * 배경에 흩뿌려진 흐릿한 별들은 장식용 '샘플 데이터'(무작위 생성)이며 실제 별이 아니다.
 */
(function () {
  const S = (k, en, ko, bayer, ra, dec, mag, dist, spec) => ({ k, en, ko: en, bayer, ra, dec, mag, dist, spec });

  const C = [];

  /* ───────────── 오리온 ───────────── */
  C.push({
    id: 'ori', ko: 'Orion', latin: 'The Hunter', abbr: 'Ori', season: 'Winter', hemisphere: 'Equatorial (both hemispheres)',
    zodiac: false, brightest: 'rigel',
    stars: [
      S('betelgeuse', 'Betelgeuse', '베텔게우스', 'α Ori', 5.919, 7.407, 0.42, 550, 'M1–M2 Ia–Iab'),
      S('rigel', 'Rigel', '리겔', 'β Ori', 5.242, -8.202, 0.13, 860, 'B8 Ia'),
      S('bellatrix', 'Bellatrix', '벨라트릭스', 'γ Ori', 5.419, 6.350, 1.64, 250, 'B2 III'),
      S('mintaka', 'Mintaka', '민타카', 'δ Ori', 5.533, -0.299, 2.23, 1200, 'O9.5 II'),
      S('alnilam', 'Alnilam', '알닐람', 'ε Ori', 5.603, -1.202, 1.69, 2000, 'B0 Ia'),
      S('alnitak', 'Alnitak', '알니탁', 'ζ Ori', 5.679, -1.943, 1.77, 1260, 'O9.5 Ib'),
      S('saiph', 'Saiph', '사이프', 'κ Ori', 5.796, -9.670, 2.09, 650, 'B0.5 Ia'),
      S('meissa', 'Meissa', '메이사', 'λ Ori', 5.586, 9.934, 3.33, 1100, 'O8 III'),
    ],
    lines: [['meissa', 'betelgeuse', 'alnitak', 'saiph'], ['meissa', 'bellatrix', 'mintaka', 'rigel'], ['mintaka', 'alnilam', 'alnitak']],
    objects: [{ k: 'm42', en: 'M42', ko: 'Orion Nebula', type: 'Emission nebula', ra: 5.588, dec: -5.391, mag: 4.0, dist: 1300 }],
    intro: 'The king of the winter sky. Three stars in a row make a belt you can find from anywhere.',
    myth: 'Orion is a boastful hunter in Greek myth. One tale has him killed by a scorpion, which is why Scorpius rises in the east as Orion sets in the west. In Korea the three belt stars were called Samseong.',
    facts: [
      'The hazy smudge in his sword is the Orion Nebula (M42), a stellar nursery about 1,300 light-years away. You can see it with the naked eye.',
      'Betelgeuse is a swollen red supergiant that drifts between roughly magnitude 0 and 1.6.',
      'Orion straddles the celestial equator, so it is visible from both hemispheres.',
    ],
  });

  /* ───────────── 큰곰자리 ───────────── */
  C.push({
    id: 'uma', ko: 'Ursa Major', latin: 'The Great Bear', abbr: 'UMa', season: 'Spring', hemisphere: 'Northern',
    zodiac: false, brightest: 'alioth',
    stars: [
      S('dubhe', 'Dubhe', '두베', 'α UMa', 11.062, 61.751, 1.79, 123, 'K0 III'),
      S('merak', 'Merak', '메라크', 'β UMa', 11.031, 56.382, 2.37, 79, 'A1 V'),
      S('phecda', 'Phecda', '페크다', 'γ UMa', 11.897, 53.695, 2.44, 84, 'A0 Ve'),
      S('megrez', 'Megrez', '메그레즈', 'δ UMa', 12.257, 57.033, 3.31, 81, 'A3 V'),
      S('alioth', 'Alioth', '알리오트', 'ε UMa', 12.900, 55.960, 1.77, 83, 'A1 III–IVp'),
      S('mizar', 'Mizar', '미자르', 'ζ UMa', 13.399, 54.925, 2.04, 83, 'A2 V'),
      S('alkaid', 'Alkaid', '알카이드', 'η UMa', 13.792, 49.313, 1.86, 104, 'B3 V'),
    ],
    lines: [['dubhe', 'merak', 'phecda', 'megrez', 'dubhe'], ['megrez', 'alioth', 'mizar', 'alkaid']],
    objects: [],
    intro: 'Home of the Big Dipper, a ladle of seven stars that has guided travelers for ages.',
    myth: 'Zeus loved the nymph Callisto, and a jealous Hera turned her into a bear. Zeus later lifted her into the sky. In East Asia the Dipper was honored as keeper of lifespan and fortune.',
    facts: [
      'Follow the line from Merak through Dubhe, about five times over, and you land on Polaris.',
      'Beside Mizar sits the faint Alcor, an old eyesight test for sharp-eyed observers.',
      'Five of the seven Dipper stars drift together as a moving group. Dubhe and Alkaid do not.',
    ],
  });

  /* ───────────── 작은곰자리 ───────────── */
  C.push({
    id: 'umi', ko: 'Ursa Minor', latin: 'The Little Bear', abbr: 'UMi', season: 'All year (north)', hemisphere: 'Northern',
    zodiac: false, brightest: 'polaris',
    stars: [
      S('polaris', 'Polaris', '북극성', 'α UMi', 2.530, 89.264, 1.98, 430, 'F7 Ib'),
      S('yildun', 'Yildun', '일둔', 'δ UMi', 17.537, 86.586, 4.35, 183, 'A1 V'),
      S('eps', 'ε UMi', '엡실론 작은곰', 'ε UMi', 16.766, 82.037, 4.21, 347, 'G5 III'),
      S('zeta', 'ζ UMi', '제타 작은곰', 'ζ UMi', 15.734, 77.795, 4.29, 380, 'A3 V'),
      S('eta', 'η UMi', '에타 작은곰', 'η UMi', 16.292, 75.755, 4.95, 97, 'F5 V'),
      S('pherkad', 'Pherkad', '페르카드', 'γ UMi', 15.345, 71.834, 3.05, 480, 'A3 II–III'),
      S('kochab', 'Kochab', '코카브', 'β UMi', 14.845, 74.156, 2.08, 131, 'K4 III'),
    ],
    lines: [['polaris', 'yildun', 'eps', 'zeta', 'eta', 'pherkad', 'kochab', 'zeta']],
    objects: [],
    intro: 'A small dipper that points to the celestial pole. Every star turns around it.',
    myth: 'In one telling, Callisto\'s son Arcas was about to hunt his unknowing mother when Zeus lifted both into the sky. For centuries sailors found north by the star at the end of this handle.',
    facts: [
      'Polaris sits within one degree of the north celestial pole, so it hardly moves all night. It is not the brightest star, only about magnitude 2.',
      'Polaris is a Cepheid variable, pulsing in brightness on a regular beat.',
      'Earth\'s axis wobbles slowly, so Polaris is not forever. In about 12,000 years Vega will be near the pole.',
    ],
  });

  /* ───────────── 카시오페이아 ───────────── */
  C.push({
    id: 'cas', ko: 'Cassiopeia', latin: 'The Queen', abbr: 'Cas', season: 'Autumn', hemisphere: 'Northern',
    zodiac: false, brightest: 'schedar',
    stars: [
      S('caph', 'Caph', '카프', 'β Cas', 0.153, 59.150, 2.27, 55, 'F2 III–IV'),
      S('schedar', 'Schedar', '쉐다르', 'α Cas', 0.675, 56.537, 2.24, 228, 'K0 IIIa'),
      S('gamma', 'γ Cas', '감마 카시오페이아', 'γ Cas', 0.945, 60.717, 2.47, 550, 'B0.5 IVpe'),
      S('ruchbah', 'Ruchbah', '루치바', 'δ Cas', 1.430, 60.235, 2.68, 99, 'A5 III–IV'),
      S('segin', 'Segin', '세긴', 'ε Cas', 1.907, 63.670, 3.37, 410, 'B3 III'),
    ],
    lines: [['caph', 'schedar', 'gamma', 'ruchbah', 'segin']],
    objects: [],
    intro: 'A great W written across the northern sky, circling the pole all year long.',
    myth: 'Queen Cassiopeia of Ethiopia boasted that her daughter Andromeda outshone the sea nymphs. Poseidon punished her by binding her to a chair that circles the pole, sometimes upside down.',
    facts: [
      'Cassiopeia and the Big Dipper sit on opposite sides of Polaris, so one is always there to help you find it.',
      'In 1572 a supernova appeared here, bright enough to see by day. Tycho Brahe recorded it.',
      'Gamma Cassiopeiae is a fast-spinning B star with irregular outbursts.',
    ],
  });

  /* ───────────── 전갈자리 ───────────── */
  C.push({
    id: 'sco', ko: 'Scorpius', latin: 'The Scorpion', abbr: 'Sco', season: 'Summer', hemisphere: 'Southern',
    zodiac: true, brightest: 'antares',
    stars: [
      S('antares', 'Antares', '안타레스', 'α Sco', 16.490, -26.432, 0.96, 550, 'M1.5 Iab–Ib'),
      S('acrab', 'Acrab', '아크랍', 'β Sco', 16.091, -19.805, 2.62, null, 'B1 V'),
      S('dschubba', 'Dschubba', '주바', 'δ Sco', 16.006, -22.622, 2.29, null, 'B0.3 IV'),
      S('pi', 'π Sco', '파이 전갈', 'π Sco', 15.981, -26.114, 2.89, null, null),
      S('sigma', 'σ Sco', '시그마 전갈', 'σ Sco', 16.353, -25.593, 2.89, 700, 'B1 III'),
      S('tau', 'τ Sco', '타우 전갈', 'τ Sco', 16.598, -28.216, 2.82, 470, 'B0.2 V'),
      S('larawag', 'Larawag', '라라웍', 'ε Sco', 16.836, -34.293, 2.29, 65, 'K2 III'),
      S('mu1', 'μ¹ Sco', '뮤1 전갈', 'μ¹ Sco', 16.864, -38.047, 3.08, null, null),
      S('zeta2', 'ζ² Sco', '제타2 전갈', 'ζ² Sco', 16.915, -42.362, 3.62, null, 'K4 III'),
      S('eta', 'η Sco', '에타 전갈', 'η Sco', 17.203, -43.239, 3.33, 73, 'F5 IV'),
      S('sargas', 'Sargas', '사르가스', 'θ Sco', 17.622, -42.998, 1.87, 270, 'F1 II'),
      S('iota1', 'ι¹ Sco', '이오타1 전갈', 'ι¹ Sco', 17.793, -40.127, 3.03, null, 'F2 Ia'),
      S('girtab', 'Girtab', '기르탑', 'κ Sco', 17.708, -39.030, 2.41, null, 'B1.5 III'),
      S('shaula', 'Shaula', '샤울라', 'λ Sco', 17.560, -37.104, 1.62, 570, 'B2 IV'),
      S('lesath', 'Lesath', '레사스', 'υ Sco', 17.513, -37.296, 2.69, 580, 'B2 IV'),
    ],
    lines: [['acrab', 'dschubba', 'pi'], ['dschubba', 'sigma', 'antares', 'tau'], ['antares', 'larawag', 'mu1', 'zeta2', 'eta', 'sargas', 'iota1', 'girtab', 'shaula', 'lesath']],
    objects: [],
    intro: 'A curling tail and a red heart, Antares, low over the southern horizon.',
    myth: 'Sent to punish Orion\'s pride, the scorpion and the hunter never share the sky. As one sets, the other rises. East Asia knew Antares as the Great Fire.',
    facts: [
      'Antares is often read as the rival of Mars, for its matching red.',
      'Antares is a red supergiant hundreds of times wider than the Sun.',
      'The Sun crosses a corner of Scorpius for barely a week in late November.',
    ],
  });

  /* ───────────── 사자자리 ───────────── */
  C.push({
    id: 'leo', ko: 'Leo', latin: 'The Lion', abbr: 'Leo', season: 'Spring', hemisphere: 'Northern',
    zodiac: true, brightest: 'regulus',
    stars: [
      S('regulus', 'Regulus', '레굴루스', 'α Leo', 10.139, 11.967, 1.35, 79, 'B8 IVn'),
      S('denebola', 'Denebola', '데네볼라', 'β Leo', 11.818, 14.572, 2.14, 36, 'A3 V'),
      S('algieba', 'Algieba', '알기에바', 'γ¹ Leo', 10.333, 19.842, 2.01, 130, 'K1 III–IV'),
      S('zosma', 'Zosma', '조스마', 'δ Leo', 11.235, 20.524, 2.56, 58, 'A4 V'),
      S('chertan', 'Chertan', '체르탄', 'θ Leo', 11.237, 15.430, 3.33, 165, 'A2 V'),
      S('adhafera', 'Adhafera', '아드하페라', 'ζ Leo', 10.278, 23.417, 3.44, 274, 'F0 III'),
      S('rasalas', 'Rasalas', '라살라스', 'μ Leo', 9.879, 26.007, 3.88, 133, 'K2 III'),
      S('algenubi', 'Algenubi', '알게누비', 'ε Leo', 9.764, 23.774, 2.98, 247, 'G1 II'),
      S('eta', 'η Leo', '에타 사자', 'η Leo', 10.122, 16.762, 3.52, null, 'A0 Ib'),
    ],
    lines: [['regulus', 'eta', 'algieba', 'adhafera', 'rasalas', 'algenubi'], ['algieba', 'zosma', 'denebola', 'chertan', 'zosma'], ['regulus', 'chertan']],
    objects: [],
    intro: 'A backward question mark of stars forms the lion\'s head and mane.',
    myth: 'Slaying the Nemean Lion was the first labor of Heracles. No arrow or spear could pierce it, so he strangled it, and Zeus placed it among the stars.',
    facts: [
      'Regulus means little king. It sits so close to the ecliptic that the Moon and planets sometimes pass in front of it.',
      'The Leonid meteors peak in mid-November, shed by comet Tempel-Tuttle every 33 years.',
      'Denebola is a close neighbor at about 36 light-years.',
    ],
  });

  /* ───────────── 백조자리 ───────────── */
  C.push({
    id: 'cyg', ko: 'Cygnus', latin: 'The Swan', abbr: 'Cyg', season: 'Summer–Autumn', hemisphere: 'Northern',
    zodiac: false, brightest: 'deneb',
    stars: [
      S('deneb', 'Deneb', '데네브', 'α Cyg', 20.691, 45.280, 1.25, 2600, 'A2 Ia'),
      S('sadr', 'Sadr', '사드르', 'γ Cyg', 20.370, 40.257, 2.23, 1800, 'F8 Ib'),
      S('albireo', 'Albireo', '알비레오', 'β Cyg', 19.512, 27.960, 3.05, 430, 'K3 II + B8 V'),
      S('gienah', 'Gienah', '기에나', 'ε Cyg', 20.770, 33.970, 2.48, 72, 'K0 III'),
      S('fawaris', 'Fawaris', '파와리스', 'δ Cyg', 19.750, 45.131, 2.87, 165, 'B9.5 III'),
    ],
    lines: [['deneb', 'sadr', 'albireo'], ['fawaris', 'sadr', 'gienah']],
    objects: [],
    intro: 'A cross flying down the Milky Way, and one corner of the Summer Triangle.',
    myth: 'When Phaethon crashed the sun chariot, his friend Cycnus dove into the river to find him. Zeus turned the grieving Cycnus into a swan. In Korea and China the magpie bridge of the Milky Way lies nearby.',
    facts: [
      'Deneb is about 2,600 light-years away yet still shines as a first-magnitude star, a supergiant far brighter than the Sun.',
      'Albireo splits into a gold star and a blue star in a small telescope.',
      'Cygnus X-1 was among the first black hole candidates. The Kepler telescope also hunted planets in this field.',
    ],
  });

  /* ───────────── 거문고자리 ───────────── */
  C.push({
    id: 'lyr', ko: 'Lyra', latin: 'The Lyre', abbr: 'Lyr', season: 'Summer', hemisphere: 'Northern',
    zodiac: false, brightest: 'vega',
    stars: [
      S('vega', 'Vega', '베가 (직녀성)', 'α Lyr', 18.616, 38.784, 0.03, 25, 'A0 Va'),
      S('zeta1', 'ζ¹ Lyr', '제타1 거문고', 'ζ¹ Lyr', 18.746, 37.605, 4.36, null, null),
      S('delta2', 'δ² Lyr', '델타2 거문고', 'δ² Lyr', 18.909, 36.899, 4.30, null, 'M4 II'),
      S('sulafat', 'Sulafat', '술라파트', 'γ Lyr', 18.982, 32.690, 3.25, 620, 'B9 III'),
      S('sheliak', 'Sheliak', '셸리악', 'β Lyr', 18.835, 33.363, 3.52, 960, 'B7 Ve'),
    ],
    lines: [['vega', 'zeta1', 'delta2', 'sulafat', 'sheliak', 'zeta1']],
    objects: [{ k: 'm57', en: 'M57', ko: 'Ring Nebula', type: 'Planetary nebula', ra: 18.893, dec: 33.029, mag: 8.8, dist: 2300 }],
    intro: 'A small parallelogram and blue-white Vega, one of the clearest lights of summer.',
    myth: 'Orpheus charmed beasts, trees and even the god of the underworld with his lyre. After his death, Zeus placed the instrument in the sky. East Asia saw Vega as the Weaver Girl, partner of the Herdsman.',
    facts: [
      'Vega lies about 25 light-years away and long defined magnitude zero.',
      'It spins so fast that its equator bulges outward.',
      'The Ring Nebula (M57) sits between Beta and Gamma, a smoke ring in a small telescope.',
    ],
  });

  /* ───────────── 안드로메다 ───────────── */
  C.push({
    id: 'and', ko: 'Andromeda', latin: 'The Chained Princess', abbr: 'And', season: 'Autumn', hemisphere: 'Northern',
    zodiac: false, brightest: 'mirach',
    stars: [
      S('alpheratz', 'Alpheratz', '알페라츠', 'α And', 0.140, 29.091, 2.06, 97, 'B8 IVp'),
      S('delta', 'δ And', '델타 안드로메다', 'δ And', 0.655, 30.861, 3.27, 105, 'K3 III'),
      S('mirach', 'Mirach', '미라크', 'β And', 1.162, 35.621, 2.05, 197, 'M0 III'),
      S('almach', 'Almach', '알마크', 'γ¹ And', 2.065, 42.330, 2.26, 355, 'K3 IIb'),
      S('mu', 'μ And', '뮤 안드로메다', 'μ And', 0.946, 38.499, 3.87, 130, 'A5 V'),
      S('nu', 'ν And', '뉴 안드로메다', 'ν And', 0.830, 41.079, 4.53, 680, 'B5 III'),
    ],
    lines: [['alpheratz', 'delta', 'mirach', 'almach'], ['mirach', 'mu', 'nu']],
    objects: [{ k: 'm31', en: 'M31', ko: 'Andromeda Galaxy', type: 'Spiral galaxy', ra: 0.712, dec: 41.269, mag: 3.44, dist: 2500000 }],
    intro: 'A long chain of autumn stars that ends at a neighboring galaxy.',
    myth: 'Because of her mother\'s pride, Andromeda was chained to a rock as an offering to a sea monster. The hero Perseus rescued her and made her his wife. Most of the cast of this story now lives in the autumn sky.',
    facts: [
      'The Andromeda Galaxy (M31) is about 2.5 million light-years away, among the farthest things visible to the naked eye.',
      'It is falling toward the Milky Way and will merge with it in billions of years.',
      'Alpheratz belongs to Andromeda but also marks a corner of the Great Square of Pegasus.',
    ],
  });

  /* ───────────── 쌍둥이자리 ───────────── */
  C.push({
    id: 'gem', ko: 'Gemini', latin: 'The Twins', abbr: 'Gem', season: 'Winter', hemisphere: 'Northern',
    zodiac: true, brightest: 'pollux',
    stars: [
      S('castor', 'Castor', '카스토르', 'α Gem', 7.577, 31.889, 1.58, 51, 'A1 V'),
      S('pollux', 'Pollux', '폴룩스', 'β Gem', 7.755, 28.026, 1.14, 34, 'K0 III'),
      S('alhena', 'Alhena', '알헤나', 'γ Gem', 6.629, 16.399, 1.93, 109, 'A1.5 IV'),
      S('tejat', 'Tejat', '테자트', 'μ Gem', 6.383, 22.514, 2.88, 230, 'M3 III'),
      S('mebsuta', 'Mebsuta', '메브수타', 'ε Gem', 6.732, 25.131, 2.98, 840, 'G8 Ib'),
      S('wasat', 'Wasat', '와사트', 'δ Gem', 7.335, 21.982, 3.53, 60, 'F0 IV'),
      S('propus', 'Propus', '프로푸스', 'η Gem', 6.248, 22.507, 3.28, 350, 'M3 III'),
      S('mekbuda', 'Mekbuda', '메크부다', 'ζ Gem', 7.069, 20.570, 3.79, null, null),
      S('alzirr', 'Alzirr', '알지르', 'ξ Gem', 6.753, 12.896, 3.35, 57, 'F5 IV'),
    ],
    lines: [['castor', 'mebsuta', 'tejat', 'propus'], ['pollux', 'wasat', 'mekbuda', 'alhena'], ['wasat', 'alzirr'], ['castor', 'pollux']],
    objects: [],
    intro: 'Two bright stars side by side, the heavenly twins of the winter sky.',
    myth: 'Castor and Pollux were brothers, but only Pollux was immortal. When Castor died, Pollux asked Zeus to share his immortality, and the two became stars together.',
    facts: [
      'Castor looks double in a telescope but is really a system of six stars.',
      'The Geminid meteors peak in mid-December, usually the richest shower of the year.',
      'Pollux is an orange giant about 34 light-years away.',
    ],
  });

  /* ───────────── 황소자리 ───────────── */
  C.push({
    id: 'tau', ko: 'Taurus', latin: 'The Bull', abbr: 'Tau', season: 'Winter', hemisphere: 'Equatorial (north)',
    zodiac: true, brightest: 'aldebaran',
    stars: [
      S('aldebaran', 'Aldebaran', '알데바란', 'α Tau', 4.599, 16.509, 0.85, 65, 'K5 III'),
      S('elnath', 'Elnath', '엘나트', 'β Tau', 5.438, 28.608, 1.65, 131, 'B7 III'),
      S('tianguan', 'Tianguan', '티안관', 'ζ Tau', 5.627, 21.143, 2.97, null, 'B2 III'),
      S('ain', 'Ain', '아인', 'ε Tau', 4.477, 19.180, 3.53, 147, 'G9.5 III'),
      S('delta1', 'δ¹ Tau', '델타1 황소', 'δ¹ Tau', 4.382, 17.543, 3.76, 151, 'G8 III'),
      S('gamma', 'Hyadum I', '히아둠 I', 'γ Tau', 4.330, 15.628, 3.65, 153, 'G8 III'),
      S('theta2', 'θ² Tau', '세타2 황소', 'θ² Tau', 4.478, 15.871, 3.40, 150, 'A7 III'),
      S('lambda', 'λ Tau', '람다 황소', 'λ Tau', 4.011, 12.490, 3.47, 370, 'B3 V'),
      S('alcyone', 'Alcyone', '알키오네', 'η Tau', 3.791, 24.105, 2.87, 440, 'B7 IIIe'),
    ],
    lines: [['elnath', 'ain', 'delta1', 'gamma', 'theta2', 'aldebaran', 'tianguan'], ['gamma', 'lambda']],
    objects: [
      { k: 'm45', en: 'M45', ko: '플레이아데스 성단', type: 'Open cluster', ra: 3.790, dec: 24.117, mag: 1.6, dist: 440 },
      { k: 'm1', en: 'M1', ko: '게 성운', type: 'Supernova remnant', ra: 5.575, dec: 22.015, mag: 8.4, dist: 6500 },
    ],
    intro: 'The red eye of Aldebaran and the whispering Pleiades make this a winter landmark.',
    myth: 'Zeus took the form of a white bull to carry the Phoenician princess Europa across the sea to Crete. The constellation is that bull.',
    facts: [
      'The Pleiades (M45) are a young cluster about 440 light-years away. Six or seven stars show to the naked eye.',
      'Aldebaran lies in line with the Hyades but is only 65 light-years away, so it is not a member.',
      'The Crab Nebula (M1) is the remnant of the supernova seen in 1054.',
    ],
  });

  /* ───────────── 궁수자리 ───────────── */
  C.push({
    id: 'sgr', ko: 'Sagittarius', latin: 'The Archer', abbr: 'Sgr', season: 'Summer', hemisphere: 'Southern',
    zodiac: true, brightest: 'kausaus',
    stars: [
      S('kausaus', 'Kaus Australis', '카우스 아우스트랄리스', 'ε Sgr', 18.403, -34.385, 1.85, 143, 'B9.5 III'),
      S('nunki', 'Nunki', '눈키', 'σ Sgr', 18.921, -26.297, 2.02, 228, 'B2.5 V'),
      S('ascella', 'Ascella', '아셀라', 'ζ Sgr', 19.044, -29.880, 2.60, 89, 'A2 III'),
      S('kausmed', 'Kaus Media', '카우스 메디아', 'δ Sgr', 18.350, -29.828, 2.70, 306, 'K3 II'),
      S('kausbor', 'Kaus Borealis', '카우스 보레알리스', 'λ Sgr', 18.466, -25.422, 2.81, 77, 'K1 IIIb'),
      S('alnasl', 'Alnasl', '알나슬', 'γ² Sgr', 18.097, -30.424, 2.99, 97, 'K0 III'),
      S('phi', 'φ Sgr', '파이 궁수', 'φ Sgr', 18.761, -26.991, 3.17, 230, 'B8.5 III'),
      S('tau', 'τ Sgr', '타우 궁수', 'τ Sgr', 19.116, -27.670, 3.32, 120, 'K1 IIIb'),
    ],
    lines: [['alnasl', 'kausmed', 'kausbor', 'phi', 'nunki', 'tau', 'ascella', 'kausaus', 'alnasl'], ['kausmed', 'kausaus'], ['phi', 'ascella']],
    objects: [{ k: 'm8', en: 'M8', ko: 'Lagoon Nebula', type: 'Emission nebula', ra: 18.063, dec: -24.38, mag: 6.0, dist: 4100 }],
    intro: 'Eight stars shaped like a teapot, with the Milky Way at its thickest behind them.',
    myth: 'The archer is either wise Chiron the centaur or the satyr Crotus, depending on the tale. East Asia called some of these stars the Southern Dipper.',
    facts: [
      'The center of our galaxy lies this way, home to Sagittarius A*, a black hole of about four million Suns.',
      'This stretch of Milky Way is so dense that several nebulae show to the naked eye.',
      'The Lagoon Nebula (M8) glows as a faint smudge without a telescope.',
    ],
  });

  /* ───────────── 양자리 ───────────── */
  C.push({
    id: 'ari', ko: 'Aries', latin: 'The Ram', abbr: 'Ari', season: 'Autumn', hemisphere: 'Northern',
    zodiac: true, brightest: 'hamal',
    stars: [
      S('hamal', 'Hamal', '하말', 'α Ari', 2.120, 23.462, 2.00, 66, 'K2 III'),
      S('sheratan', 'Sheratan', '셰라탄', 'β Ari', 1.911, 20.808, 2.64, 60, 'A5 V'),
      S('mesarthim', 'Mesarthim', '메사르팀', 'γ Ari', 1.892, 19.294, 3.86, 160, 'B9 V'),
      S('bharani', 'Bharani', '바라니', '41 Ari', 2.833, 27.261, 3.63, null, 'B8 Vn'),
    ],
    lines: [['bharani', 'hamal', 'sheratan', 'mesarthim']],
    objects: [],
    intro: 'Small but ancient. It once marked the start of spring.',
    myth: 'A winged ram with golden fleece rescued Phrixus and Helle from their stepmother and carried them to Colchis. The fleece later became the prize of Jason and the Argonauts.',
    facts: [
      'About 2,000 years ago the March equinox lay in Aries. Precession has since moved it to Pisces, yet it is still called the First Point of Aries.',
      'Hamal means head of the ram, an orange giant about 66 light-years away.',
      'Only a few bright stars make it hard to spot under city lights.',
    ],
  });

  /* ───────────── 게자리 ───────────── */
  C.push({
    id: 'cnc', ko: 'Cancer', latin: 'The Crab', abbr: 'Cnc', season: 'Spring', hemisphere: 'Northern',
    zodiac: true, brightest: 'tarf',
    stars: [
      S('tarf', 'Tarf', '타르프', 'β Cnc', 8.275, 9.186, 3.52, 290, 'K4 III'),
      S('acubens', 'Acubens', '아쿠벤스', 'α Cnc', 8.975, 11.858, 4.25, 174, 'A5 m'),
      S('asaus', 'Asellus Australis', '아셀루스 아우스트랄리스', 'δ Cnc', 8.745, 18.154, 3.94, 136, 'K0 III'),
      S('asbor', 'Asellus Borealis', '아셀루스 보레알리스', 'γ Cnc', 8.721, 21.469, 4.66, 181, 'A1 IV'),
      S('iota', 'ι Cnc', '이오타 게', 'ι Cnc', 8.778, 28.760, 4.02, 300, 'G8 II'),
    ],
    lines: [['tarf', 'asaus', 'acubens'], ['asaus', 'asbor', 'iota']],
    objects: [{ k: 'm44', en: 'M44', ko: 'Beehive Cluster', type: 'Open cluster', ra: 8.667, dec: 19.67, mag: 3.7, dist: 600 }],
    intro: 'The faintest zodiac sign, with a naked-eye cluster at its center.',
    myth: 'While Heracles fought the Hydra, Hera sent a giant crab to bite his heel. He crushed it, and Hera set it in the sky as a reward.',
    facts: [
      'Praesepe (M44) is an open cluster about 600 light-years away, a hazy patch under dark skies.',
      'Galileo used his telescope to show it is a crowd of stars.',
      'Even its brightest star, Tarf, is only about magnitude 3.5.',
    ],
  });

  /* ───────────── 처녀자리 ───────────── */
  C.push({
    id: 'vir', ko: 'Virgo', latin: 'The Maiden', abbr: 'Vir', season: 'Spring', hemisphere: 'Equatorial (both hemispheres)',
    zodiac: true, brightest: 'spica',
    stars: [
      S('spica', 'Spica', '스피카', 'α Vir', 13.420, -11.161, 0.97, 250, 'B1 III–IV'),
      S('porrima', 'Porrima', '포리마', 'γ Vir', 12.694, -1.449, 2.74, 38, 'F0 V'),
      S('vindem', 'Vindemiatrix', '빈데미아트릭스', 'ε Vir', 13.036, 10.959, 2.83, 110, 'G8 III'),
      S('zavijava', 'Zavijava', '자비자바', 'β Vir', 11.845, 1.765, 3.61, 36, 'F9 V'),
      S('heze', 'Heze', '헤제', 'ζ Vir', 13.578, -0.596, 3.37, 74, 'A3 V'),
      S('minelauva', 'Minelauva', '미넬라우바', 'δ Vir', 12.927, 3.397, 3.38, 202, 'M3 III'),
    ],
    lines: [['zavijava', 'porrima', 'heze', 'spica'], ['porrima', 'minelauva', 'vindem']],
    objects: [],
    intro: 'The largest zodiac constellation, with blue Spica holding a spike of grain.',
    myth: 'She is either Demeter, keeper of harvests, or Astraea, the star maiden who stayed on Earth longest to keep justice. Astraea means star maiden, and shares its root with the name ASTRA.',
    facts: [
      'Spica is a close pair of stars that orbit each other in about four days.',
      'Porrima is a pair of stars that circle each other every 169 years.',
      'Toward Virgo lies a cluster of thousands of galaxies about 50 million light-years away.',
    ],
  });

  /* ───────────── 천칭자리 ───────────── */
  C.push({
    id: 'lib', ko: 'Libra', latin: 'The Scales', abbr: 'Lib', season: 'Summer (early)', hemisphere: 'Southern',
    zodiac: true, brightest: 'zubenesch',
    stars: [
      S('zubenesch', 'Zubeneschamali', '주베네스카말리', 'β Lib', 15.283, -9.383, 2.61, 185, 'B8 V'),
      S('zubengen', 'Zubenelgenubi', '주베넬게누비', 'α² Lib', 14.848, -16.042, 2.75, 77, 'A3 IV'),
      S('zubenhak', 'Zubenelhakrabi', '주베넬하크라비', 'γ Lib', 15.592, -14.790, 3.91, null, 'K0 III'),
      S('sigma', 'Brachium', '브라키움', 'σ Lib', 15.068, -25.282, 3.29, 290, 'M3 III'),
    ],
    lines: [['zubengen', 'zubenesch', 'zubenhak', 'zubengen', 'sigma']],
    objects: [],
    intro: 'The only zodiac sign that is an object, not a creature: a pair of scales.',
    myth: 'The scales of Astraea, goddess of justice, were lifted into the sky. They once belonged to Scorpius as its claws, and became their own constellation in Roman times.',
    facts: [
      'Zubeneschamali and Zubenelgenubi come from Arabic, meaning northern and southern claw, a trace of the old scorpion.',
      'Gliese 581, a red dwarf about 20 light-years away, hosts several known planets.',
      'It sits just west of Scorpius in the summer south, so it is easy to find.',
    ],
  });

  /* ───────────── 염소자리 ───────────── */
  C.push({
    id: 'cap', ko: 'Capricornus', latin: 'The Sea-Goat', abbr: 'Cap', season: 'Autumn (early)', hemisphere: 'Southern',
    zodiac: true, brightest: 'denebalgedi',
    stars: [
      S('algedi', 'Algedi', '알게디', 'α² Cap', 20.300, -12.545, 3.57, 109, 'G9 III'),
      S('dabih', 'Dabih', '다비', 'β¹ Cap', 20.350, -14.781, 3.08, 330, 'K0 II'),
      S('psi', 'ψ Cap', '프시 염소', 'ψ Cap', 20.768, -25.271, 4.14, 49, 'F5 V'),
      S('omega', 'ω Cap', '오메가 염소', 'ω Cap', 20.864, -26.919, 4.11, null, null),
      S('zeta', 'ζ Cap', '제타 염소', 'ζ Cap', 21.444, -22.411, 3.74, null, null),
      S('theta', 'θ Cap', '세타 염소', 'θ Cap', 21.099, -17.232, 4.07, null, 'A1 V'),
      S('iota', 'ι Cap', '이오타 염소', 'ι Cap', 21.368, -16.834, 4.28, null, null),
      S('nashira', 'Nashira', '나시라', 'γ Cap', 21.668, -16.662, 3.68, 139, 'A7 III'),
      S('denebalgedi', 'Deneb Algedi', '데네브 알게디', 'δ Cap', 21.784, -16.127, 2.87, 39, 'A7 m'),
    ],
    lines: [['algedi', 'dabih', 'psi', 'omega', 'zeta', 'denebalgedi', 'nashira', 'iota', 'theta', 'dabih']],
    objects: [],
    intro: 'A triangle of the sea-goat, sailing slowly through the dim southern autumn sky.',
    myth: 'Fleeing the monster Typhon, the god Pan leapt into a river and changed only halfway: goat above, fish below. Zeus placed the odd shape among the stars.',
    facts: [
      'The Tropic of Capricorn is named for this constellation, because the December solstice once lay here. Precession has moved it to Sagittarius.',
      'Deneb Algedi means tail of the goat.',
      'Alpha Capricorni is a naked-eye double star.',
    ],
  });

  /* ───────────── 물병자리 ───────────── */
  C.push({
    id: 'aqr', ko: 'Aquarius', latin: 'The Water Bearer', abbr: 'Aqr', season: 'Autumn', hemisphere: 'Equatorial (south)',
    zodiac: true, brightest: 'sadalsuud',
    stars: [
      S('albali', 'Albali', '알발리', 'ε Aqr', 20.794, -9.496, 3.77, 200, 'A1 V'),
      S('sadalsuud', 'Sadalsuud', '사달수드', 'β Aqr', 21.526, -5.571, 2.91, 540, 'G0 Ib'),
      S('sadalmelik', 'Sadalmelik', '사달멜릭', 'α Aqr', 22.096, -0.320, 2.96, 520, 'G2 Ib'),
      S('sadachbia', 'Sadachbia', '사다크비아', 'γ Aqr', 22.361, -1.387, 3.84, 160, 'A0 V'),
      S('zeta', 'ζ Aqr', '제타 물병', 'ζ Aqr', 22.481, -0.020, 3.65, null, null),
      S('eta', 'η Aqr', '에타 물병', 'η Aqr', 22.589, -0.117, 4.02, null, null),
      S('ancha', 'Ancha', '안카', 'θ Aqr', 22.281, -7.783, 4.16, 175, 'G8 III'),
      S('skat', 'Skat', '스카트', 'δ Aqr', 22.911, -15.821, 3.27, 160, 'A3 V'),
    ],
    lines: [['albali', 'sadalsuud', 'sadalmelik', 'sadachbia', 'zeta', 'eta'], ['sadachbia', 'ancha', 'skat']],
    objects: [],
    intro: 'A jar pouring water across the wide dark sea of the autumn south.',
    myth: 'Zeus took the form of an eagle and carried the beautiful Trojan youth Ganymede to Olympus as cupbearer to the gods. He is the one tipping the jar.',
    facts: [
      'The Eta Aquariids peak in early May, dust left by Halley\'s Comet.',
      'TRAPPIST-1, a small star about 40 light-years away, hosts seven Earth-sized planets.',
      'The Helix Nebula (NGC 7293) is one of the nearest planetary nebulae, about 650 light-years away.',
    ],
  });

  /* ───────────── 물고기자리 ───────────── */
  C.push({
    id: 'psc', ko: 'Pisces', latin: 'The Fishes', abbr: 'Psc', season: 'Autumn', hemisphere: 'Equatorial (north)',
    zodiac: true, brightest: 'alpherg',
    stars: [
      S('beta', 'Fumalsamakah', '푸말사마카', 'β Psc', 23.066, 3.820, 4.48, 410, 'B6 Ve'),
      S('gamma', 'γ Psc', '감마 물고기', 'γ Psc', 23.286, 3.282, 3.69, 130, 'G9 III'),
      S('iota', 'ι Psc', '이오타 물고기', 'ι Psc', 23.666, 5.627, 4.13, null, 'F7 V'),
      S('omega', 'ω Psc', '오메가 물고기', 'ω Psc', 23.988, 6.863, 4.01, null, 'F4 IV'),
      S('delta', 'δ Psc', '델타 물고기', 'δ Psc', 0.800, 7.585, 4.43, null, null),
      S('epsilon', 'ε Psc', '엡실론 물고기', 'ε Psc', 1.049, 7.890, 4.28, null, 'K0 III'),
      S('alrescha', 'Alrescha', '알레샤', 'α Psc', 2.034, 2.764, 3.82, 150, 'A0 Vp'),
      S('torcular', 'Torcular', '토르쿨라르', 'ο Psc', 1.757, 9.158, 4.26, 270, 'K0 III'),
      S('alpherg', 'Alpherg', '알페르그', 'η Psc', 1.524, 15.346, 3.62, 350, 'G7 IIIa'),
    ],
    lines: [['beta', 'gamma', 'iota', 'omega', 'delta', 'epsilon', 'alrescha', 'torcular', 'alpherg']],
    objects: [],
    intro: 'Two fishes tied by a cord, a long faint V of stars.',
    myth: 'When Typhon attacked the gods, Aphrodite and her son Eros turned into fish and leapt into a river. They tied their tails together so they would never be parted.',
    facts: [
      'The March equinox now lies in Pisces, moved here from Aries, and will drift into Aquarius in some centuries.',
      'Alrescha means the cord, sitting at the knot that ties the two fish.',
      'Pisces is broad but holds no bright star, so it is hard to find.',
    ],
  });

  /* 태양이 각 별자리를 지나는 날짜 (IAU 경계 기준, 근사) — 천문학적 사실 */
  const SUN_IAU = {
    ari: [[4, 19], [5, 13]], tau: [[5, 14], [6, 19]], gem: [[6, 20], [7, 20]], cnc: [[7, 21], [8, 9]],
    leo: [[8, 10], [9, 15]], vir: [[9, 16], [10, 30]], lib: [[10, 31], [11, 22]], sco: [[11, 23], [11, 29]],
    oph: [[11, 30], [12, 17]], sgr: [[12, 18], [1, 18]], cap: [[1, 19], [2, 15]], aqr: [[2, 16], [3, 11]], psc: [[3, 12], [4, 18]],
  };
  /* 점성술의 열두 별자리(황도 12궁) 구분 — 전통(문화적 약속)이며 천문 관측과 무관 */
  const SUN_TROPICAL = {
    ari: ['Mar 21', 'Apr 19', '♈', 'Aries'], tau: ['Apr 20', 'May 20', '♉', 'Taurus'],
    gem: ['May 21', 'Jun 20', '♊', 'Gemini'], cnc: ['Jun 21', 'Jul 22', '♋', 'Cancer'],
    leo: ['Jul 23', 'Aug 22', '♌', 'Leo'], vir: ['Aug 23', 'Sep 22', '♍', 'Virgo'],
    lib: ['Sep 23', 'Oct 22', '♎', 'Libra'], sco: ['Oct 23', 'Nov 21', '♏', 'Scorpio'],
    sgr: ['Nov 22', 'Dec 21', '♐', 'Sagittarius'], cap: ['Dec 22', 'Jan 19', '♑', 'Capricorn'],
    aqr: ['Jan 20', 'Feb 18', '♒', 'Aquarius'], psc: ['Feb 19', 'Mar 20', '♓', 'Pisces'],
  };
  const ZODIAC_ORDER = ['ari', 'tau', 'gem', 'cnc', 'leo', 'vir', 'lib', 'sco', 'sgr', 'cap', 'aqr', 'psc'];

  /* 분광형 — 표면 온도(K)와 대표 색 */
  const SPECTRAL = [
    { c: 'O', t: '30,000 K +', col: '#9db4ff' }, { c: 'B', t: '10,000–30,000 K', col: '#aabfff' },
    { c: 'A', t: '7,500–10,000 K', col: '#cad8ff' }, { c: 'F', t: '6,000–7,500 K', col: '#f8f7ff' },
    { c: 'G', t: '5,200–6,000 K', col: '#fff4ea' }, { c: 'K', t: '3,700–5,200 K', col: '#ffd2a1' },
    { c: 'M', t: '2,400–3,700 K', col: '#ffb27a' },
  ];

  window.ASTRA_DATA = { constellations: C, SUN_IAU, SUN_TROPICAL, ZODIAC_ORDER, SPECTRAL };
})();
