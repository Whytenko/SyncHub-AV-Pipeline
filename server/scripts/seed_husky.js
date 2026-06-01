'use strict';

/**
 * SEED: «Хаски — Я боюсь 2» — полностью укомплектованный музыкальный клип.
 * Цель: показать веб-приложение в боевом состоянии, как будто команда готова к сдаче.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs   = require('fs');
const path = require('path');
const pool = require('../src/pool');

const PROJECT_ID = 'prj_b52368f2-8be0-4760-8e2d-1da98d200a0b';
const OWNER_ID   = 'usr_625cf899-e4dc-4947-bd57-9033855ce831'; // demo

const TEAM = {
  director:  'usr_55f36d5a-6af2-4322-9559-a813e0ca8738', // Анна Смирнова
  script:    'usr_632f4bee-a619-4cc1-b02b-6f18d8a7d320', // Пётр Соколов
  manager:   'usr_494f49c7-af19-4168-80a0-0e7509259e4a', // Олег Морозов
  costumes:  'usr_a1147347-6027-4d46-a885-ee229c208188', // Елена Иванова
  makeup:    'usr_48ceba40-bb48-4509-a887-1a4a57c7ab6b', // Александра Кузнецова
  edit:      'usr_3ad7c40d-fe0d-4a07-97d8-ec9262e2a6b7', // Кирилл Волков
  sound:     'usr_67236278-1390-41ae-b285-3778194e05bc'  // Мария Орлова
};

const TEAM_NAMES = {
  [OWNER_ID]:       'Демо Пользователь',
  [TEAM.director]:  'Анна Смирнова',
  [TEAM.script]:    'Пётр Соколов',
  [TEAM.manager]:   'Олег Морозов',
  [TEAM.costumes]:  'Елена Иванова',
  [TEAM.makeup]:    'Александра Кузнецова',
  [TEAM.edit]:      'Кирилл Волков',
  [TEAM.sound]:     'Мария Орлова'
};

const HUSKY_DIR       = path.join(__dirname, '..', '..', 'Хаски');
const STORYBOARD_DIR  = path.join(HUSKY_DIR, 'РАСКАДРОВКА 60 КАДРОВ');
const EDITOR_SHOT_DIR = path.join(HUSKY_DIR, 'итоговые шоты кадров');
const UPLOAD_ROOT     = path.join(__dirname, '..', 'public', 'uploads', PROJECT_ID);
const STORYBOARD_DEST = path.join(UPLOAD_ROOT, 'storyboard');
const EDITOR_DEST     = path.join(UPLOAD_ROOT, 'editor_shots');

const EDITOR_IMG_NUMBERS = [
  4335,4336,4337,4338,4339,4340,4341,4342,4343,4344,
  4345,4346,4347,4348,4349,4350,4351,4352,4353,4354,
  4355,4356,4357,4358,4359,4360,4361,4362,4363,4364,
  4365,4367,4368,4370,4371,4373,4376,4377,4378,4379,
  4380,4381,4383,4384,4385,4386,4387,4388,4390,4391,
  4393,4395,4396,4397,4398,4399,4400,4401,4403,4404
];

const SCENES = [
  { num: 1,  title: 'ВНЕШ. ГОРОДСКАЯ УЛИЦА — ДЕНЬ',          location: 'Городская улица',         ie: 'EXT', dn: 'DAY',   chars: ['Хаски'],                description: 'Появление героя. Уставший, нервный, идёт сквозь городской поток. Камера ловит ритм шагов.', mins: 35 },
  { num: 2,  title: 'ВНЕШ. ДВОР И БЕТОННЫЕ СТЕНЫ — ДЕНЬ',    location: 'Промышленный двор',       ie: 'EXT', dn: 'DAY',   chars: ['Хаски'],                description: 'Хаски надевает сэндвич-борд. Серые стены, забор, мусор. Статичные напряжённые кадры.', mins: 40 },
  { num: 3,  title: 'ВНЕШ. ПОДЗЕМНЫЙ ПЕРЕХОД — ВЕЧЕР',       location: 'Подземный переход',       ie: 'EXT', dn: 'NIGHT', chars: ['Хаски'],                description: 'Замкнутость, давление пространства. Мерцающий свет ламп. Проход внутрь.',           mins: 30 },
  { num: 4,  title: 'ВНУТ. ТЁМНАЯ КОМНАТА — НОЧЬ',           location: 'Заброшенный павильон',    ie: 'INT', dn: 'NIGHT', chars: ['Хаски'],                description: 'Крупные планы лица. Усталость, дыхание, символика страха. Жёсткий направленный свет.', mins: 45 },
  { num: 5,  title: 'ВНЕШ. У ВОДЫ — ПАСМУРНЫЙ ДЕНЬ',         location: 'Набережная и сырая зона', ie: 'EXT', dn: 'DAY',   chars: ['Персонаж 2'],           description: 'Появление второго персонажа. Бледный, влажный, на границе человека и среды.',       mins: 40 },
  { num: 6,  title: 'ВНЕШ. ЛЕСТНИЦЫ И ПЕРЕХОДЫ — ВЕЧЕР',     location: 'Лестничные пролёты',      ie: 'EXT', dn: 'NIGHT', chars: ['Хаски', 'Персонаж 2'],  description: 'Динамика. Появление и исчезновение фигур. Контраст света и тени.',                  mins: 30 },
  { num: 7,  title: 'ВНЕШ. ПУСТАЯ ПЛОЩАДКА — НОЧЬ',          location: 'Пустырь / промзона',      ie: 'EXT', dn: 'NIGHT', chars: ['Хаски'],                description: 'Стояние в неудобной позе. Долгое удержание мимики. Холодная городская пустота.',    mins: 35 },
  { num: 8,  title: 'ВНУТ. ПАВИЛЬОН — НОЧЬ',                 location: 'Павильон для крупняков',  ie: 'INT', dn: 'NIGHT', chars: ['Персонаж 2'],           description: 'Крупные планы второго персонажа: глина, влажные акценты, безжизненная кожа.',       mins: 50 },
  { num: 9,  title: 'ВНЕШ. УЛИЦА В ТУМАНЕ — РАССВЕТ',        location: 'Городская улица',         ie: 'EXT', dn: 'DAY',   chars: ['Хаски', 'Персонаж 2'],  description: 'Сведение двух образов. Туман, мокрый асфальт, низкие ракурсы.',                     mins: 35 },
  { num: 10, title: 'ВНУТ. ПАВИЛЬОН ФИНАЛ — НОЧЬ',           location: 'Павильон для крупняков',  ie: 'INT', dn: 'NIGHT', chars: ['Хаски', 'Персонаж 2'],  description: 'Финальные крупняки обоих героев. Лица, глаза, текстуры. Затемнение в финал.',       mins: 50 }
];

const SHOT_TYPES_BY_FRAME = ['ДЛ', 'ОП', 'СП', 'ПП', 'КП', 'ДТЛ'];
const FRAME_DESC_BASE = [
  'Установочный план — герой входит в кадр',
  'Общий план — окружение и положение тела',
  'Средний план — взгляд, жест, позиция плеч',
  'Поясной план — текстура одежды, плакат',
  'Крупный план — лицо, дыхание, напряжение',
  'Деталь — глаза, руки, фрагмент плаката'
];

// ── Утилиты ──────────────────────────────────────────────────────────────────
const randStr = () => Math.random().toString(36).slice(2, 10);
const sid = (prefix) => `${prefix}_${Date.now()}_${randStr()}`;
let __nid = Date.now();
const nid = () => ++__nid;

function copyFrames() {
  fs.mkdirSync(STORYBOARD_DEST, { recursive: true });
  fs.mkdirSync(EDITOR_DEST,     { recursive: true });
  const storyboardUrls = [];
  const editorShotUrls = [];
  for (let i = 1; i <= 60; i++) {
    const cands = [`${i} кадр.png`, `${i}кадр.png`];
    const srcSb = cands.map(n => path.join(STORYBOARD_DIR, n)).find(fs.existsSync);
    if (!srcSb) throw new Error(`Не найден файл раскадровки #${i}`);
    fs.copyFileSync(srcSb, path.join(STORYBOARD_DEST, `${i}.png`));
    storyboardUrls.push(`/uploads/${PROJECT_ID}/storyboard/${i}.png`);
    const imgNum = EDITOR_IMG_NUMBERS[i - 1];
    const srcEd = path.join(EDITOR_SHOT_DIR, `IMG_${imgNum}.PNG`);
    if (!fs.existsSync(srcEd)) throw new Error(`Не найден шот IMG_${imgNum}.PNG`);
    fs.copyFileSync(srcEd, path.join(EDITOR_DEST, `${i}.png`));
    editorShotUrls.push(`/uploads/${PROJECT_ID}/editor_shots/${i}.png`);
  }
  return { storyboardUrls, editorShotUrls };
}

function buildScenes(storyboardUrls, editorShotUrls) {
  const frameDurations = [4, 3, 4, 3, 5, 3];
  const scenes = [];
  let g = 0;
  for (const s of SCENES) {
    const frames = [];
    for (let i = 0; i < 6; i++) {
      frames.push({
        shotType: SHOT_TYPES_BY_FRAME[i],
        description: `${FRAME_DESC_BASE[i]}. Сц.${s.num}.`,
        imageUrl: storyboardUrls[g],
        duration: frameDurations[i],
        editorShotUrl: editorShotUrls[g],
        editorNote: 'Шот соответствует раскадровке, согласован с режиссёром'
      });
      g++;
    }
    scenes.push({
      id: sid('scene'),
      number: s.num,
      title: s.title,
      location: s.location,
      interiorExterior: s.ie,
      dayNight: s.dn,
      characters: s.chars,
      description: s.description,
      estimatedMinutes: s.mins,
      pageCount: Math.max(1, Math.ceil(s.mins / 10)),
      status: 'approved',
      storyboardFrameCount: 6,
      frames
    });
  }
  return scenes;
}

function buildShootingDays(scenes) {
  const groups = [
    { sceneNums: [1, 2, 3],     date: '2026-05-12', call: '07:00', wrap: '21:00', loc: 'Москва, ул. Никольская + двор Хитровки + переход у метро «Курская»', notes: 'Старт съёмки. Контроль непрерывности костюма Хаски — плакат, кепка, обувь.' },
    { sceneNums: [4, 5, 6],     date: '2026-05-14', call: '06:30', wrap: '22:30', loc: 'Павильон «Атмосфера» + Северный речной вокзал + лестницы «Хитровские»', notes: 'Второй персонаж: бледный грим, влажные акценты. Полотенца, тёплая одежда.' },
    { sceneNums: [7, 8, 9, 10], date: '2026-05-17', call: '14:00', wrap: '04:00', loc: 'Промзона «Серп и Молот» + Павильон + Сокольники',                       notes: 'Завершающий блок. Ночные сцены, туман, финальные крупняки.' }
  ];
  return groups.map((g, idx) => {
    const dayScenes = scenes.filter(s => g.sceneNums.includes(s.number));
    return {
      id: sid('day'),
      dayNumber: idx + 1,
      date: g.date,
      callTime: g.call,
      wrapTime: g.wrap,
      location: g.loc,
      sceneIds: dayScenes.map(s => s.id),
      status: 'wrapped',
      notes: g.notes,
      totalMinutes: dayScenes.reduce((sum, s) => sum + s.estimatedMinutes, 0)
    };
  });
}

function buildMusicTimeline(scenes) {
  const totalAudio = 213;
  const out = [];
  let g = 0;
  for (const s of scenes) {
    for (let i = 0; i < 6; i++) {
      out.push({
        id: sid('clip'),
        sceneId: s.id,
        frameIdx: i,
        time: Math.round((g * totalAudio / 60) * 100) / 100
      });
      g++;
    }
  }
  return out;
}

function buildLocations() {
  const mk = (name, description) => ({
    id: nid(), name, description, shots: []
  });
  return [
    mk('Городская улица',         'Никольская улица, тротуар, поток людей'),
    mk('Промышленный двор',       'Бетонные стены, забор, мусор'),
    mk('Подземный переход',       'Длинный туннель с мерцающими лампами'),
    mk('Заброшенный павильон',    'Тёмное помещение для крупняков'),
    mk('Набережная и сырая зона', 'У воды, влажные поверхности, песок и глина'),
    mk('Лестничные пролёты',      'Старые лестницы с фактурными перилами'),
    mk('Пустырь / промзона',      'Открытое пустое пространство, ночная съёмка'),
    mk('Павильон для крупняков',  'Контролируемый свет, белый фон')
  ];
}

function buildCostumeOutfits() {
  return [
    {
      id: nid(),
      name: 'Хаски — городской герой',
      characterName: 'Хаски',
      sceneRefs: 'Сц.1, 2, 3, 4, 6, 7, 9, 10',
      referenceImage: '',
      outfitNotes: 'Тёмная палитра, бордовая кепка как акцент. Контроль непрерывности — обязательно фото на каждой смене.',
      status: 'ready',
      garments: [
        { id: nid(), category: 'headwear',   name: 'Кепка бордовая 6-панелка', colorHex: '#7a1f2b', material: 'хлопок',       brand: 'New Era',   acquisition: 'rented', price: 1500, notes: 'Снимать только при крупняках по согласованию' },
        { id: nid(), category: 'outerwear',  name: 'Куртка тёмная утеплённая', colorHex: '#1c2330', material: 'плотный хлопок', brand: 'Carhartt',  acquisition: 'rented', price: 5500, notes: 'Намеренные потёртости рукавов' },
        { id: nid(), category: 'top',        name: 'Лонгслив тёмный',          colorHex: '#2a2a2a', material: 'трикотаж',     brand: 'Uniqlo',    acquisition: 'rented', price: 1800, notes: '' },
        { id: nid(), category: 'bottom',     name: 'Брюки свободные тёмные',   colorHex: '#0e0e0e', material: 'хлопок + поли',brand: 'Dickies',   acquisition: 'rented', price: 3500, notes: 'Слегка испачканы внизу штанин' },
        { id: nid(), category: 'shoes',      name: 'Кроссовки серо-чёрные',    colorHex: '#3a3a40', material: 'кожзам + резина', brand: 'New Balance', acquisition: 'rented', price: 8500, notes: 'Массивные, городские' },
        { id: nid(), category: 'accessories',name: 'Сэндвич-борд (плакат)',    colorHex: '#c8b89a', material: 'фанера + бумага', brand: '—',     acquisition: 'to_make',price: 2800, notes: 'Самодельный, рукописные надписи. Верёвки и металлические пластины' }
      ]
    },
    {
      id: nid(),
      name: 'Персонаж 2 — бледный символ',
      characterName: 'Персонаж 2',
      sceneRefs: 'Сц.5, 6, 8, 9, 10',
      referenceImage: '',
      outfitNotes: 'Светлая обесцвеченная гамма. На съёмочной площадке постоянно увлажнять ткани распылителем.',
      status: 'ready',
      garments: [
        { id: nid(), category: 'headwear',   name: 'Балаклава бежевая тонкая', colorHex: '#e2d6c0', material: 'тонкий трикотаж', brand: '—', acquisition: 'to_make', price: 1200, notes: 'Сшита под персонажа' },
        { id: nid(), category: 'top',        name: 'Облегающий верхний слой',  colorHex: '#ece4d6', material: 'эластичная ткань',brand: '—', acquisition: 'to_make', price: 3200, notes: 'Имитация «второй кожи»' },
        { id: nid(), category: 'outerwear',  name: 'Длинная накидка-платье',   colorHex: '#b8aa90', material: 'марля + хлопок',  brand: '—', acquisition: 'to_make', price: 4500, notes: 'Состаривание ткани вручную' },
        { id: nid(), category: 'shoes',      name: 'Босиком / нюдовые стельки',colorHex: '#d8c7af', material: 'силикон',         brand: '—', acquisition: 'to_buy',  price: 800,  notes: 'Защитные стельки телесного цвета для безопасности' },
        { id: nid(), category: 'accessories',name: 'Глина / песок / соль',     colorHex: '#9aa39a', material: 'минеральная пудра', brand: 'Mehron', acquisition: 'to_buy', price: 1800, notes: 'Локальные следы на ткани и коже' }
      ]
    }
  ];
}

function buildMakeupLooks() {
  return [
    {
      id: nid(),
      name: 'Хаски — городская усталость',
      characterName: 'Хаски',
      sceneRefs: 'Сц.1, 2, 3, 4, 6, 7, 9, 10',
      applyTimeMin: 35,
      referenceImage: '',
      skinNotes: 'Реализм. Никаких «красивых» акцентов. Усиление щетины, матовая кожа, лёгкие тёмные круги.',
      status: 'ready',
      products: [
        { id: nid(), zone: 'skin',    productName: 'BB-крем NaturalGlow',      colorHex: '#c89e7f', technique: 'Лёгкий тон, минимум плотности' },
        { id: nid(), zone: 'skin',    productName: 'Матирующая пудра RCMA',    colorHex: '#d4ad8c', technique: 'Финиш кистью' },
        { id: nid(), zone: 'contour', productName: 'MAC Harmony',              colorHex: '#7a5240', technique: 'Серо-коричневый контуринг по скулам' },
        { id: nid(), zone: 'eyes',    productName: 'Палетка MUFE Artist Color',colorHex: '#3a2a26', technique: 'Лёгкая тёмная растушёвка, усталость' },
        { id: nid(), zone: 'brows',   productName: 'Sephora Brow Pencil',      colorHex: '#2e2218', technique: 'Усиление натуральной щетины графитовым карандашом' },
        { id: nid(), zone: 'lips',    productName: 'Бальзам Carmex',           colorHex: '#a07564', technique: 'Сухой натуральный оттенок без блеска' },
        { id: nid(), zone: 'other',   productName: 'Urban Decay Matte Setting',colorHex: '#ffffff', technique: 'Матовый фиксирующий спрей' }
      ]
    },
    {
      id: nid(),
      name: 'Персонаж 2 — холодная безжизненность',
      characterName: 'Персонаж 2',
      sceneRefs: 'Сц.5, 6, 8, 9, 10',
      applyTimeMin: 75,
      referenceImage: '',
      skinNotes: 'Водостойкий грим. Локальные «влажные» акценты глицерином. Регулярная подкраска между дублями.',
      status: 'ready',
      products: [
        { id: nid(), zone: 'skin',    productName: 'Kryolan Aquacolor 071',   colorHex: '#dcd6c8', technique: 'Бледный тон, серо-зелёный подтон' },
        { id: nid(), zone: 'skin',    productName: 'Mehron StarBlend',        colorHex: '#e0d8c0', technique: 'Финиш-пудра, матовый' },
        { id: nid(), zone: 'eyes',    productName: 'Kryolan Bruise Wheel',    colorHex: '#5d6a72', technique: 'Затемнение вокруг глаз серо-голубым' },
        { id: nid(), zone: 'cheeks',  productName: 'Минеральная пудра серая', colorHex: '#9aa39a', technique: 'Пятна глины и соли на скулах' },
        { id: nid(), zone: 'neck',    productName: 'Глиняный порошок',        colorHex: '#a8a085', technique: 'Сухой кистью на ключицы' },
        { id: nid(), zone: 'lips',    productName: 'Mehron Lip Color',        colorHex: '#9a8783', technique: 'Сухие, сероватый оттенок' },
        { id: nid(), zone: 'other',   productName: 'Mehron Barrier Spray',    colorHex: '#ffffff', technique: 'Матовый водостойкий фиксатор' },
        { id: nid(), zone: 'other',   productName: 'Глицерин аптечный',       colorHex: '#e8eff5', technique: 'Локальные акценты влажности' }
      ]
    }
  ];
}

function buildTasks() {
  const now = new Date().toISOString();
  const mk = (title, description, department, assignee, status, priority, dueDate) => ({
    id: sid('task'), title, description, status, priority, department, assignee, sceneRef: '', dueDate, createdAt: now, updatedAt: now
  });
  return [
    mk('Финализировать сценарий',           'Все 10 сцен + ремарки',                          'script',   TEAM.script,   'approved',    'high',   '2026-05-05'),
    mk('Согласовать раскадровку',           'Прогон 60 кадров под трек',                      'script',   TEAM.script,   'approved',    'high',   '2026-05-08'),
    mk('Раскадровка под трек',              '60 кадров по структуре «Я боюсь 2»',             'director', TEAM.director, 'approved',    'high',   '2026-05-09'),
    mk('Привязка кадров к таймлайну',       'Каждый кадр на конкретной секунде трека',        'director', TEAM.director, 'approved',    'high',   '2026-05-10'),
    mk('Сверка с монтажёром',               'Все 60 шотов соответствуют раскадровке',         'director', TEAM.director, 'approved',    'medium', '2026-05-25'),
    mk('Собрать образ Хаски',               'Тёмная палитра, плакат, обувь',                  'costumes', TEAM.costumes, 'approved',    'high',   '2026-05-10'),
    mk('Сшить образ Персонажа 2',           'Балаклава, накидка, состаривание ткани',         'costumes', TEAM.costumes, 'approved',    'high',   '2026-05-11'),
    mk('Тестовый грим Хаски',               'Реалистичная городская усталость',                'makeup',   TEAM.makeup,   'approved',    'high',   '2026-05-09'),
    mk('Тестовый грим Персонажа 2',         'Бледный тон, влажная текстура, глина',           'makeup',   TEAM.makeup,   'approved',    'high',   '2026-05-11'),
    mk('Согласовать локации',               '8 локаций, разрешения на съёмку',                 'manager',  TEAM.manager,  'approved',    'high',   '2026-05-08'),
    mk('Составить съёмочные дни',           '3 дня, 10 сцен, 60 кадров',                       'manager',  TEAM.manager,  'approved',    'high',   '2026-05-10'),
    mk('Загрузить мастер-трек',             'HASKI - YA BOYUS 2.mp3, 3:33',                    'sound',    TEAM.sound,    'approved',    'high',   '2026-05-06'),
    mk('Расставить маркеры под бит',        'Удары, переходы, кульминации',                    'sound',    TEAM.sound,    'approved',    'medium', '2026-05-12'),
    mk('Сборка чернового монтажа',          'Под раскадровку, ритм трека',                     'edit',     TEAM.edit,     'approved',    'high',   '2026-05-22'),
    mk('Загрузить 60 шотов в соответствие', 'Подтверждение порядка для режиссёра',             'edit',     TEAM.edit,     'approved',    'high',   '2026-05-26'),
    mk('Цветокоррекция',                    'Холодная палитра, зерно, виньетка',               'edit',     TEAM.edit,     'in_progress', 'medium', '2026-05-30')
  ];
}

function buildScriptParams() {
  return {
    scriptFile: null,
    actorsCount: 2,
    extraActorsCount: 0,
    childActorsCount: 0,
    animalsCount: 0,
    locationsCount: 8,
    exteriorScenesCount: 7,
    interiorScenesCount: 3,
    nightScenesCount: 6,
    shootingDaysCount: 3,
    totalDurationMin: 4,
    propsCount: 15,
    costumeSetsCount: 2,
    makeupLooksCount: 2,
    wigs: false,
    prosthetics: false,
    vfxShotsCount: 0,
    practicalEffectsCount: 4,
    stuntsCount: 0,
    weaponProps: false,
    pyrotechnics: false,
    rainScenes: true,
    snowScenes: false,
    vehiclesCount: 2,
    vehicleChases: false,
    droneShots: false,
    underwaterShots: false,
    aerialShots: false,
    craneShots: false,
    productionFormat: '4K',
    aspectRatio: '2.39:1',
    handheldStyle: true,
    steadicam: false,
    originalMusicTracks: 1,
    voiceOverPresent: false,
    silentScenes: false,
    musicGenre: 'Альтернативный хип-хоп',
    genre: 'Музыкальный клип / городская драма',
    ageRating: '18+',
    targetAudience: '18-35, любители авторской музыки',
    dialogLanguage: 'Русский',
    subtitlesNeeded: false,
    weatherDependentDays: 2,
    hazardousConditions: false,
    internationalShoot: false,
    remoteLocations: false,
    militaryEquipment: false,
    logline: 'Городской герой и его внутренний страх, выраженный через второго персонажа на границе человека и среды.',
    budgetTier: 'Средний (1-3М ₽)',
    colorGrading: 'Холодная палитра, пониженная насыщенность, зерно'
  };
}

function buildComments() {
  return [
    { id: 1717000001000, tabId: 'director', user: 'Анна Смирнова',         text: 'Раскадровка финализирована, 60 кадров расставлены под трек.',           timestamp: '2026-05-10 18:30', resolved: true },
    { id: 1717000002000, tabId: 'edit',     user: 'Кирилл Волков',         text: 'Загрузил все 60 шотов в «Соответствие раскадровке» — порядок соблюдён.', timestamp: '2026-05-26 21:15', resolved: true },
    { id: 1717000003000, tabId: 'sound',    user: 'Мария Орлова',          text: 'Мастер-трек готов, метки под бит расставлены.',                          timestamp: '2026-05-12 14:00', resolved: true },
    { id: 1717000004000, tabId: 'costumes', user: 'Елена Иванова',         text: 'Оба образа собраны, контроль непрерывности — фото на каждой смене.',     timestamp: '2026-05-11 16:45', resolved: true },
    { id: 1717000005000, tabId: 'makeup',   user: 'Александра Кузнецова',  text: 'Грим Персонажа 2 водостойкий, держится 4-5 часов между подкрасками.',   timestamp: '2026-05-11 17:20', resolved: true },
    { id: 1717000006000, tabId: 'manager',  user: 'Олег Морозов',          text: 'Все 3 съёмочных дня закрыты, переработок нет.',                          timestamp: '2026-05-17 23:50', resolved: true },
    { id: 1717000007000, tabId: 'script',   user: 'Пётр Соколов',          text: 'Сценарий и логлайн утверждены, конфликтов с раскадровкой нет.',          timestamp: '2026-05-08 12:00', resolved: true }
  ];
}

function buildMarkers() {
  return [
    { id: 1717100001, time: 0,   color: '#06b6d4', title: 'Старт трека',           comment: 'Появление героя',                       user: 'Мария Орлова',  icon: 'music',    tabId: 'sound'    },
    { id: 1717100002, time: 18,  color: '#FF391A', title: 'Первый куплет',         comment: 'Хаски надевает плакат',                 user: 'Анна Смирнова', icon: 'film',     tabId: 'director' },
    { id: 1717100003, time: 53,  color: '#06b6d4', title: 'Припев',                comment: 'Резкая смена кадров, удар бита',        user: 'Мария Орлова',  icon: 'music',    tabId: 'sound'    },
    { id: 1717100004, time: 89,  color: '#FF391A', title: 'Второй куплет',         comment: 'Подземный переход + комната',           user: 'Анна Смирнова', icon: 'film',     tabId: 'director' },
    { id: 1717100005, time: 124, color: '#FF391A', title: 'Появление Персонажа 2', comment: 'Сменa настроения, влажная среда',       user: 'Анна Смирнова', icon: 'film',     tabId: 'director' },
    { id: 1717100006, time: 160, color: '#06b6d4', title: 'Кульминация',           comment: 'Финальный припев',                       user: 'Мария Орлова',  icon: 'music',    tabId: 'sound'    },
    { id: 1717100007, time: 195, color: '#FF391A', title: 'Финал',                 comment: 'Сведение двух образов, затемнение',     user: 'Анна Смирнова', icon: 'film',     tabId: 'director' }
  ];
}

async function run() {
  console.log('▶ Копирование 60+60 изображений…');
  const { storyboardUrls, editorShotUrls } = copyFrames();
  console.log(`   ✓ ${storyboardUrls.length} раскадровок, ${editorShotUrls.length} шотов`);

  console.log('▶ Сборка данных…');
  const scenes        = buildScenes(storyboardUrls, editorShotUrls);
  const shootingDays  = buildShootingDays(scenes);
  const musicTimeline = buildMusicTimeline(scenes);
  const locations     = buildLocations();
  const outfits       = buildCostumeOutfits();
  const looks         = buildMakeupLooks();
  const tasks         = buildTasks();
  const scriptParams  = buildScriptParams();
  const comments      = buildComments();
  const markers       = buildMarkers();

  const memberIds = [OWNER_ID, ...Object.values(TEAM)];
  const projectRoles = {
    [OWNER_ID]:        'Режиссёр',
    [TEAM.director]:   'Режиссёр',
    [TEAM.script]:     'Сценарист',
    [TEAM.manager]:    'Менеджер',
    [TEAM.costumes]:   'Костюмер',
    [TEAM.makeup]:     'Визажист',
    [TEAM.edit]:       'Монтажёр',
    [TEAM.sound]:      'Звукорежиссёр'
  };

  const directorNotes =
    'РЕЖИССЁРСКАЯ КОНЦЕПЦИЯ: «Я боюсь 2» — холодная городская тревога. Двое героев, один — реалистичный уличный наблюдатель, второй — символ внутреннего страха, бледный и влажный.\n\n' +
    'Ключевая визуальная идея — контраст материальности: грубая ткань, бордовая кепка, картон сэндвич-борда vs марля, глина, серо-зелёный подтон.\n\n' +
    'Каждый кадр привязан к секунде трека (см. таймлайн). 60 кадров за 3:33 — в среднем 3.5с на план, с акцентами на ударах бита.';

  const scriptText =
    'СЦЕНАРИЙ — «Я боюсь 2»\n\n' +
    SCENES.map(s => `СЦЕНА ${s.num}. ${s.title}\n${s.description}\nПерсонажи: ${s.chars.join(', ')}\nЭкранное время ≈ ${s.mins} мин съёмки.`).join('\n\n');

  console.log('▶ UPDATE projects…');
  await pool.query(
    `UPDATE projects SET
       name              = $1,
       description       = $2,
       deadline          = $3,
       members           = $4,
       production_stage  = $5,
       project_kind      = $6,
       script_text       = $7,
       director_notes    = $8,
       scenes            = $9,
       shooting_days     = $10,
       project_roles     = $11,
       music_timeline    = $12,
       locations         = $13,
       costume_outfits   = $14,
       makeup_looks      = $15,
       tasks             = $16,
       script_params     = $17,
       comments          = $18,
       markers           = $19,
       timeline_duration = $20,
       updated_at        = NOW()
     WHERE id = $21`,
    [
      'Хаски — Я боюсь 2',
      'Музыкальный клип «Хаски — Я боюсь 2». Холодная городская тревога, два символических героя, 60 кадров под 3:33 трека. Дипломный проект.',
      '2026-06-15',
      memberIds,
      'delivery',
      'music_video',
      scriptText,
      directorNotes,
      JSON.stringify(scenes),
      JSON.stringify(shootingDays),
      JSON.stringify(projectRoles),
      JSON.stringify(musicTimeline),
      JSON.stringify(locations),
      JSON.stringify(outfits),
      JSON.stringify(looks),
      JSON.stringify(tasks),
      JSON.stringify(scriptParams),
      JSON.stringify(comments),
      JSON.stringify(markers),
      213,
      PROJECT_ID
    ]
  );

  console.log('\n✅ Проект «Хаски — Я боюсь 2» полностью укомплектован\n');
  console.log(`   • Стадия:         delivery`);
  console.log(`   • Участников:     ${memberIds.length}`);
  console.log(`   • Сцен:           ${scenes.length}`);
  console.log(`   • Кадров раскадр.: ${scenes.reduce((s, sc) => s + sc.storyboardFrameCount, 0)}`);
  console.log(`   • Шотов монтажёра: ${scenes.reduce((s, sc) => s + sc.frames.filter(f => f.editorShotUrl).length, 0)}`);
  console.log(`   • Съёмочных дней: ${shootingDays.length}`);
  console.log(`   • Задач:          ${tasks.length}`);
  console.log(`   • Костюмов:       ${outfits.length}`);
  console.log(`   • Гримов:         ${looks.length}`);
  console.log(`   • Маркеров:       ${markers.length}`);
  console.log(`   • ClipFrames:     ${musicTimeline.length}`);

  await pool.end();
}

run().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
