'use strict';

/* ==========================================================================
   StudyBoost — умный помощник школьника
   Чистый JavaScript без библиотек и сервера. Данные хранятся в localStorage.

   Блоки файла:
   1. Константы и справочники
   2. Утилиты: даты, форматирование, безопасный HTML
   3. Состояние: создание, проверка, загрузка и сохранение
   4. Демонстрационные данные
   5. Производные данные и статистика
   6. Умный планировщик
   7. Уведомления
   8. Достижения
   9. Интерфейс: тосты, диалоги, подтверждение, подсказки, конфетти
   10. Навигация
   11. Главная страница
   12. Мои задания: список, фильтры, форма
   13. Расписание
   14. Режим «У меня 30 минут» (учебная сессия)
   15. Статистика
   16. Настройки, предметы, импорт и экспорт
   17. Тема и цвет акцента
   18. Обработчики событий
   19. Запуск
   ========================================================================== */

/* ==========================================================================
   1. Константы и справочники
   ========================================================================== */

const STORAGE_KEY = 'studyboost:v1';
const CORRUPTED_BACKUP_KEY = 'studyboost:corrupted-backup';
const DATA_VERSION = 1;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const SOON_WINDOW_MS = 24 * HOUR_MS; // «Скоро дедлайн» — меньше суток до срока
const MAX_NOTIFICATIONS = 60;
const MAX_NOTIFIED_KEYS = 400;
const MAX_IMPORT_SIZE = 5 * 1024 * 1024;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 96;
const GLOBAL_TICK_MS = 30 * 1000;

const PAGES = ['home', 'tasks', 'schedule', 'stats', 'settings'];
const PAGE_TITLES = {
  home: 'Главная',
  tasks: 'Мои задания',
  schedule: 'Расписание',
  stats: 'Статистика',
  settings: 'Настройки',
};

// Встроенные предметы. gen — форма для фразы «Начни с ...».
const DEFAULT_SUBJECTS = [
  { id: 'math', name: 'Математика', gen: 'математики', color: 1 },
  { id: 'english', name: 'Английский язык', gen: 'английского', color: 2 },
  { id: 'russian', name: 'Русский язык', gen: 'русского', color: 3 },
  { id: 'informatics', name: 'Информатика', gen: 'информатики', color: 4 },
  { id: 'history', name: 'История', gen: 'истории', color: 5 },
  { id: 'biology', name: 'Биология', gen: 'биологии', color: 6 },
  { id: 'physics', name: 'Физика', gen: 'физики', color: 7 },
];
const DEFAULT_SUBJECT_IDS = DEFAULT_SUBJECTS.map((subject) => subject.id);
const FALLBACK_SUBJECT = { id: '', name: 'Без предмета', gen: '', color: 8, custom: true };
const CUSTOM_SUBJECT_VALUE = '__custom';

const DIFFICULTY = {
  easy: { label: 'Лёгкая', points: 3 },
  medium: { label: 'Средняя', points: 6 },
  hard: { label: 'Сложная', points: 10 },
};

const PRIORITY = {
  low: { label: 'Низкий', points: 6 },
  medium: { label: 'Средний', points: 15 },
  high: { label: 'Высокий', points: 25 },
};

const TASK_STATUS = {
  done: { label: 'Выполнено', icon: 'i-check-circle' },
  soon: { label: 'Скоро дедлайн', icon: 'i-clock' },
  overdue: { label: 'Просрочено', icon: 'i-alert' },
  normal: { label: 'Запланировано', icon: 'i-calendar' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'pending', label: 'Активные' },
  { value: 'soon', label: 'Скоро дедлайн' },
  { value: 'overdue', label: 'Просрочено' },
  { value: 'done', label: 'Выполнено' },
];

const ACCENTS = ['indigo', 'blue', 'violet', 'teal', 'sunset'];
const ACCENT_THEME_COLORS = {
  indigo: '#4f63ff',
  blue: '#2563eb',
  violet: '#7c3aed',
  teal: '#0f8f84',
  sunset: '#e8590c',
};
const GRADES = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const TIPS = [
  'Записывай домашнее задание сразу на уроке — так оно точно не потеряется.',
  'Начни с короткого задания, чтобы «разогнаться», а сложное делай, пока есть силы.',
  'Занимайся отрезками по 25–30 минут и делай перерыв на 5 минут.',
  'Убери телефон из поля зрения на время учебной сессии.',
  'Дели большое задание на шаги по 15–20 минут и отмечай каждый шаг.',
  'Повторяй новые слова и правила через день, а не только накануне урока.',
  'Собирай рюкзак и всё нужное с вечера — утро будет спокойнее.',
  'Не успеваешь? Предупреди учителя заранее, а не в последний момент.',
];

const TOUR_STEPS = [
  { id: 'add', text: 'Добавь домашнее задание' },
  { id: 'plan', text: 'Посмотри, как обновился план на день' },
  { id: 'focus', text: 'Нажми «У меня 30 минут»' },
  { id: 'timer', text: 'Запусти таймер' },
  { id: 'complete', text: 'Отметь задание выполненным' },
  { id: 'stats', text: 'Открой обновлённую статистику' },
];

const NOTIFICATION_ICONS = {
  soon: 'i-clock',
  overdue: 'i-alert',
  done: 'i-check-circle',
  session: 'i-bolt',
  achievement: 'i-trophy',
  info: 'i-info',
};

const ACHIEVEMENTS = [
  { id: 'first_step', title: 'Первый шаг', description: 'Выполни первое задание', icon: 'i-flag', goal: 1, value: (stats) => stats.done },
  { id: 'marathon', title: 'Марафон учёбы', description: 'Выполни 5 заданий', icon: 'i-book', goal: 5, value: (stats) => stats.done },
  { id: 'no_late', title: 'Без опозданий', description: 'Сдай 3 задания до дедлайна', icon: 'i-check-circle', goal: 3, value: (stats) => stats.onTime },
  { id: 'time_master', title: 'Мастер времени', description: 'Заверши учебную сессию StudyBoost', icon: 'i-clock', goal: 1, value: (stats) => stats.sessionsCount },
  { id: 'week_streak', title: 'Неделя продуктивности', description: 'Учись 7 дней подряд', icon: 'i-flame', goal: 7, value: (stats) => stats.streak.best },
];

// Демонстрационное расписание: день недели → предметы по урокам
const DEMO_TIMETABLE = [
  [1, ['math', 'russian', 'english', 'history']],
  [2, ['physics', 'math', 'biology', 'informatics']],
  [3, ['russian', 'english', 'math', 'history']],
  [4, ['math', 'informatics', 'physics', 'english']],
  [5, ['biology', 'russian', 'math', 'english']],
];
const DEMO_SLOTS = [['08:30', '09:15'], ['09:25', '10:10'], ['10:30', '11:15'], ['11:25', '12:10']];
const DEMO_ROOMS = { math: '204', russian: '112', english: '308', history: '215', physics: '301', biology: '118', informatics: '401' };

/* ==========================================================================
   2. Утилиты
   ========================================================================== */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function icon(name, extraClass = '') {
  return `<svg class="icon ${extraClass}" aria-hidden="true" focusable="false"><use href="#${name}"></use></svg>`;
}

function pluralRu(count, forms) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

const TASK_FORMS = ['задание', 'задания', 'заданий'];
const DAY_FORMS = ['день', 'дня', 'дней'];
const MINUTE_FORMS = ['минута', 'минуты', 'минут'];
const LESSON_FORMS = ['урок', 'урока', 'уроков'];

function countText(count, forms) {
  return `${count} ${pluralRu(count, forms)}`;
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toTimeValue(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function joinDateTime(dateKey, time) {
  return `${dateKey}T${time}`;
}

function isValidTime(value) {
  return typeof value === 'string' && TIME_RE.test(value);
}

function parseDateKey(value) {
  const match = typeof value === 'string' ? value.match(DATE_KEY_RE) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

// Дедлайн хранится в локальном времени в формате «ГГГГ-ММ-ДДTЧЧ:ММ»
function parseLocalDateTime(value) {
  if (typeof value !== 'string') return null;
  const [dateKey, time] = value.split('T');
  const date = parseDateKey(dateKey);
  if (!date || !isValidTime(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function normalizeDeadline(value) {
  if (parseLocalDateTime(value)) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const time = new Date(value).getTime();
    if (Number.isFinite(time)) {
      const date = new Date(time);
      return joinDateTime(toDateKey(date), toTimeValue(date));
    }
  }
  return null;
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function calendarDayDiff(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

// 0 — понедельник, 6 — воскресенье
function weekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function startOfWeek(date) {
  return addDays(startOfDay(date), -weekdayIndex(date));
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

function roundUpToHalfHour(date) {
  const result = new Date(date);
  result.setSeconds(0, 0);
  const minutes = result.getMinutes();
  if (minutes !== 0 && minutes !== 30) result.setMinutes(minutes < 30 ? 30 : 60);
  return result;
}

function isoToDateKey(iso) {
  return toDateKey(new Date(iso));
}

const fmtFullDate = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtFullDateNoYear = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtDayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const fmtDayMonthShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const fmtWeekdayShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });

function formatMinutes(totalMinutes) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

// Длительность промежутка: «3 ч 12 мин», «2 дня 4 ч»
function formatSpan(ms) {
  const abs = Math.abs(ms);
  if (abs < MINUTE_MS) return 'меньше минуты';
  if (abs < HOUR_MS) return `${Math.floor(abs / MINUTE_MS)} мин`;
  if (abs < DAY_MS) {
    const hours = Math.floor(abs / HOUR_MS);
    const minutes = Math.floor((abs % HOUR_MS) / MINUTE_MS);
    return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }
  const days = Math.floor(abs / DAY_MS);
  const hours = Math.floor((abs % DAY_MS) / HOUR_MS);
  const daysText = countText(days, DAY_FORMS);
  return hours && days < 3 ? `${daysText} ${hours} ч` : daysText;
}

function formatTimeLeft(deadline, now) {
  const diff = deadline - now;
  return diff >= 0 ? `через ${formatSpan(diff)}` : `просрочено на ${formatSpan(diff)}`;
}

function formatDeadline(date, now = new Date()) {
  const diff = calendarDayDiff(now, date);
  const time = toTimeValue(date);
  if (diff === 0) return `Сегодня, ${time}`;
  if (diff === 1) return `Завтра, ${time}`;
  if (diff === -1) return `Вчера, ${time}`;
  return `${capitalize(fmtWeekdayShort.format(date))}, ${time}`;
}

function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes >= 60) return formatMinutes(minutes);
  if (!minutes) return `${rest} с`;
  return rest ? `${minutes} мин ${rest} с` : `${minutes} мин`;
}

function formatAgo(iso, now = new Date()) {
  const date = new Date(iso);
  const diff = now - date;
  if (diff < MINUTE_MS) return 'только что';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)} мин назад`;
  if (calendarDayDiff(date, now) === 0) return `сегодня в ${toTimeValue(date)}`;
  if (calendarDayDiff(date, now) === 1) return `вчера в ${toTimeValue(date)}`;
  return `${fmtDayMonth.format(date)} в ${toTimeValue(date)}`;
}

/* ==========================================================================
   3. Состояние приложения
   ========================================================================== */

let state = null;
let storageWarningShown = false;

const DEFAULT_FILTERS = Object.freeze({ search: '', subject: 'all', status: 'all', priority: 'all', sort: 'smart' });

// Состояние интерфейса — не сохраняется в localStorage
const ui = {
  page: 'home',
  filters: { ...DEFAULT_FILTERS },
  weekOffset: 0,
  selectedDayKey: toDateKey(new Date()),
  editingTaskId: null,
  editingLessonId: null,
  lastSubjectId: null,
  focus: { view: 'choose', plan: null, result: null },
  sessionTimer: null,
  lastSessionPersist: 0,
  confirmResolver: null,
};

function createDefaultSettings() {
  return { name: '', grade: '', theme: 'light', accent: 'indigo', sessionMinutes: 30, dailyMinutes: 120 };
}

function createDefaultTour() {
  return { add: false, plan: false, focus: false, timer: false, complete: false, stats: false, hidden: false };
}

function createEmptyState() {
  return {
    version: DATA_VERSION,
    settings: createDefaultSettings(),
    subjects: DEFAULT_SUBJECTS.map((subject) => ({ ...subject, custom: false })),
    tasks: [],
    lessons: [],
    sessions: [],
    notifications: [],
    notifiedKeys: [],
    achievements: {},
    tour: createDefaultTour(),
    activeSession: null,
    createdAt: new Date().toISOString(),
  };
}

/* --- Проверка и очистка данных (используется при загрузке и импорте) --- */

function sanitizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizeIso(value) {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function sanitizeInt(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(Math.round(number), min, max) : fallback;
}

function sanitizeStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, 200) : [];
}

function sanitizeSettings(raw) {
  const defaults = createDefaultSettings();
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    name: sanitizeText(source.name, 40),
    grade: oneOf(String(source.grade ?? ''), GRADES, defaults.grade),
    theme: oneOf(source.theme, ['light', 'dark'], defaults.theme),
    accent: oneOf(source.accent, ACCENTS, defaults.accent),
    sessionMinutes: sanitizeInt(source.sessionMinutes, 5, 240, defaults.sessionMinutes),
    dailyMinutes: sanitizeInt(source.dailyMinutes, 15, 720, defaults.dailyMinutes),
  };
}

function sanitizeSubjects(rawList) {
  const subjects = DEFAULT_SUBJECTS.map((subject) => ({ ...subject, custom: false }));
  const aliases = {};
  if (!Array.isArray(rawList)) return { subjects, aliases };

  for (const raw of rawList) {
    if (!raw || typeof raw !== 'object') continue;
    const id = sanitizeText(raw.id, 60);
    const name = sanitizeText(raw.name, 30);
    if (!id || !name || DEFAULT_SUBJECT_IDS.includes(id)) continue;
    const sameName = subjects.find((subject) => subject.name.toLowerCase() === name.toLowerCase());
    if (sameName) {
      aliases[id] = sameName.id;
      continue;
    }
    if (subjects.some((subject) => subject.id === id)) continue;
    subjects.push({ id, name, gen: '', color: sanitizeInt(raw.color, 1, 8, 8), custom: true });
  }
  return { subjects, aliases };
}

function resolveSubjectId(rawId, subjects, aliases) {
  const id = typeof rawId === 'string' ? aliases[rawId] || rawId : '';
  return subjects.some((subject) => subject.id === id) ? id : null;
}

function ensureOtherSubject(subjects) {
  const existing = subjects.find((subject) => subject.id === 'other' || subject.name.toLowerCase() === 'другое');
  if (existing) return existing.id;
  subjects.push({ id: 'other', name: 'Другое', gen: '', color: 8, custom: true });
  return 'other';
}

function sanitizeTask(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = sanitizeText(raw.title, 120);
  const deadline = normalizeDeadline(raw.deadline);
  const duration = Number(raw.duration);
  if (!title || !deadline || !Number.isFinite(duration) || duration <= 0) return null;
  const isDone = raw.status === 'done';
  return {
    id: sanitizeText(raw.id, 60),
    title,
    subjectId: typeof raw.subjectId === 'string' ? raw.subjectId : '',
    deadline,
    duration: clamp(Math.round(duration), 5, 600),
    difficulty: oneOf(raw.difficulty, Object.keys(DIFFICULTY), 'medium'),
    priority: oneOf(raw.priority, Object.keys(PRIORITY), 'medium'),
    description: sanitizeText(raw.description, 500),
    status: isDone ? 'done' : 'pending',
    completedAt: isDone ? sanitizeIso(raw.completedAt) || new Date().toISOString() : null,
    completedInSession: isDone && raw.completedInSession === true,
    createdAt: sanitizeIso(raw.createdAt) || new Date().toISOString(),
    demo: raw.demo === true,
  };
}

function sanitizeLesson(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const day = Number(raw.day);
  if (!Number.isInteger(day) || day < 1 || day > 7) return null;
  if (!isValidTime(raw.start) || !isValidTime(raw.end)) return null;
  if (timeToMinutes(raw.start) >= timeToMinutes(raw.end)) return null;
  return {
    id: sanitizeText(raw.id, 60),
    day,
    start: raw.start,
    end: raw.end,
    subjectId: typeof raw.subjectId === 'string' ? raw.subjectId : '',
    room: sanitizeText(raw.room, 20),
    demo: raw.demo === true,
  };
}

function sanitizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const startedAt = sanitizeIso(raw.startedAt);
  const endedAt = sanitizeIso(raw.endedAt);
  if (!startedAt || !endedAt) return null;
  const taskIds = sanitizeStringArray(raw.taskIds);
  return {
    id: sanitizeText(raw.id, 60) || createId('session'),
    startedAt,
    endedAt,
    plannedMinutes: sanitizeInt(raw.plannedMinutes, 1, 240, 30),
    spentSeconds: sanitizeInt(raw.spentSeconds, 0, 240 * 60, 0),
    taskIds,
    completedTaskIds: sanitizeStringArray(raw.completedTaskIds).filter((id) => taskIds.includes(id)),
  };
}

function sanitizeNotification(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const createdAt = sanitizeIso(raw.createdAt);
  const title = sanitizeText(raw.title, 100);
  if (!createdAt || !title) return null;
  return {
    id: sanitizeText(raw.id, 60) || createId('note'),
    type: oneOf(raw.type, Object.keys(NOTIFICATION_ICONS), 'info'),
    title,
    text: sanitizeText(raw.text, 240),
    createdAt,
    read: raw.read === true,
  };
}

function sanitizeActiveSession(raw, existingTaskIds) {
  if (!raw || typeof raw !== 'object') return null;
  const plannedMinutes = sanitizeInt(raw.plannedMinutes, 1, 240, 0);
  const startedAt = sanitizeIso(raw.startedAt);
  if (!plannedMinutes || !startedAt) return null;
  const taskIds = sanitizeStringArray(raw.taskIds).filter((id) => existingTaskIds.has(id));
  return {
    id: sanitizeText(raw.id, 60) || createId('session'),
    plannedMinutes,
    taskIds,
    completedTaskIds: sanitizeStringArray(raw.completedTaskIds).filter((id) => taskIds.includes(id)),
    startedAt,
    elapsedMs: clamp(Number(raw.elapsedMs) || 0, 0, plannedMinutes * MINUTE_MS),
    // После перезагрузки страницы сессия всегда стоит на паузе
    running: false,
    runningSince: null,
    progressBefore: sanitizeInt(raw.progressBefore, 0, 100, 0),
  };
}

function sanitizeState(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const base = createEmptyState();
  const { subjects, aliases } = sanitizeSubjects(source.subjects);
  const usedIds = new Set();
  const uniqueId = (id, prefix) => {
    const result = id && !usedIds.has(id) ? id : createId(prefix);
    usedIds.add(result);
    return result;
  };

  const tasks = [];
  for (const rawTask of Array.isArray(source.tasks) ? source.tasks : []) {
    const task = sanitizeTask(rawTask);
    if (!task) continue;
    task.id = uniqueId(task.id, 'task');
    task.subjectId = resolveSubjectId(task.subjectId, subjects, aliases) || ensureOtherSubject(subjects);
    tasks.push(task);
  }

  const lessons = [];
  for (const rawLesson of Array.isArray(source.lessons) ? source.lessons : []) {
    const lesson = sanitizeLesson(rawLesson);
    if (!lesson) continue;
    lesson.id = uniqueId(lesson.id, 'lesson');
    lesson.subjectId = resolveSubjectId(lesson.subjectId, subjects, aliases) || ensureOtherSubject(subjects);
    lessons.push(lesson);
  }

  const sessions = (Array.isArray(source.sessions) ? source.sessions : []).map(sanitizeSession).filter(Boolean);
  const notifications = (Array.isArray(source.notifications) ? source.notifications : [])
    .map(sanitizeNotification)
    .filter(Boolean)
    .slice(0, MAX_NOTIFICATIONS);

  const achievements = {};
  const rawAchievements = source.achievements && typeof source.achievements === 'object' ? source.achievements : {};
  for (const achievement of ACHIEVEMENTS) {
    const unlockedAt = sanitizeIso(rawAchievements[achievement.id]);
    if (unlockedAt) achievements[achievement.id] = unlockedAt;
  }

  const tour = createDefaultTour();
  const rawTour = source.tour && typeof source.tour === 'object' ? source.tour : {};
  Object.keys(tour).forEach((key) => {
    tour[key] = rawTour[key] === true;
  });

  const taskIds = new Set(tasks.map((task) => task.id));

  return {
    version: DATA_VERSION,
    settings: sanitizeSettings(source.settings),
    subjects,
    tasks,
    lessons,
    sessions,
    notifications,
    notifiedKeys: sanitizeStringArray(source.notifiedKeys).slice(-MAX_NOTIFIED_KEYS),
    achievements,
    tour,
    activeSession: sanitizeActiveSession(source.activeSession, taskIds),
    createdAt: sanitizeIso(source.createdAt) || base.createdAt,
  };
}

function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return { state: createDemoState(), firstRun: true, recovered: false };
  }
  if (!raw) return { state: createDemoState(), firstRun: true, recovered: false };
  try {
    return { state: sanitizeState(JSON.parse(raw)), firstRun: false, recovered: false };
  } catch (error) {
    try {
      localStorage.setItem(CORRUPTED_BACKUP_KEY, raw);
    } catch (backupError) {
      // Резервную копию сохранить не удалось — продолжаем с демо-данными
    }
    return { state: createDemoState(), firstRun: true, recovered: true };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    if (!storageWarningShown) {
      storageWarningShown = true;
      showToast('Браузер не разрешил сохранить данные. Изменения пропадут после перезагрузки — сделай экспорт в JSON.', 'danger');
    }
    return false;
  }
}

/* ==========================================================================
   4. Демонстрационные данные
   ========================================================================== */

function createDemoTasks(now = new Date()) {
  const at = (days, time) => joinDateTime(toDateKey(addDays(now, days)), time);
  const soon = roundUpToHalfHour(new Date(now.getTime() + 4 * HOUR_MS));
  const createdAt = new Date(now.getTime() - 2 * DAY_MS).toISOString();
  const list = [
    {
      title: 'Выучить 15 новых слов (Unit 3)', subjectId: 'english', deadline: joinDateTime(toDateKey(soon), toTimeValue(soon)),
      duration: 20, difficulty: 'easy', priority: 'high',
      description: 'Слова на странице 42. Проверить себя по карточкам: английский → русский и наоборот.',
    },
    {
      title: 'Решить задачи № 245–248', subjectId: 'math', deadline: at(1, '08:30'),
      duration: 40, difficulty: 'hard', priority: 'high',
      description: 'Тема «Квадратные уравнения». Оформить решения в тетради.',
    },
    {
      title: 'Повторить правило «-тся» и «-ться»', subjectId: 'russian', deadline: at(1, '09:25'),
      duration: 10, difficulty: 'easy', priority: 'medium',
      description: 'Параграф 24. Выписать 5 своих примеров.',
    },
    {
      title: 'Подготовить сообщение о строении клетки', subjectId: 'biology', deadline: at(-1, '18:00'),
      duration: 25, difficulty: 'medium', priority: 'medium',
      description: 'Устное сообщение на 2–3 минуты, можно с рисунком.',
    },
    {
      title: 'Написать программу с циклом for', subjectId: 'informatics', deadline: at(2, '10:30'),
      duration: 45, difficulty: 'hard', priority: 'medium',
      description: 'Вывести на экран таблицу умножения от 1 до 9.',
    },
    {
      title: 'Прочитать параграф 12 и ответить на вопросы', subjectId: 'history', deadline: at(3, '11:25'),
      duration: 30, difficulty: 'medium', priority: 'low',
      description: 'Вопросы 1–4 в конце параграфа, письменно.',
    },
    {
      title: 'Решить 3 задачи на скорость', subjectId: 'physics', deadline: at(4, '09:25'),
      duration: 15, difficulty: 'medium', priority: 'low',
      description: 'Упражнение 7, задачи 1–3.',
    },
  ];
  return list.map((item) => ({
    id: createId('task'),
    ...item,
    status: 'pending',
    completedAt: null,
    completedInSession: false,
    createdAt,
    demo: true,
  }));
}

function createDemoLessons() {
  const lessons = [];
  DEMO_TIMETABLE.forEach(([day, subjectIds]) => {
    subjectIds.forEach((subjectId, index) => {
      lessons.push({
        id: createId('lesson'),
        day,
        start: DEMO_SLOTS[index][0],
        end: DEMO_SLOTS[index][1],
        subjectId,
        room: DEMO_ROOMS[subjectId] || '',
        demo: true,
      });
    });
  });
  return lessons;
}

function createDemoState() {
  const demoState = createEmptyState();
  demoState.tasks = createDemoTasks();
  demoState.lessons = createDemoLessons();
  return demoState;
}

function hasDemoData() {
  return state.tasks.some((task) => task.demo) || state.lessons.some((lesson) => lesson.demo);
}

async function removeDemoData() {
  if (!hasDemoData()) {
    showToast('Демонстрационных данных уже нет.', 'info');
    return;
  }
  const activeHasDemo = state.activeSession && state.activeSession.taskIds.some((id) => {
    const task = findTask(id);
    return task && task.demo;
  });
  if (activeHasDemo) {
    showToast('Сначала заверши учебную сессию — в ней есть демо-задания.', 'warning');
    return;
  }
  const ok = await confirmAction({
    title: 'Начать с чистого листа?',
    message: 'Демонстрационные задания и уроки будут удалены. Твои собственные задания и уроки останутся.',
    confirmText: 'Удалить демо',
  });
  if (!ok) return;
  state.tasks = state.tasks.filter((task) => !task.demo);
  state.lessons = state.lessons.filter((lesson) => !lesson.demo);
  saveState();
  refresh();
  showToast('Демо-данные удалены. Добавь своё первое задание!', 'success');
}

function loadDemoData() {
  if (hasDemoData()) {
    showToast('Демонстрационные данные уже загружены.', 'info');
    return;
  }
  state.tasks.push(...createDemoTasks());
  if (!state.lessons.length) state.lessons.push(...createDemoLessons());
  checkDeadlineNotifications(new Date());
  saveState();
  refresh();
  showToast(state.lessons.some((lesson) => lesson.demo)
    ? 'Демо-задания и расписание загружены.'
    : 'Демо-задания загружены. Расписание не тронуто, потому что в нём уже есть уроки.', 'success');
}

/* ==========================================================================
   5. Производные данные и статистика
   ========================================================================== */

function findTask(id) {
  return state.tasks.find((task) => task.id === id) || null;
}

function getSubject(id) {
  return state.subjects.find((subject) => subject.id === id) || FALLBACK_SUBJECT;
}

function subjectStyle(subject) {
  return `--subj: var(--c${subject.color})`;
}

function subjectTag(subject) {
  return `<span class="subject-tag" style="${subjectStyle(subject)}">${escapeHtml(subject.name)}</span>`;
}

function getTaskDeadline(task) {
  return parseLocalDateTime(task.deadline) || new Date();
}

// Статус для цветовой индикации: done — зелёный, soon — жёлтый, overdue — красный, normal — серый
function getTaskState(task, now = new Date()) {
  if (task.status === 'done') return 'done';
  const diff = getTaskDeadline(task) - now;
  if (diff < 0) return 'overdue';
  if (diff <= SOON_WINDOW_MS) return 'soon';
  return 'normal';
}

function getPendingTasks() {
  return state.tasks.filter((task) => task.status !== 'done');
}

function isDoneOn(task, dateKey) {
  return task.status === 'done' && task.completedAt && isoToDateKey(task.completedAt) === dateKey;
}

// Время учёбы за день: фактические минуты сессий + оценка заданий, выполненных вне сессий
function getStudyMinutesOn(dateKey) {
  const sessionMinutes = state.sessions
    .filter((session) => isoToDateKey(session.endedAt) === dateKey)
    .reduce((sum, session) => sum + session.spentSeconds / 60, 0);
  const taskMinutes = state.tasks
    .filter((task) => isDoneOn(task, dateKey) && !task.completedInSession)
    .reduce((sum, task) => sum + task.duration, 0);
  return sessionMinutes + taskMinutes;
}

function getActivityDayKeys() {
  const days = new Set();
  state.tasks.forEach((task) => {
    if (task.status === 'done' && task.completedAt) days.add(isoToDateKey(task.completedAt));
  });
  state.sessions.forEach((session) => {
    if (session.spentSeconds >= 60 || session.completedTaskIds.length) days.add(isoToDateKey(session.endedAt));
  });
  return days;
}

function computeStreaks(now = new Date()) {
  const days = getActivityDayKeys();
  let current = 0;
  let cursor = startOfDay(now);
  if (!days.has(toDateKey(cursor))) cursor = addDays(cursor, -1);
  while (days.has(toDateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let previous = null;
  [...days].sort().forEach((key) => {
    const date = parseDateKey(key);
    run = previous && calendarDayDiff(previous, date) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  });

  return { current, best: Math.max(best, current), days };
}

function computeDayProgress(now = new Date()) {
  const todayKey = toDateKey(now);
  const doneToday = state.tasks.filter((task) => isDoneOn(task, todayKey)).length;
  const plan = buildDailyPlan(now);
  const planned = plan.doNow.length;
  const total = doneToday + planned;
  const percent = total ? Math.round((doneToday / total) * 100) : 0;
  return { doneToday, planned, total, percent, plan };
}

function computeStats(now = new Date()) {
  const total = state.tasks.length;
  const doneTasks = state.tasks.filter((task) => task.status === 'done' && task.completedAt);
  const done = doneTasks.length;
  const overdue = state.tasks.filter((task) => getTaskState(task, now) === 'overdue').length;
  const weekStart = addDays(startOfDay(now), -6);
  const weekDone = doneTasks.filter((task) => new Date(task.completedAt) >= weekStart).length;
  const onTime = doneTasks.filter((task) => new Date(task.completedAt) <= getTaskDeadline(task)).length;
  const sessionSeconds = state.sessions.reduce((sum, session) => sum + session.spentSeconds, 0);
  const outsideMinutes = doneTasks
    .filter((task) => !task.completedInSession)
    .reduce((sum, task) => sum + task.duration, 0);

  const last7 = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = addDays(startOfDay(now), -offset);
    const key = toDateKey(date);
    last7.push({
      date,
      key,
      count: doneTasks.filter((task) => isoToDateKey(task.completedAt) === key).length,
      minutes: getStudyMinutesOn(key),
    });
  }

  const weekdayCounts = Array(7).fill(0);
  doneTasks.forEach((task) => {
    weekdayCounts[weekdayIndex(new Date(task.completedAt))] += 1;
  });

  const bySubject = state.subjects
    .map((subject) => {
      const list = state.tasks.filter((task) => task.subjectId === subject.id);
      return { subject, total: list.length, done: list.filter((task) => task.status === 'done').length };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || b.done - a.done);

  return {
    total,
    done,
    pending: total - done,
    overdue,
    completionRate: total ? Math.round((done / total) * 100) : 0,
    weekDone,
    onTime,
    studyMinutes: sessionSeconds / 60 + outsideMinutes,
    sessionMinutes: sessionSeconds / 60,
    sessionsCount: state.sessions.length,
    streak: computeStreaks(now),
    last7,
    weekdayCounts,
    bySubject,
  };
}

/* ==========================================================================
   6. Умный планировщик
   Оценка задания (0–100) = срочность (до 50) + приоритет (до 25)
   + сложность (до 10) + быстрая победа (до 10) + риск (5).
   ========================================================================== */

function getUrgencyPoints(hoursLeft) {
  if (hoursLeft < 0) return 50;
  if (hoursLeft <= 12) return 45;
  if (hoursLeft <= 24) return 40;
  if (hoursLeft <= 48) return 30;
  if (hoursLeft <= 72) return 22;
  if (hoursLeft <= 168) return 12;
  return 5;
}

function getQuickPoints(duration) {
  if (duration <= 15) return 10;
  if (duration <= 30) return 7;
  if (duration <= 60) return 4;
  return 2;
}

function scoreTask(task, now = new Date()) {
  const deadline = getTaskDeadline(task);
  const hoursLeft = (deadline - now) / HOUR_MS;
  const urgency = getUrgencyPoints(hoursLeft);
  const priority = PRIORITY[task.priority].points;
  const difficulty = DIFFICULTY[task.difficulty].points;
  const quick = getQuickPoints(task.duration);
  const risk = task.difficulty === 'hard' && hoursLeft >= 0 && hoursLeft <= 48 ? 5 : 0;
  return {
    total: urgency + priority + difficulty + quick + risk,
    urgency,
    priority,
    difficulty,
    quick,
    risk,
    hoursLeft,
    deadline,
  };
}

function rankTasks(tasks, now = new Date()) {
  return tasks
    .map((task) => ({ task, score: scoreTask(task, now) }))
    .sort((a, b) => b.score.total - a.score.total
      || a.score.deadline - b.score.deadline
      || a.task.duration - b.task.duration);
}

function scoreBreakdownText(score) {
  const parts = [
    `срочность ${score.urgency}`,
    `приоритет ${score.priority}`,
    `сложность ${score.difficulty}`,
    `быстрота ${score.quick}`,
  ];
  if (score.risk) parts.push(`риск ${score.risk}`);
  return `Оценка ${score.total}/100: ${parts.join(' + ')}`;
}

function getDeadlineReason(score, now) {
  if (score.hoursLeft < 0) {
    return { key: 'deadline', text: 'срок сдачи уже прошёл — лучше закрыть задание как можно скорее', short: 'Просрочено', tone: 'danger' };
  }
  const days = calendarDayDiff(now, score.deadline);
  if (days === 0) return { key: 'deadline', text: 'задание нужно сдать сегодня', short: 'Сдать сегодня', tone: 'danger' };
  if (days === 1) return { key: 'deadline', text: 'задание нужно сдать завтра', short: 'Сдать завтра', tone: 'warning' };
  if (days <= 3) {
    return { key: 'deadline', text: `до дедлайна ${countText(days, DAY_FORMS)}`, short: `Срок через ${countText(days, DAY_FORMS)}`, tone: 'accent' };
  }
  return { key: 'deadline', text: `срок только через ${countText(days, DAY_FORMS)} — можно сделать заранее`, short: 'Можно сделать заранее', tone: 'neutral' };
}

// Причины выбора задания — в порядке важности для объяснения
function getTaskReasons(task, score, now = new Date()) {
  const reasons = [];
  const deadlineReason = getDeadlineReason(score, now);
  const isUrgent = score.urgency >= 30;
  if (isUrgent) reasons.push(deadlineReason);
  if (task.duration <= 20) {
    const minutesText = countText(task.duration, MINUTE_FORMS);
    reasons.push({ key: 'quick', text: `на выполнение потребуется всего ${minutesText}`, follow: `на выполнение потребуется всего ${minutesText}`, short: `Всего ${task.duration} мин`, tone: 'success' });
  }
  if (task.priority === 'high') {
    reasons.push({ key: 'priority', text: 'у задания высокий приоритет', follow: 'у него высокий приоритет', short: 'Высокий приоритет', tone: 'accent' });
  }
  if (score.risk) {
    reasons.push({ key: 'hard', text: 'задание сложное — лучше начать, пока есть силы', follow: 'оно сложное — лучше начать, пока есть силы', short: 'Сложное — не откладывать', tone: 'warning' });
  }
  if (!isUrgent) reasons.push(deadlineReason);
  return reasons;
}

function joinReasons(reasons) {
  const [first, second] = reasons;
  if (!first) return '';
  if (!second) return first.text;
  const connector = second.key === 'priority' ? ', и ' : ', а ';
  return `${first.text}${connector}${second.follow || second.text}`;
}

function subjectStartPhrase(subject) {
  return subject.gen ? `Начни с ${subject.gen}` : `Начни с задания по предмету «${subject.name}»`;
}

function buildRecommendation(item, now = new Date()) {
  const subject = getSubject(item.task.subjectId);
  const reasons = getTaskReasons(item.task, item.score, now);
  return `${subjectStartPhrase(subject)}: ${joinReasons(reasons)}.`;
}

// План на день: задания по убыванию оценки, пока хватает оставшегося времени
function buildDailyPlan(now = new Date()) {
  const budget = state.settings.dailyMinutes;
  const studied = Math.round(getStudyMinutesOn(toDateKey(now)));
  const available = Math.max(0, budget - studied);
  const ranked = rankTasks(getPendingTasks(), now);
  const doNow = [];
  const later = [];
  let used = 0;

  ranked.forEach((item) => {
    if (used + item.task.duration <= available) {
      doNow.push(item);
      used += item.task.duration;
    } else {
      later.push(item);
    }
  });

  const urgentLater = later.filter((item) => item.score.hoursLeft < 24);
  return {
    budget,
    studied,
    available,
    used,
    free: available - used,
    doNow,
    later,
    urgentLater,
    rankedCount: ranked.length,
  };
}

function getLaterReason(item, plan, now) {
  const needed = item.task.duration;
  if (plan.available <= 0) return 'Время на учёбу сегодня уже использовано — можно сделать завтра.';
  if (item.score.hoursLeft < 0) {
    return `Просрочено, но нужно ${needed} мин, а свободно ${plan.free} мин. Найди время или договорись с учителем.`;
  }
  if (item.score.hoursLeft < 24) {
    return `Срок близко, но нужно ${needed} мин, а свободно только ${plan.free} мин.`;
  }
  return `Нужно ${needed} мин — сегодня не помещается. Срок: ${formatDeadline(item.score.deadline, now).toLowerCase()}, можно сделать позже.`;
}

// План на учебную сессию: только задания, которые помещаются в выбранное время
function buildSessionPlan(minutes, now = new Date()) {
  const ranked = rankTasks(getPendingTasks(), now);
  const chosen = [];
  const skipped = [];
  let used = 0;

  ranked.forEach((item) => {
    if (used + item.task.duration <= minutes) {
      chosen.push(item);
      used += item.task.duration;
    } else {
      skipped.push(item);
    }
  });

  const shortest = ranked.reduce((min, item) => Math.min(min, item.task.duration), Infinity);
  return {
    minutes,
    chosen,
    skipped,
    used,
    free: minutes - used,
    totalPending: ranked.length,
    shortest: Number.isFinite(shortest) ? shortest : 0,
  };
}

/* ==========================================================================
   7. Уведомления (внутри сайта, пока вкладка открыта)
   ========================================================================== */

function addNotification(type, title, text, key = '') {
  if (key) {
    if (state.notifiedKeys.includes(key)) return false;
    state.notifiedKeys.push(key);
    if (state.notifiedKeys.length > MAX_NOTIFIED_KEYS) state.notifiedKeys = state.notifiedKeys.slice(-MAX_NOTIFIED_KEYS);
  }
  state.notifications.unshift({
    id: createId('note'),
    type,
    title,
    text,
    createdAt: new Date().toISOString(),
    read: false,
  });
  if (state.notifications.length > MAX_NOTIFICATIONS) state.notifications.length = MAX_NOTIFICATIONS;
  return true;
}

function checkDeadlineNotifications(now = new Date()) {
  let changed = false;
  state.tasks.forEach((task) => {
    const taskState = getTaskState(task, now);
    const deadline = getTaskDeadline(task);
    const subjectName = getSubject(task.subjectId).name;
    if (taskState === 'soon') {
      changed = addNotification(
        'soon',
        'Скоро дедлайн',
        `«${task.title}» (${subjectName}) нужно сдать ${formatTimeLeft(deadline, now)}.`,
        `soon:${task.id}:${task.deadline}`,
      ) || changed;
    } else if (taskState === 'overdue') {
      changed = addNotification(
        'overdue',
        'Задание просрочено',
        `«${task.title}» (${subjectName}): срок был ${formatDeadline(deadline, now).toLowerCase()}. Лучше сдать как можно скорее.`,
        `overdue:${task.id}:${task.deadline}`,
      ) || changed;
    }
  });
  if (changed) {
    saveState();
    renderNotifications();
  }
  return changed;
}

function renderNotifications() {
  const unread = state.notifications.filter((note) => !note.read).length;
  const badge = $('#bellBadge');
  badge.hidden = unread === 0;
  badge.textContent = unread > 99 ? '99+' : String(unread);
  $('#bellBtn').setAttribute('aria-label', unread ? `Уведомления: ${unread} непрочитанных` : 'Уведомления');

  const list = $('#notifList');
  if (!state.notifications.length) {
    list.innerHTML = `<li class="notif-empty">${icon('i-bell')}<p>Пока нет уведомлений</p></li>`;
    return;
  }
  const now = new Date();
  list.innerHTML = state.notifications.map((note) => `
    <li>
      <button type="button" class="notif ${note.read ? '' : 'is-unread'}" data-action="notif-read" data-id="${escapeHtml(note.id)}">
        <span class="notif__icon notif__icon--${note.type}">${icon(NOTIFICATION_ICONS[note.type] || 'i-info')}</span>
        <span class="notif__body">
          <span class="notif__title">${escapeHtml(note.title)}${note.read ? '' : '<span class="sr-only"> (не прочитано)</span>'}</span>
          <span class="notif__text">${escapeHtml(note.text)}</span>
          <span class="notif__time">${escapeHtml(formatAgo(note.createdAt, now))}</span>
        </span>
      </button>
    </li>`).join('');
}

function toggleNotifications(force) {
  const panel = $('#notifPanel');
  const open = typeof force === 'boolean' ? force : panel.hidden;
  panel.hidden = !open;
  $('#bellBtn').setAttribute('aria-expanded', String(open));
  if (open) renderNotifications();
}

function markNotificationRead(id) {
  const note = state.notifications.find((item) => item.id === id);
  if (!note || note.read) return;
  note.read = true;
  saveState();
  renderNotifications();
}

function markAllNotificationsRead() {
  if (!state.notifications.some((note) => !note.read)) {
    showToast('Все уведомления уже прочитаны.', 'info');
    return;
  }
  state.notifications.forEach((note) => {
    note.read = true;
  });
  saveState();
  renderNotifications();
}

function clearNotifications() {
  if (!state.notifications.length) {
    showToast('Список уведомлений уже пуст.', 'info');
    return;
  }
  state.notifications = [];
  saveState();
  renderNotifications();
  showToast('Уведомления очищены.', 'success');
}

/* ==========================================================================
   8. Достижения
   ========================================================================== */

function getAchievementProgress(achievement, stats) {
  const value = Math.min(achievement.value(stats), achievement.goal);
  return { value, goal: achievement.goal, percent: Math.round((value / achievement.goal) * 100) };
}

function checkAchievements(now = new Date(), { silent = false } = {}) {
  const stats = computeStats(now);
  const unlocked = [];
  ACHIEVEMENTS.forEach((achievement) => {
    if (state.achievements[achievement.id]) return;
    if (achievement.value(stats) >= achievement.goal) {
      state.achievements[achievement.id] = new Date().toISOString();
      unlocked.push(achievement);
      addNotification('achievement', `Новое достижение: «${achievement.title}»`, `${achievement.description} — выполнено. Так держать!`);
    }
  });
  if (unlocked.length) {
    saveState();
    renderNotifications();
    if (!silent) {
      unlocked.forEach((achievement) => showToast(`Достижение открыто: «${achievement.title}»`, 'achievement'));
      launchConfetti();
    }
  }
  return unlocked;
}

/* ==========================================================================
   9. Интерфейс: тосты, диалоги, подтверждение, подсказки, конфетти
   ========================================================================== */

const TOAST_ICONS = {
  success: 'i-check-circle',
  danger: 'i-alert',
  warning: 'i-alert',
  achievement: 'i-trophy',
  info: 'i-info',
};

function showToast(message, type = 'info') {
  const stack = $('#toastStack');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'danger' ? 'alert' : 'status');
  toast.innerHTML = `
    <span class="toast__icon">${icon(TOAST_ICONS[type] || 'i-info')}</span>
    <span class="toast__text">${escapeHtml(message)}</span>
    <button type="button" class="toast__close" data-action="close-toast" aria-label="Закрыть сообщение">${icon('i-x')}</button>`;
  stack.appendChild(toast);
  while (stack.children.length > 4) stack.firstElementChild.remove();
  raiseToastStack();
  setTimeout(() => removeToast(toast), type === 'danger' ? 6500 : 4200);
}

function removeToast(toast) {
  if (!toast || !toast.isConnected || toast.classList.contains('is-leaving')) return;
  toast.classList.add('is-leaving');
  setTimeout(() => {
    toast.remove();
    if (!$('#toastStack').children.length) hideToastStack();
  }, 250);
}

// Popover выводит тосты поверх открытых модальных окон
function raiseToastStack() {
  const stack = $('#toastStack');
  if (typeof stack.showPopover !== 'function') return;
  try {
    if (stack.matches(':popover-open')) stack.hidePopover();
    stack.showPopover();
  } catch (error) {
    // Без поддержки popover тосты всё равно видны как обычный фиксированный блок
  }
}

function hideToastStack() {
  const stack = $('#toastStack');
  if (typeof stack.hidePopover !== 'function') return;
  try {
    if (stack.matches(':popover-open')) stack.hidePopover();
  } catch (error) {
    // Ничего не делаем: popover необязателен
  }
}

function openDialog(dialog) {
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDialog(dialog) {
  if (dialog && dialog.open) dialog.close();
}

function confirmAction({ title, message, confirmText = 'Подтвердить', tone = 'danger' }) {
  if (ui.confirmResolver) settleConfirm(false);
  $('#confirmTitle').textContent = title;
  $('#confirmMessage').textContent = message;
  const yesButton = $('#confirmYesBtn');
  yesButton.textContent = confirmText;
  yesButton.className = `btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`;
  $('#confirmIcon').className = `confirm__icon ${tone === 'danger' ? '' : 'confirm__icon--primary'}`;
  return new Promise((resolve) => {
    ui.confirmResolver = resolve;
    openDialog($('#confirmDialog'));
  });
}

function settleConfirm(result) {
  const resolve = ui.confirmResolver;
  ui.confirmResolver = null;
  closeDialog($('#confirmDialog'));
  if (resolve) resolve(result);
}

function showTooltip(target) {
  const tooltip = $('#chartTooltip');
  tooltip.textContent = target.dataset.tip;
  tooltip.hidden = false;
  const rect = target.getBoundingClientRect();
  const halfWidth = tooltip.offsetWidth / 2;
  const left = clamp(rect.left + rect.width / 2, halfWidth + 8, window.innerWidth - halfWidth - 8);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(rect.top, tooltip.offsetHeight + 16)}px`;
}

function hideTooltip() {
  $('#chartTooltip').hidden = true;
}

function launchConfetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.querySelector('dialog[open]') || document.body;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  const colors = ['var(--accent)', 'var(--accent-2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c2)'];
  for (let index = 0; index < 40; index += 1) {
    const piece = document.createElement('span');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 180)}px`);
    piece.style.setProperty('--spin', `${Math.round(Math.random() * 720 - 360)}deg`);
    layer.appendChild(piece);
  }
  host.appendChild(layer);
  setTimeout(() => layer.remove(), 2400);
}

function emptyStateHtml({ iconName, title, text, action = '', actionText = '', tag = 'div' }) {
  const button = action
    ? `<button type="button" class="btn btn--primary btn--sm" data-action="${action}">${icon('i-plus')}${escapeHtml(actionText)}</button>`
    : '';
  return `<${tag} class="empty">
      <div class="empty__icon">${icon(iconName)}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
      ${button}
    </${tag}>`;
}

function checkButton(task, action = 'toggle-task') {
  const done = task.status === 'done';
  const label = done ? 'Вернуть в невыполненные' : 'Отметить выполненным';
  return `<button type="button" class="check-btn ${done ? 'is-checked' : ''}" data-action="${action}" data-id="${escapeHtml(task.id)}" aria-pressed="${done}" aria-label="${label}: ${escapeHtml(task.title)}">${icon('i-check')}</button>`;
}

/* --- Валидация форм: общие функции --- */

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}Error`);
  if (input) {
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  if (error) error.textContent = message;
}

function clearFormErrors(form) {
  $$('[aria-invalid]', form).forEach((element) => element.removeAttribute('aria-invalid'));
  $$('.field__error', form).forEach((element) => {
    element.textContent = '';
  });
}

function focusFirstInvalid(form) {
  const invalid = $('[aria-invalid="true"]', form);
  if (invalid) invalid.focus();
}

/* ==========================================================================
   10. Навигация
   ========================================================================== */

function getPageFromHash() {
  const page = location.hash.replace('#', '');
  return PAGES.includes(page) ? page : 'home';
}

function navigate(page) {
  if (location.hash === `#${page}`) showPage(page);
  else location.hash = page;
}

function updatePageTitle() {
  const session = state.activeSession;
  const base = ui.page === 'home' ? 'StudyBoost — умный помощник школьника' : `${PAGE_TITLES[ui.page]} · StudyBoost`;
  if (session && session.running) {
    const remaining = session.plannedMinutes * MINUTE_MS - getSessionElapsed(session);
    document.title = `${formatClock(remaining)} · ${base}`;
  } else {
    document.title = base;
  }
}

function showPage(page) {
  const changed = ui.page !== page;
  ui.page = page;
  $$('.page').forEach((section) => {
    section.hidden = section.dataset.page !== page;
  });
  $$('[data-nav]').forEach((link) => {
    if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (page === 'stats') markTour('stats');
  if (page === 'home' && state.tour.add) markTour('plan');
  toggleNotifications(false);
  hideTooltip();
  renderPage(page, false);
  updatePageTitle();
  if (changed) window.scrollTo(0, 0);
}

function renderPage(page, soft = false) {
  if (page === 'home') renderHome();
  else if (page === 'tasks') renderTasks();
  else if (page === 'schedule') renderSchedule();
  else if (page === 'stats') renderStats();
  else if (page === 'settings') renderSettings(!soft);
}

// Перерисовать всё, что зависит от данных, после любого изменения
function refresh() {
  hideTooltip();
  renderPage(ui.page, true);
  renderNotifications();
  updateMiniTimer();
  if ($('#focusDialog').open && ui.focus.view === 'run') renderFocusRun();
}

function markTour(step) {
  if (state.tour[step]) return;
  state.tour[step] = true;
  saveState();
  if (TOUR_STEPS.every((item) => state.tour[item.id])) {
    showToast('Демо-сценарий пройден целиком. StudyBoost готов к работе!', 'success');
  }
  if (ui.page === 'home') renderTourCard();
}

/* ==========================================================================
   11. Главная страница
   ========================================================================== */

function renderHome(now = new Date()) {
  const progress = computeDayProgress(now);
  renderDemoBanner();
  renderHero(now, progress);
  renderHomeKpis(now, progress);
  renderTodayPlan(now, progress.plan);
  renderNextStep(now, progress.plan);
  renderDeadlineCard(now);
  renderTourCard();
}

function renderDemoBanner() {
  $('#demoBanner').hidden = !hasDemoData();
}

function getDayOfYear(date) {
  return calendarDayDiff(new Date(date.getFullYear(), 0, 1), date);
}

function renderHero(now, progress) {
  const hour = now.getHours();
  let greeting = 'Добрый вечер';
  if (hour < 5) greeting = 'Доброй ночи';
  else if (hour < 12) greeting = 'Доброе утро';
  else if (hour < 18) greeting = 'Добрый день';

  const { name, grade } = state.settings;
  $('#heroGreeting').textContent = name ? `${greeting}, ${name}!` : `${greeting}!`;
  $('#heroDate').textContent = `${capitalize(fmtFullDate.format(now))}${grade ? ` · ${grade} класс` : ''}`;

  const plan = progress.plan;
  let summary;
  if (!state.tasks.length) {
    summary = 'Добавь домашние задания — StudyBoost подскажет, с чего начать и как всё успеть.';
  } else if (!plan.rankedCount) {
    summary = 'Все задания выполнены. Отличная работа — можно отдохнуть!';
  } else if (plan.doNow.length) {
    summary = `В плане на сегодня ${countText(plan.doNow.length, TASK_FORMS)} на ${formatMinutes(plan.used)}. Начни с первого — дальше будет легче.`;
  } else {
    summary = 'На сегодня свободное время закончилось или задания слишком большие — загляни в план ниже.';
  }
  $('#heroSummary').textContent = summary;
  $('#tipOfDay').textContent = TIPS[getDayOfYear(now) % TIPS.length];
}

function kpiHtml({ iconName, tone, label, value, sub }) {
  return `<article class="kpi">
      <div class="kpi__icon kpi__icon--${tone}">${icon(iconName)}</div>
      <div class="kpi__body">
        <p class="kpi__label">${escapeHtml(label)}</p>
        <p class="kpi__value">${value}</p>
        <p class="kpi__sub">${escapeHtml(sub)}</p>
      </div>
    </article>`;
}

function ringHtml(percent) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamp(percent, 0, 100) / 100) * circumference;
  return `<div class="ring" aria-hidden="true">
      <svg viewBox="0 0 64 64">
        <circle class="ring__track" cx="32" cy="32" r="${radius}"></circle>
        <circle class="ring__bar" cx="32" cy="32" r="${radius}" style="stroke-dasharray: ${filled.toFixed(2)} ${circumference.toFixed(2)}"></circle>
      </svg>
      <span class="ring__text">${percent}%</span>
    </div>`;
}

function renderHomeKpis(now, progress) {
  const todayKey = toDateKey(now);
  const dueToday = state.tasks.filter((task) => task.deadline.slice(0, 10) === todayKey);
  const dueTodayLeft = dueToday.filter((task) => task.status !== 'done').length;
  const overdue = state.tasks.filter((task) => getTaskState(task, now) === 'overdue').length;
  const doneTotal = state.tasks.filter((task) => task.status === 'done').length;
  const studied = getStudyMinutesOn(todayKey);

  const progressSub = progress.total
    ? `${progress.doneToday} из ${progress.total} по плану · ${formatMinutes(studied)} учёбы`
    : `${formatMinutes(studied)} учёбы сегодня`;

  $('#homeKpis').innerHTML = [
    kpiHtml({
      iconName: 'i-calendar',
      tone: 'accent',
      label: 'Заданий на сегодня',
      value: dueToday.length,
      sub: dueToday.length ? `осталось сделать: ${dueTodayLeft}` : 'со сроком сдачи сегодня',
    }),
    kpiHtml({
      iconName: 'i-check-circle',
      tone: 'success',
      label: 'Выполнено сегодня',
      value: progress.doneToday,
      sub: `всего выполнено: ${doneTotal}`,
    }),
    kpiHtml({
      iconName: 'i-alert',
      tone: overdue ? 'danger' : 'neutral',
      label: 'Просрочено',
      value: overdue,
      sub: overdue ? 'лучше сдать как можно скорее' : 'отлично, долгов нет',
    }),
    `<article class="kpi">
      ${ringHtml(progress.percent)}
      <div class="kpi__body">
        <p class="kpi__label">Прогресс за день</p>
        <p class="kpi__value">${progress.percent}<small>%</small></p>
        <p class="kpi__sub">${escapeHtml(progressSub)}</p>
      </div>
    </article>`,
  ].join('');
}

function ensureBudgetOption() {
  const select = $('#planBudget');
  const value = String(state.settings.dailyMinutes);
  if (!$$('option', select).some((option) => option.value === value)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = formatMinutes(state.settings.dailyMinutes);
    option.dataset.custom = 'true';
    select.appendChild(option);
  }
  $$('option[data-custom]', select).forEach((option) => {
    if (option.value !== value) option.remove();
  });
  select.value = value;
}

function planItemHtml(item, index, now) {
  const { task, score } = item;
  const subject = getSubject(task.subjectId);
  const reasons = getTaskReasons(task, score, now);
  const taskState = getTaskState(task, now);
  const breakdown = scoreBreakdownText(score);
  return `<li class="plan-item">
      <span class="plan-item__num" aria-hidden="true">${index + 1}</span>
      <div class="plan-item__main">
        <div class="plan-item__top">
          ${subjectTag(subject)}
          <span class="meta">${icon('i-hourglass')}${task.duration} мин</span>
          <span class="score" tabindex="0" data-tip="${escapeHtml(breakdown)}" aria-label="${escapeHtml(breakdown)}">${score.total}</span>
        </div>
        <p class="plan-item__title">${escapeHtml(task.title)}</p>
        <p class="plan-item__deadline plan-item__deadline--${taskState}">${icon('i-clock')}${escapeHtml(formatDeadline(score.deadline, now))} · ${escapeHtml(formatTimeLeft(score.deadline, now))}</p>
        <div class="reason-tags">${reasons.slice(0, 3).map((reason) => `<span class="reason-tag reason-tag--${reason.tone}">${escapeHtml(reason.short)}</span>`).join('')}</div>
      </div>
      ${checkButton(task)}
    </li>`;
}

function renderTodayPlan(now, plan) {
  ensureBudgetOption();
  const container = $('#todayPlan');

  if (!state.tasks.length) {
    container.innerHTML = emptyStateHtml({
      iconName: 'i-list',
      title: 'Пока нет заданий',
      text: 'Добавь первое домашнее задание — StudyBoost сразу составит план на сегодня.',
      action: 'add-task',
      actionText: 'Добавить задание',
    });
    return;
  }
  if (!plan.rankedCount) {
    container.innerHTML = emptyStateHtml({
      iconName: 'i-trophy',
      title: 'Все задания выполнены!',
      text: 'Отличная работа. Можно отдохнуть или добавить новые задания.',
      action: 'add-task',
      actionText: 'Добавить задание',
    });
    return;
  }

  const percentOf = (value) => (plan.budget ? Math.min(100, (value / plan.budget) * 100) : 0);
  const studiedRounded = Math.round(plan.studied);
  let html = `<div class="budget-bar">
      <div class="budget-bar__track" role="img" aria-label="Сегодня: уже позанимался ${studiedRounded} мин, в плане ${plan.used} мин из ${plan.budget} мин">
        <span class="budget-bar__done" style="width: ${percentOf(studiedRounded)}%"></span>
        <span class="budget-bar__plan" style="width: ${percentOf(plan.used)}%"></span>
      </div>
      <div class="budget-bar__legend">
        <span><i class="legend-dot legend-dot--done"></i>Уже позанимался: ${formatMinutes(studiedRounded)}</span>
        <span><i class="legend-dot legend-dot--plan"></i>В плане: ${formatMinutes(plan.used)}</span>
        <span><i class="legend-dot"></i>Свободно: ${formatMinutes(Math.max(0, plan.free))}</span>
      </div>
    </div>`;

  if (plan.doNow.length) {
    html += `<ol class="plan-list">${plan.doNow.map((item, index) => planItemHtml(item, index, now)).join('')}</ol>`;
  } else if (plan.available <= 0) {
    html += `<div class="alert alert--success">${icon('i-trophy')}<div><strong>Дневная цель по времени выполнена!</strong> Ты уже позанимался ${formatMinutes(studiedRounded)}. Если хочешь продолжить, увеличь время на учёбу.</div></div>`;
  } else {
    html += `<div class="alert alert--info">${icon('i-info')}<div><strong>Ни одно задание не помещается в оставшиеся ${formatMinutes(plan.available)}.</strong> Увеличь время на учёбу или разбей большое задание на маленькие шаги.</div></div>`;
  }

  if (plan.urgentLater.length) {
    const urgentMinutes = plan.urgentLater.reduce((sum, item) => sum + item.task.duration, 0);
    html += `<div class="alert alert--warning">${icon('i-alert')}<div><strong>Честно: сегодня всё срочное не помещается.</strong> Ещё ${countText(plan.urgentLater.length, TASK_FORMS)} со сроком меньше суток требуют ${formatMinutes(urgentMinutes)}. Увеличь время на учёбу или заранее предупреди учителя.</div></div>`;
  }

  if (plan.later.length) {
    const visible = plan.later.slice(0, 5);
    html += `<div class="plan-later">
        <h3>${icon('i-calendar')}Лучше оставить на потом · ${plan.later.length}</h3>
        <ul class="later-list">
          ${visible.map((item) => `<li class="later-item ${item.score.hoursLeft < 24 ? 'later-item--urgent' : ''}">
              ${subjectTag(getSubject(item.task.subjectId))}
              <div class="later-item__body">
                <strong>${escapeHtml(item.task.title)}</strong>
                <span>${escapeHtml(getLaterReason(item, plan, now))}</span>
              </div>
            </li>`).join('')}
        </ul>
        ${plan.later.length > visible.length ? `<p class="muted-note">И ещё ${countText(plan.later.length - visible.length, TASK_FORMS)} — полный список в разделе «Мои задания».</p>` : ''}
      </div>`;
  }

  container.innerHTML = html;
}

function renderNextStep(now, plan) {
  const container = $('#nextStep');
  const item = plan.doNow[0] || rankTasks(getPendingTasks(), now)[0];
  if (!item) {
    container.innerHTML = `<p class="next-step__reason">Невыполненных заданий нет. Самое время отдохнуть или заранее записать следующее задание.</p>
      <div class="next-step__actions"><button type="button" class="btn btn--primary btn--sm" data-action="add-task">${icon('i-plus')}Добавить задание</button></div>`;
    return;
  }
  const subject = getSubject(item.task.subjectId);
  container.innerHTML = `
    <div class="next-step__top">${subjectTag(subject)}<span class="meta">${icon('i-hourglass')}${item.task.duration} мин</span></div>
    <h3 class="next-step__title">${escapeHtml(item.task.title)}</h3>
    <p class="next-step__reason">${escapeHtml(buildRecommendation(item, now))}</p>
    <div class="next-step__actions">
      <button type="button" class="btn btn--primary btn--sm" data-action="toggle-task" data-id="${escapeHtml(item.task.id)}">${icon('i-check')}Выполнено</button>
      <button type="button" class="btn btn--soft btn--sm" data-action="open-focus">${icon('i-bolt')}Учебная сессия</button>
    </div>`;
}

function renderDeadlineCard(now) {
  const container = $('#deadlineInfo');
  const pending = getPendingTasks();
  const upcoming = pending
    .filter((task) => getTaskDeadline(task) >= now)
    .sort((a, b) => getTaskDeadline(a) - getTaskDeadline(b));
  const overdueCount = pending.length - upcoming.length;
  const next = upcoming[0];
  let html = '';

  if (next) {
    const deadline = getTaskDeadline(next);
    const taskState = getTaskState(next, now);
    html += `<div class="deadline deadline--${taskState}">
        ${subjectTag(getSubject(next.subjectId))}
        <h3 class="deadline__title">${escapeHtml(next.title)}</h3>
        <p class="deadline__countdown"><small>осталось</small>${escapeHtml(formatSpan(deadline - now))}</p>
        <p class="deadline__when">${icon('i-calendar')}${escapeHtml(formatDeadline(deadline, now))}</p>
      </div>`;
  } else {
    html += '<p class="muted-note">Ближайших дедлайнов нет. Можно спокойно планировать новые дела.</p>';
  }

  if (overdueCount) {
    html += `<button type="button" class="alert alert--danger alert--button" data-action="show-overdue">${icon('i-alert')}<span>Просрочено: ${countText(overdueCount, TASK_FORMS)} — показать</span></button>`;
  }
  container.innerHTML = html;
}

function renderTourCard() {
  const card = $('#tourCard');
  card.hidden = state.tour.hidden;
  if (state.tour.hidden) return;
  const doneCount = TOUR_STEPS.filter((step) => state.tour[step.id]).length;
  $('#tourCount').textContent = `${doneCount} из ${TOUR_STEPS.length}`;
  $('#tourProgress').style.width = `${Math.round((doneCount / TOUR_STEPS.length) * 100)}%`;
  $('#tourList').innerHTML = TOUR_STEPS.map((step, index) => {
    const done = state.tour[step.id];
    return `<li class="tour-step ${done ? 'is-done' : ''}">
        <span class="tour-step__mark" aria-hidden="true">${done ? icon('i-check') : index + 1}</span>
        <span>${escapeHtml(step.text)}<span class="sr-only">${done ? ' — выполнено' : ' — не выполнено'}</span></span>
      </li>`;
  }).join('');
}

function handleBudgetChange(event) {
  const minutes = Number(event.target.value);
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 720) return;
  state.settings.dailyMinutes = minutes;
  saveState();
  renderHome();
  showToast(`Время на учёбу сегодня: ${formatMinutes(minutes)}. План пересчитан.`, 'info');
}

/* ==========================================================================
   12. Мои задания: список, фильтры, форма
   ========================================================================== */

function renderTasks() {
  const now = new Date();
  renderSubjectFilterOptions();
  syncFilterControls();
  renderStatusChips(now);
  renderTaskList(now);
}

function renderSubjectFilterOptions() {
  const select = $('#filterSubject');
  if (ui.filters.subject !== 'all' && !state.subjects.some((subject) => subject.id === ui.filters.subject)) {
    ui.filters.subject = 'all';
  }
  select.innerHTML = '<option value="all">Все предметы</option>'
    + state.subjects.map((subject) => `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`).join('');
  select.value = ui.filters.subject;
}

function syncFilterControls() {
  const search = $('#taskSearch');
  if (search.value !== ui.filters.search) search.value = ui.filters.search;
  $('#filterPriority').value = ui.filters.priority;
  $('#sortTasks').value = ui.filters.sort;
}

function matchesStatusFilter(task, status, now) {
  const taskState = getTaskState(task, now);
  if (status === 'pending') return taskState !== 'done';
  if (status === 'all') return true;
  return taskState === status;
}

function renderStatusChips(now) {
  $('#statusChips').innerHTML = STATUS_FILTERS.map((filter) => {
    const count = state.tasks.filter((task) => matchesStatusFilter(task, filter.value, now)).length;
    const pressed = ui.filters.status === filter.value;
    return `<button type="button" class="chip" data-action="filter-status" data-value="${filter.value}" aria-pressed="${pressed}">${filter.label}<span class="chip__count">${count}</span></button>`;
  }).join('');
}

function getFilteredTasks(now) {
  const { search, subject, status, priority, sort } = ui.filters;
  const query = search.trim().toLowerCase();
  const filtered = state.tasks.filter((task) => {
    if (subject !== 'all' && task.subjectId !== subject) return false;
    if (priority !== 'all' && task.priority !== priority) return false;
    if (!matchesStatusFilter(task, status, now)) return false;
    if (query) {
      const haystack = `${task.title} ${task.description} ${getSubject(task.subjectId).name}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  return sortTasks(filtered, sort, now);
}

function sortTasks(tasks, sort, now) {
  const scores = new Map();
  const getScore = (task) => {
    if (!scores.has(task.id)) scores.set(task.id, scoreTask(task, now).total);
    return scores.get(task.id);
  };
  const byDeadline = (a, b) => getTaskDeadline(a) - getTaskDeadline(b);
  const comparators = {
    smart: (a, b) => getScore(b) - getScore(a) || byDeadline(a, b),
    'deadline-asc': byDeadline,
    'deadline-desc': (a, b) => byDeadline(b, a),
    'duration-asc': (a, b) => a.duration - b.duration || byDeadline(a, b),
    'duration-desc': (a, b) => b.duration - a.duration || byDeadline(a, b),
  };
  const compare = comparators[sort] || comparators.smart;
  // Выполненные задания всегда ниже невыполненных
  return [...tasks].sort((a, b) => {
    const doneDiff = Number(a.status === 'done') - Number(b.status === 'done');
    if (doneDiff) return doneDiff;
    if (sort === 'smart' && a.status === 'done') return new Date(b.completedAt) - new Date(a.completedAt);
    return compare(a, b);
  });
}

function taskCardHtml(task, now) {
  const subject = getSubject(task.subjectId);
  const deadline = getTaskDeadline(task);
  const taskState = getTaskState(task, now);
  const status = TASK_STATUS[taskState];
  let timeInfo;
  if (task.status === 'done' && task.completedAt) {
    const completedAt = new Date(task.completedAt);
    timeInfo = `Выполнено ${formatDeadline(completedAt, now).toLowerCase()} · ${completedAt <= deadline ? 'вовремя' : 'после срока'}`;
  } else {
    timeInfo = formatTimeLeft(deadline, now);
  }
  const titleAttr = escapeHtml(task.title);
  return `<li class="task-card task-card--${taskState}">
      ${checkButton(task)}
      <div class="task-card__body">
        <div class="task-card__head">
          <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
          <span class="status-badge status-badge--${taskState}">${icon(status.icon)}${status.label}</span>
        </div>
        <div class="task-card__meta">
          ${subjectTag(subject)}
          <span class="meta">${icon('i-calendar')}${escapeHtml(formatDeadline(deadline, now))}</span>
          <span class="meta meta--${taskState}">${icon('i-clock')}${escapeHtml(timeInfo)}</span>
          <span class="meta">${icon('i-hourglass')}${formatMinutes(task.duration)}</span>
          <span class="meta">${icon('i-target')}Сложность: ${DIFFICULTY[task.difficulty].label.toLowerCase()}</span>
          <span class="meta">${icon('i-flag')}Приоритет: ${PRIORITY[task.priority].label.toLowerCase()}</span>
          ${task.demo ? '<span class="demo-tag">демо</span>' : ''}
        </div>
        ${task.description ? `<p class="task-card__desc">${escapeHtml(task.description)}</p>` : ''}
      </div>
      <div class="task-card__actions">
        <button type="button" class="icon-btn icon-btn--sm icon-btn--ghost" data-action="edit-task" data-id="${escapeHtml(task.id)}" aria-label="Редактировать: ${titleAttr}">${icon('i-edit')}</button>
        <button type="button" class="icon-btn icon-btn--sm icon-btn--ghost icon-btn--danger" data-action="delete-task" data-id="${escapeHtml(task.id)}" aria-label="Удалить: ${titleAttr}">${icon('i-trash')}</button>
      </div>
    </li>`;
}

function renderTaskList(now = new Date()) {
  const list = $('#taskList');
  const tasks = getFilteredTasks(now);
  const done = state.tasks.filter((task) => task.status === 'done').length;
  $('#tasksSummary').textContent = state.tasks.length
    ? `Всего ${countText(state.tasks.length, TASK_FORMS)} · активных ${state.tasks.length - done} · выполнено ${done}`
    : 'Здесь будут все твои домашние задания';
  $('#tasksResultCount').textContent = state.tasks.length ? `Показано: ${tasks.length} из ${state.tasks.length}` : '';

  if (!state.tasks.length) {
    list.innerHTML = emptyStateHtml({
      iconName: 'i-list',
      title: 'Список заданий пуст',
      text: 'Добавь домашнее задание: предмет, срок и примерное время. StudyBoost сам подскажет, с чего начать.',
      action: 'add-task',
      actionText: 'Добавить задание',
      tag: 'li',
    });
    return;
  }
  if (!tasks.length) {
    list.innerHTML = `<li class="empty">
        <div class="empty__icon">${icon('i-search')}</div>
        <h3>Ничего не найдено</h3>
        <p>Попробуй изменить поиск или сбросить фильтры.</p>
        <button type="button" class="btn btn--ghost btn--sm" data-action="reset-filters">${icon('i-refresh')}Сбросить фильтры</button>
      </li>`;
    return;
  }
  list.innerHTML = tasks.map((task) => taskCardHtml(task, now)).join('');
}

function resetTaskFilters() {
  ui.filters = { ...DEFAULT_FILTERS };
  renderTasks();
}

function showOverdueTasks() {
  ui.filters = { ...DEFAULT_FILTERS, status: 'overdue' };
  navigate('tasks');
}

/* --- Добавление, редактирование, выполнение и удаление заданий --- */

function fillSubjectSelect(select, selectedId, { withCustom = false } = {}) {
  select.innerHTML = state.subjects
    .map((subject) => `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`)
    .join('') + (withCustom ? `<option value="${CUSTOM_SUBJECT_VALUE}">＋ Свой предмет…</option>` : '');
  select.value = state.subjects.some((subject) => subject.id === selectedId) ? selectedId : state.subjects[0].id;
}

function firstLessonTimeOn(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  const lessons = getLessonsForDay(weekdayIndex(date) + 1);
  return lessons.length ? lessons[0].start : null;
}

function openTaskForm(taskId = null, preset = {}) {
  const task = taskId ? findTask(taskId) : null;
  if (taskId && !task) {
    showToast('Задание не найдено — возможно, оно уже удалено.', 'danger');
    return;
  }
  const form = $('#taskForm');
  form.reset();
  clearFormErrors(form);
  ui.editingTaskId = task ? task.id : null;
  $('#taskDialogTitle').textContent = task ? 'Редактировать задание' : 'Новое задание';
  $('#taskSubmitBtn').textContent = task ? 'Сохранить изменения' : 'Добавить задание';

  const now = new Date();
  const presetDate = preset.dateKey && parseDateKey(preset.dateKey) ? preset.dateKey : null;
  const defaultDeadline = presetDate
    ? joinDateTime(presetDate, firstLessonTimeOn(presetDate) || '08:00')
    : joinDateTime(toDateKey(addDays(now, 1)), '08:00');
  const source = task || {
    title: '',
    subjectId: ui.lastSubjectId || state.subjects[0].id,
    deadline: defaultDeadline,
    duration: 20,
    difficulty: 'medium',
    priority: 'medium',
    description: '',
  };

  $('#taskTitle').value = source.title;
  fillSubjectSelect($('#taskSubject'), source.subjectId, { withCustom: true });
  $('#customSubjectField').hidden = true;
  $('#taskCustomSubject').value = '';
  const [dateKey, time] = source.deadline.split('T');
  $('#taskDate').value = dateKey;
  $('#taskTime').value = time;
  $('#taskDuration').value = String(source.duration);
  form.elements.difficulty.value = source.difficulty;
  form.elements.priority.value = source.priority;
  $('#taskDescription').value = source.description;
  updateDescriptionCounter();
  updateNextLessonHint();
  openDialog($('#taskDialog'));
  $('#taskTitle').focus();
}

function handleTaskSubjectChange() {
  const isCustom = $('#taskSubject').value === CUSTOM_SUBJECT_VALUE;
  $('#customSubjectField').hidden = !isCustom;
  setFieldError('taskSubject', '');
  if (isCustom) $('#taskCustomSubject').focus();
  else setFieldError('taskCustomSubject', '');
  updateNextLessonHint();
}

function updateDescriptionCounter() {
  $('#descCounter').textContent = String($('#taskDescription').value.length);
}

// Связь расписания с заданиями: ближайший следующий урок по предмету (начиная с завтра)
function findNextLesson(subjectId, from = new Date()) {
  const lessons = state.lessons.filter((lesson) => lesson.subjectId === subjectId);
  if (!lessons.length) return null;
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = addDays(startOfDay(from), offset);
    const dayLessons = getLessonsForDay(weekdayIndex(date) + 1).filter((lesson) => lesson.subjectId === subjectId);
    if (dayLessons.length) {
      return { date, lesson: dayLessons[0], deadline: joinDateTime(toDateKey(date), dayLessons[0].start) };
    }
  }
  return null;
}

function updateNextLessonHint() {
  const subjectId = $('#taskSubject').value;
  const hint = $('#nextLessonHint');
  const button = $('#nextLessonBtn');
  const next = subjectId && subjectId !== CUSTOM_SUBJECT_VALUE ? findNextLesson(subjectId) : null;
  button.hidden = !next;
  if (next) {
    hint.textContent = `Следующий урок по этому предмету: ${fmtWeekdayShort.format(next.date)}, ${next.lesson.start}. Можно поставить срок к нему.`;
  } else if (subjectId === CUSTOM_SUBJECT_VALUE) {
    hint.textContent = '';
  } else if (state.lessons.length) {
    hint.textContent = 'Этого предмета нет в расписании — срок укажи вручную.';
  } else {
    hint.textContent = 'Добавь расписание уроков — и срок можно будет ставить «к следующему уроку».';
  }
}

function applyDeadlinePreset(preset) {
  const now = new Date();
  let target = null;
  if (preset === 'today') {
    const evening = new Date(now);
    evening.setHours(20, 0, 0, 0);
    target = evening > now ? evening : roundUpToHalfHour(new Date(now.getTime() + HOUR_MS));
  } else if (preset === 'tomorrow') {
    target = addDays(startOfDay(now), 1);
    target.setHours(8, 0, 0, 0);
  } else if (preset === 'week') {
    target = addDays(startOfDay(now), 7);
    target.setHours(8, 0, 0, 0);
  } else if (preset === 'next-lesson') {
    const next = findNextLesson($('#taskSubject').value, now);
    if (!next) {
      showToast('Для этого предмета нет уроков в расписании.', 'warning');
      return;
    }
    target = parseLocalDateTime(next.deadline);
  }
  if (!target) return;
  $('#taskDate').value = toDateKey(target);
  $('#taskTime').value = toTimeValue(target);
  setFieldError('taskDate', '');
  setFieldError('taskTime', '');
}

function applyDurationPreset(minutes) {
  $('#taskDuration').value = String(minutes);
  setFieldError('taskDuration', '');
}

function validateSubjectName(name, { allowExisting = false } = {}) {
  if (!name) return 'Введите название предмета.';
  if (name.length < 2) return 'Название предмета — минимум 2 символа.';
  if (name.length > 30) return 'Название предмета — не длиннее 30 символов.';
  if (!allowExisting && state.subjects.some((subject) => subject.name.toLowerCase() === name.toLowerCase())) {
    return 'Такой предмет уже есть в списке.';
  }
  return '';
}

function nextFreeSubjectColor() {
  const used = new Set(state.subjects.map((subject) => subject.color));
  for (let color = 1; color <= 8; color += 1) {
    if (!used.has(color)) return color;
  }
  return 8;
}

function getOrCreateSubject(name, color = null) {
  const existing = state.subjects.find((subject) => subject.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const subject = { id: createId('subj'), name, gen: '', color: color || nextFreeSubjectColor(), custom: true };
  state.subjects.push(subject);
  return subject.id;
}

function handleTaskSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  const now = new Date();
  const editing = ui.editingTaskId ? findTask(ui.editingTaskId) : null;

  const title = $('#taskTitle').value.trim();
  const subjectValue = $('#taskSubject').value;
  const customName = $('#taskCustomSubject').value.trim();
  const dateKey = $('#taskDate').value;
  const time = $('#taskTime').value;
  const durationRaw = $('#taskDuration').value.trim();
  const duration = Number(durationRaw);
  const difficulty = form.elements.difficulty.value;
  const priority = form.elements.priority.value;
  const description = $('#taskDescription').value.trim();
  let valid = true;

  if (title.length < 2) {
    setFieldError('taskTitle', 'Введите название задания — минимум 2 символа.');
    valid = false;
  } else if (title.length > 120) {
    setFieldError('taskTitle', 'Название слишком длинное — не больше 120 символов.');
    valid = false;
  }

  if (subjectValue === CUSTOM_SUBJECT_VALUE) {
    const subjectError = validateSubjectName(customName, { allowExisting: true });
    if (subjectError) {
      setFieldError('taskCustomSubject', subjectError);
      valid = false;
    }
  } else if (!state.subjects.some((subject) => subject.id === subjectValue)) {
    setFieldError('taskSubject', 'Выберите предмет из списка.');
    valid = false;
  }

  const dateIsValid = Boolean(parseDateKey(dateKey));
  const timeIsValid = isValidTime(time);
  if (!dateIsValid) {
    setFieldError('taskDate', 'Укажите дату сдачи.');
    valid = false;
  }
  if (!timeIsValid) {
    setFieldError('taskTime', 'Укажите время сдачи.');
    valid = false;
  }

  let deadline = null;
  if (dateIsValid && timeIsValid) {
    deadline = joinDateTime(dateKey, time);
    const deadlineDate = parseLocalDateTime(deadline);
    const deadlineChanged = !editing || editing.deadline !== deadline;
    if (deadlineChanged && deadlineDate < now) {
      setFieldError('taskDate', 'Этот срок уже прошёл. Укажите будущие дату и время.');
      valid = false;
    } else if (calendarDayDiff(now, deadlineDate) > 366) {
      setFieldError('taskDate', 'Срок слишком далёкий — укажите дату в пределах года.');
      valid = false;
    }
  }

  if (!durationRaw || !Number.isInteger(duration) || duration < 5 || duration > 600) {
    setFieldError('taskDuration', 'Укажите целое число минут от 5 до 600.');
    valid = false;
  }

  if (description.length > 500) {
    setFieldError('taskDescription', 'Описание — не больше 500 символов.');
    valid = false;
  }

  if (!DIFFICULTY[difficulty] || !PRIORITY[priority]) {
    showToast('Выберите сложность и приоритет.', 'danger');
    valid = false;
  }

  if (!valid) {
    focusFirstInvalid(form);
    return;
  }

  const subjectId = subjectValue === CUSTOM_SUBJECT_VALUE ? getOrCreateSubject(customName) : subjectValue;
  const values = { title, subjectId, deadline, duration, difficulty, priority, description };

  if (editing) {
    Object.assign(editing, values);
    showToast('Изменения сохранены — план пересчитан.', 'success');
  } else {
    state.tasks.push({
      id: createId('task'),
      ...values,
      status: 'pending',
      completedAt: null,
      completedInSession: false,
      createdAt: now.toISOString(),
      demo: false,
    });
    markTour('add');
    if (ui.page === 'home') markTour('plan');
    showToast('Задание добавлено — план на сегодня обновлён.', 'success');
  }

  ui.lastSubjectId = subjectId;
  saveState();
  checkDeadlineNotifications(now);
  closeDialog($('#taskDialog'));
  refresh();
}

function toggleTask(taskId) {
  const task = findTask(taskId);
  if (!task) return;
  if (task.status === 'done') reopenTask(task);
  else completeTask(task);
}

function completeTask(task, { inSession = false } = {}) {
  const now = new Date();
  const session = state.activeSession;
  const partOfSession = Boolean(session && session.taskIds.includes(task.id));
  task.status = 'done';
  task.completedAt = now.toISOString();
  task.completedInSession = inSession || partOfSession;
  if (partOfSession && !session.completedTaskIds.includes(task.id)) session.completedTaskIds.push(task.id);

  const onTime = now <= getTaskDeadline(task);
  addNotification(
    'done',
    'Задание выполнено',
    `«${task.title}» — ${onTime ? 'сдано вовремя. Так держать!' : 'выполнено после срока, но главное — сделано!'}`,
  );
  markTour('complete');
  saveState();
  showToast(`Готово: «${task.title}»`, 'success');
  checkAchievements(now);
  refresh();
}

function reopenTask(task) {
  task.status = 'pending';
  task.completedAt = null;
  task.completedInSession = false;
  if (state.activeSession) {
    state.activeSession.completedTaskIds = state.activeSession.completedTaskIds.filter((id) => id !== task.id);
  }
  saveState();
  showToast(`«${task.title}» снова в списке невыполненных.`, 'info');
  refresh();
}

async function deleteTask(taskId) {
  const task = findTask(taskId);
  if (!task) return;
  const ok = await confirmAction({
    title: 'Удалить задание?',
    message: `«${task.title}» будет удалено без возможности восстановления.`,
    confirmText: 'Удалить',
  });
  if (!ok) return;
  state.tasks = state.tasks.filter((item) => item.id !== taskId);
  if (state.activeSession) {
    state.activeSession.taskIds = state.activeSession.taskIds.filter((id) => id !== taskId);
    state.activeSession.completedTaskIds = state.activeSession.completedTaskIds.filter((id) => id !== taskId);
  }
  saveState();
  refresh();
  showToast('Задание удалено.', 'info');
}

/* ==========================================================================
   13. Расписание
   ========================================================================== */

function getLessonsForDay(dayNumber) {
  return state.lessons
    .filter((lesson) => lesson.day === dayNumber)
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

function getTasksDueOn(dateKey) {
  return state.tasks
    .filter((task) => task.deadline.slice(0, 10) === dateKey)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

function getWeekStart() {
  return addDays(startOfWeek(new Date()), ui.weekOffset * 7);
}

function formatWeekRange(start, end) {
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${fmtDayMonth.format(end)}`;
  return `${fmtDayMonth.format(start)} – ${fmtDayMonth.format(end)}`;
}

function renderSchedule() {
  const now = new Date();
  const todayKey = toDateKey(now);
  const weekStart = getWeekStart();
  const weekEnd = addDays(weekStart, 6);
  const selected = parseDateKey(ui.selectedDayKey);

  if (!selected || selected < weekStart || selected > weekEnd) {
    ui.selectedDayKey = ui.weekOffset === 0 ? todayKey : toDateKey(weekStart);
  }

  const relative = { '-1': 'прошлая неделя', 0: 'текущая неделя', 1: 'следующая неделя' }[ui.weekOffset] || '';
  $('#weekLabel').innerHTML = `${escapeHtml(formatWeekRange(weekStart, weekEnd))}${relative ? `<small>${relative}</small>` : ''}`;
  $('#dayPicker').value = ui.selectedDayKey;

  const days = [];
  for (let index = 0; index < 7; index += 1) days.push(addDays(weekStart, index));
  $('#weekGrid').innerHTML = days.map((date) => dayCardHtml(date, now)).join('');
  renderDayDetail(now);
}

function lessonHtml(lesson, dateKey) {
  const subject = getSubject(lesson.subjectId);
  const homeworkCount = state.tasks.filter((task) => task.status !== 'done'
    && task.subjectId === lesson.subjectId
    && task.deadline.slice(0, 10) === dateKey).length;
  const label = `${subject.name}, ${lesson.start}`;
  return `<li class="lesson" style="${subjectStyle(subject)}">
      <span class="lesson__time">${lesson.start}–${lesson.end}</span>
      <span class="lesson__name">${escapeHtml(subject.name)}</span>
      ${lesson.room ? `<span class="lesson__room">каб. ${escapeHtml(lesson.room)}</span>` : ''}
      ${homeworkCount ? `<span class="hw-badge">ДЗ к уроку: ${homeworkCount}</span>` : ''}
      <span class="lesson__actions">
        <button type="button" class="mini-btn" data-action="edit-lesson" data-id="${escapeHtml(lesson.id)}" aria-label="Изменить урок: ${escapeHtml(label)}">${icon('i-edit')}</button>
        <button type="button" class="mini-btn mini-btn--danger" data-action="delete-lesson" data-id="${escapeHtml(lesson.id)}" aria-label="Удалить урок: ${escapeHtml(label)}">${icon('i-trash')}</button>
      </span>
    </li>`;
}

function dayCardHtml(date, now) {
  const key = toDateKey(date);
  const dayNumber = weekdayIndex(date) + 1;
  const dayName = WEEKDAYS[dayNumber - 1];
  const lessons = getLessonsForDay(dayNumber);
  const tasks = getTasksDueOn(key);
  const isToday = key === toDateKey(now);
  const isSelected = key === ui.selectedDayKey;

  const lessonsHtml = lessons.length
    ? `<ul class="lesson-list">${lessons.map((lesson) => lessonHtml(lesson, key)).join('')}</ul>`
    : `<p class="empty-mini">${dayNumber >= 6 ? 'Выходной' : 'Уроков нет'}</p>`;

  const tasksHtml = tasks.length
    ? `<div class="day-card__tasks">
        <p class="day-card__label">Сдать в этот день</p>
        <ul class="day-tasks">${tasks.map((task) => {
    const taskState = getTaskState(task, now);
    return `<li class="day-task"><span class="dot dot--${taskState}" aria-hidden="true"></span><span>${escapeHtml(task.title)}<span class="sr-only"> — ${TASK_STATUS[taskState].label}</span></span></li>`;
  }).join('')}</ul>
      </div>`
    : '';

  return `<article class="day-card ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}">
      <header class="day-card__head">
        <button type="button" class="day-card__title" data-action="select-day" data-date="${key}" aria-pressed="${isSelected}">
          <strong>${dayName}</strong>
          <small>${fmtDayMonth.format(date)}${isToday ? ' · сегодня' : ''}</small>
        </button>
        <button type="button" class="icon-btn icon-btn--sm icon-btn--ghost" data-action="add-lesson" data-day="${dayNumber}" aria-label="Добавить урок: ${dayName}">${icon('i-plus')}</button>
      </header>
      ${lessonsHtml}
      ${tasksHtml}
    </article>`;
}

function miniTaskHtml(task, now) {
  const taskState = getTaskState(task, now);
  const deadline = getTaskDeadline(task);
  return `<li class="mini-task ${task.status === 'done' ? 'is-done' : ''}">
      ${checkButton(task)}
      <div class="mini-task__body">
        <span class="mini-task__title">${escapeHtml(task.title)}</span>
        <span class="mini-task__meta">
          ${subjectTag(getSubject(task.subjectId))}
          <span class="meta">${icon('i-clock')}${toTimeValue(deadline)}</span>
          <span class="meta">${icon('i-hourglass')}${task.duration} мин</span>
          <span class="status-badge status-badge--${taskState}">${TASK_STATUS[taskState].label}</span>
        </span>
      </div>
    </li>`;
}

function renderDayDetail(now) {
  const date = parseDateKey(ui.selectedDayKey) || startOfDay(now);
  const key = toDateKey(date);
  const dayNumber = weekdayIndex(date) + 1;
  const lessons = getLessonsForDay(dayNumber);
  const tasks = getTasksDueOn(key);

  const lessonsHtml = lessons.length
    ? `<ul class="detail-list">${lessons.map((lesson) => {
      const subject = getSubject(lesson.subjectId);
      return `<li class="detail-lesson" style="${subjectStyle(subject)}">
            <span class="detail-lesson__time">${lesson.start}–${lesson.end}</span>
            <span class="detail-lesson__name">${escapeHtml(subject.name)}</span>
            ${lesson.room ? `<span class="detail-lesson__room">каб. ${escapeHtml(lesson.room)}</span>` : ''}
          </li>`;
    }).join('')}</ul>`
    : `<p class="empty-mini">${dayNumber >= 6 ? 'Выходной — уроков нет' : 'Уроков нет. Добавь их кнопкой «Добавить урок».'}</p>`;

  const tasksHtml = tasks.length
    ? `<ul class="detail-list">${tasks.map((task) => miniTaskHtml(task, now)).join('')}</ul>`
    : '<p class="empty-mini">Нет заданий со сроком в этот день.</p>';

  $('#dayDetail').innerHTML = `
    <div class="card__head">
      <div>
        <h2 class="card__title">${icon('i-calendar')}${escapeHtml(capitalize(fmtFullDateNoYear.format(date)))}</h2>
        <p class="card__subtitle">${countText(lessons.length, LESSON_FORMS)} · ${countText(tasks.length, TASK_FORMS)} со сроком в этот день</p>
      </div>
      <button type="button" class="btn btn--primary btn--sm" data-action="add-task-for-day" data-date="${key}">${icon('i-plus')}Задание на этот день</button>
    </div>
    <div class="day-detail__grid">
      <section>
        <h3 class="detail-title">Уроки</h3>
        ${lessonsHtml}
      </section>
      <section>
        <h3 class="detail-title">Домашние задания к этому дню</h3>
        ${tasksHtml}
      </section>
    </div>`;
}

function selectDay(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) return;
  ui.selectedDayKey = dateKey;
  ui.weekOffset = Math.round(calendarDayDiff(startOfWeek(new Date()), startOfWeek(date)) / 7);
  renderSchedule();
}

function shiftWeek(delta) {
  ui.weekOffset += delta;
  const selected = parseDateKey(ui.selectedDayKey) || new Date();
  ui.selectedDayKey = toDateKey(addDays(selected, delta * 7));
  renderSchedule();
}

function goToCurrentWeek() {
  ui.weekOffset = 0;
  ui.selectedDayKey = toDateKey(new Date());
  renderSchedule();
}

function handleDayPickerChange(event) {
  if (!event.target.value) return;
  selectDay(event.target.value);
}

function openLessonForm(lessonId = null, day = null) {
  if (!state.subjects.length) return;
  const lesson = lessonId ? state.lessons.find((item) => item.id === lessonId) : null;
  if (lessonId && !lesson) {
    showToast('Урок не найден — возможно, он уже удалён.', 'danger');
    return;
  }
  const form = $('#lessonForm');
  form.reset();
  clearFormErrors(form);
  ui.editingLessonId = lesson ? lesson.id : null;
  $('#lessonDialogTitle').textContent = lesson ? 'Изменить урок' : 'Новый урок';

  const selectedDate = parseDateKey(ui.selectedDayKey);
  const defaultDay = day || (selectedDate ? weekdayIndex(selectedDate) + 1 : 1);
  const dayNumber = lesson ? lesson.day : defaultDay;
  $('#lessonDay').value = String(dayNumber);

  let start = '08:30';
  let end = '09:15';
  if (lesson) {
    start = lesson.start;
    end = lesson.end;
  } else {
    const dayLessons = getLessonsForDay(dayNumber);
    if (dayLessons.length) {
      const nextStart = timeToMinutes(dayLessons[dayLessons.length - 1].end) + 10;
      if (nextStart + 45 < 24 * 60) {
        start = minutesToTime(nextStart);
        end = minutesToTime(nextStart + 45);
      }
    }
  }
  $('#lessonStart').value = start;
  $('#lessonEnd').value = end;
  fillSubjectSelect($('#lessonSubject'), lesson ? lesson.subjectId : state.subjects[0].id);
  $('#lessonRoom').value = lesson ? lesson.room : '';
  openDialog($('#lessonDialog'));
}

function handleLessonSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  const day = Number($('#lessonDay').value);
  const start = $('#lessonStart').value;
  const end = $('#lessonEnd').value;
  const subjectId = $('#lessonSubject').value;
  const room = $('#lessonRoom').value.trim();
  let valid = true;

  if (!Number.isInteger(day) || day < 1 || day > 7) {
    setFieldError('lessonDay', 'Выберите день недели.');
    valid = false;
  }
  if (!isValidTime(start)) {
    setFieldError('lessonStart', 'Укажите время начала урока.');
    valid = false;
  }
  if (!isValidTime(end)) {
    setFieldError('lessonEnd', 'Укажите время окончания урока.');
    valid = false;
  }
  if (isValidTime(start) && isValidTime(end) && timeToMinutes(start) >= timeToMinutes(end)) {
    setFieldError('lessonEnd', 'Урок должен заканчиваться позже, чем начинается.');
    valid = false;
  }
  if (!state.subjects.some((subject) => subject.id === subjectId)) {
    setFieldError('lessonSubject', 'Выберите предмет из списка.');
    valid = false;
  }
  if (room.length > 20) {
    setFieldError('lessonRoom', 'Не больше 20 символов.');
    valid = false;
  }

  if (valid) {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    const overlap = state.lessons.find((lesson) => lesson.day === day
      && lesson.id !== ui.editingLessonId
      && startMinutes < timeToMinutes(lesson.end)
      && timeToMinutes(lesson.start) < endMinutes);
    if (overlap) {
      setFieldError('lessonStart', `Пересекается с уроком «${getSubject(overlap.subjectId).name}» (${overlap.start}–${overlap.end}).`);
      valid = false;
    }
  }

  if (!valid) {
    focusFirstInvalid(form);
    return;
  }

  const values = { day, start, end, subjectId, room };
  const editing = ui.editingLessonId ? state.lessons.find((lesson) => lesson.id === ui.editingLessonId) : null;
  if (editing) {
    Object.assign(editing, values);
    showToast('Урок обновлён.', 'success');
  } else {
    state.lessons.push({ id: createId('lesson'), ...values, demo: false });
    showToast(`Урок добавлен: ${WEEKDAYS[day - 1].toLowerCase()}, ${start}.`, 'success');
  }
  saveState();
  closeDialog($('#lessonDialog'));
  refresh();
}

async function deleteLesson(lessonId) {
  const lesson = state.lessons.find((item) => item.id === lessonId);
  if (!lesson) return;
  const subjectName = getSubject(lesson.subjectId).name;
  const ok = await confirmAction({
    title: 'Удалить урок?',
    message: `${subjectName}, ${WEEKDAYS[lesson.day - 1].toLowerCase()} ${lesson.start}–${lesson.end}. Домашние задания по предмету не удалятся.`,
    confirmText: 'Удалить',
  });
  if (!ok) return;
  state.lessons = state.lessons.filter((item) => item.id !== lessonId);
  saveState();
  refresh();
  showToast('Урок удалён.', 'info');
}

/* ==========================================================================
   14. Режим «У меня 30 минут» (учебная сессия)
   ========================================================================== */

function getSessionElapsed(session) {
  const running = session.running && session.runningSince ? Date.now() - session.runningSince : 0;
  return session.elapsedMs + running;
}

function openFocus() {
  markTour('focus');
  toggleNotifications(false);
  if (state.activeSession) {
    ui.focus.view = 'run';
  } else {
    ui.focus = { view: 'choose', plan: null, result: null };
  }
  renderFocus();
  openDialog($('#focusDialog'));
  updateMiniTimer();
}

function renderFocus() {
  const views = { choose: '#focusChoose', plan: '#focusPlan', run: '#focusRun', result: '#focusResult' };
  Object.entries(views).forEach(([name, selector]) => {
    $(selector).hidden = name !== ui.focus.view;
  });
  if (ui.focus.view === 'choose') renderFocusChoose();
  else if (ui.focus.view === 'plan') renderFocusPlan();
  else if (ui.focus.view === 'run') renderFocusRun();
  else if (ui.focus.view === 'result') renderFocusResult();
}

function renderFocusChoose() {
  const pending = getPendingTasks();
  const totalMinutes = pending.reduce((sum, task) => sum + task.duration, 0);
  $$('.time-option[data-minutes]').forEach((button) => {
    button.classList.toggle('is-default', Number(button.dataset.minutes) === state.settings.sessionMinutes);
  });
  $('#focusCustomForm').hidden = true;
  $('[data-action="focus-custom-toggle"]').setAttribute('aria-expanded', 'false');
  $('#focusCustomMinutes').value = String(state.settings.sessionMinutes);
  setFieldError('focusCustomMinutes', '');
  $('#focusPendingNote').textContent = pending.length
    ? `Невыполненных заданий: ${pending.length}, на всё нужно примерно ${formatMinutes(totalMinutes)}. Время по умолчанию меняется в настройках.`
    : 'Сейчас нет невыполненных заданий — сначала добавь хотя бы одно.';
}

function toggleFocusCustom(button) {
  const form = $('#focusCustomForm');
  form.hidden = !form.hidden;
  button.setAttribute('aria-expanded', String(!form.hidden));
  if (!form.hidden) $('#focusCustomMinutes').focus();
}

function handleFocusCustomSubmit(event) {
  event.preventDefault();
  const raw = $('#focusCustomMinutes').value.trim();
  const minutes = Number(raw);
  if (!raw || !Number.isInteger(minutes) || minutes < 5 || minutes > 240) {
    setFieldError('focusCustomMinutes', 'Введите целое число минут от 5 до 240.');
    $('#focusCustomMinutes').focus();
    return;
  }
  setFieldError('focusCustomMinutes', '');
  pickFocusMinutes(minutes);
}

function pickFocusMinutes(minutes) {
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240) return;
  ui.focus.plan = buildSessionPlan(minutes, new Date());
  ui.focus.view = 'plan';
  renderFocus();
  const heading = $('#focusPlanTitle');
  if (heading) heading.focus();
}

function renderFocusPlan() {
  const plan = ui.focus.plan;
  if (!plan) {
    ui.focus.view = 'choose';
    renderFocus();
    return;
  }
  const now = new Date();
  const startButton = $('#focusStartBtn');
  startButton.disabled = plan.chosen.length === 0;
  startButton.hidden = plan.totalPending === 0;

  let html = `<div class="focus-head focus-head--left">
      <h2 id="focusPlanTitle" tabindex="-1">План на ${countText(plan.minutes, MINUTE_FORMS)}</h2>
      <p>Задания выбраны по сроку, приоритету, сложности и длительности. Всё, что не помещается, остаётся на потом.</p>
    </div>`;

  if (!plan.totalPending) {
    html += emptyStateHtml({
      iconName: 'i-trophy',
      title: 'Невыполненных заданий нет',
      text: 'Добавь задание, и StudyBoost составит план на выбранное время.',
      action: 'add-task-from-focus',
      actionText: 'Добавить задание',
    });
    $('#focusPlanContent').innerHTML = html;
    return;
  }

  if (!plan.chosen.length) {
    const suggested = Math.min(240, Math.ceil(plan.shortest / 5) * 5);
    html += `<div class="alert alert--warning">${icon('i-alert')}<div><strong>Ни одно задание не помещается в ${plan.minutes} мин.</strong> Самое короткое займёт ${plan.shortest} мин. Выбери больше времени или разбей большое задание на маленькие шаги.</div></div>`;
    if (suggested > plan.minutes) {
      html += `<p class="focus-note"><button type="button" class="btn btn--soft" data-action="focus-pick" data-minutes="${suggested}">${icon('i-clock')}Составить план на ${suggested} мин</button></p>`;
    }
    $('#focusPlanContent').innerHTML = html;
    return;
  }

  html += `<div class="plan-summary">
      <div class="summary-tile"><strong>${plan.minutes} мин</strong><span>доступно</span></div>
      <div class="summary-tile summary-tile--accent"><strong>${plan.used} мин</strong><span>общее время плана</span></div>
      <div class="summary-tile"><strong>${plan.free} мин</strong><span>останется в запасе</span></div>
    </div>
    <div class="time-split" role="img" aria-label="Распределение времени: ${escapeHtml(plan.chosen.map((item) => `${getSubject(item.task.subjectId).name} ${item.task.duration} мин`).join(', '))}${plan.free ? `, запас ${plan.free} мин` : ''}">
      ${plan.chosen.map((item) => `<span style="flex: ${item.task.duration}; ${subjectStyle(getSubject(item.task.subjectId))}" data-tip="${escapeHtml(`${getSubject(item.task.subjectId).name}: ${item.task.duration} мин`)}"></span>`).join('')}
      ${plan.free ? `<span class="time-split__free" style="flex: ${plan.free}" data-tip="Запас: ${plan.free} мин"></span>` : ''}
    </div>
    <ol class="session-plan">
      ${plan.chosen.map((item, index) => {
    const subject = getSubject(item.task.subjectId);
    const reasons = getTaskReasons(item.task, item.score, now);
    const reasonText = index === 0 ? buildRecommendation(item, now) : `${capitalize(joinReasons(reasons))}.`;
    return `<li class="plan-item">
            <span class="plan-item__num" aria-hidden="true">${index + 1}</span>
            <div class="plan-item__main">
              <div class="plan-item__top">${subjectTag(subject)}<span class="meta">${icon('i-hourglass')}${item.task.duration} мин</span><span class="meta">${icon('i-clock')}${escapeHtml(formatDeadline(item.score.deadline, now))}</span></div>
              <p class="plan-item__title">${escapeHtml(item.task.title)}</p>
              <p class="session-plan__reason">${icon('i-sparkles')}<span>${escapeHtml(reasonText)}</span></p>
            </div>
          </li>`;
  }).join('')}
    </ol>`;

  if (plan.skipped.length) {
    html += `<details class="skipped">
        <summary>Не вошло в план: ${countText(plan.skipped.length, TASK_FORMS)}</summary>
        <ul>
          ${plan.skipped.map((item) => {
    const urgent = item.score.hoursLeft < 24;
    return `<li class="${urgent ? 'is-urgent' : ''}"><strong>${escapeHtml(item.task.title)}</strong> — нужно ${item.task.duration} мин, а в запасе ${plan.free} мин. Срок: ${escapeHtml(formatDeadline(item.score.deadline, now).toLowerCase())}${urgent ? '. Срок близко — запланируй отдельное время.' : '.'}</li>`;
  }).join('')}
        </ul>
      </details>`;
  }

  $('#focusPlanContent').innerHTML = html;
}

function startSession() {
  const plan = ui.focus.plan;
  if (!plan || !plan.chosen.length) return;
  if (state.activeSession) {
    ui.focus.view = 'run';
    renderFocus();
    return;
  }
  const taskIds = plan.chosen.map((item) => item.task.id).filter((id) => {
    const task = findTask(id);
    return task && task.status !== 'done';
  });
  if (!taskIds.length) {
    showToast('Задания из плана уже выполнены. Составь новый план.', 'info');
    ui.focus.view = 'choose';
    renderFocus();
    return;
  }
  state.activeSession = {
    id: createId('session'),
    plannedMinutes: plan.minutes,
    taskIds,
    completedTaskIds: [],
    startedAt: new Date().toISOString(),
    elapsedMs: 0,
    running: true,
    runningSince: Date.now(),
    progressBefore: computeDayProgress(new Date()).percent,
  };
  markTour('timer');
  saveState();
  ui.lastSessionPersist = Date.now();
  startSessionTicker();
  ui.focus.view = 'run';
  renderFocus();
  showToast(`Сессия началась: ${plan.minutes} мин. Удачи!`, 'success');
}

function persistSession() {
  const session = state.activeSession;
  if (!session) return;
  session.elapsedMs = Math.min(getSessionElapsed(session), session.plannedMinutes * MINUTE_MS);
  if (session.running) session.runningSince = Date.now();
  ui.lastSessionPersist = Date.now();
  saveState();
}

function pauseSession() {
  const session = state.activeSession;
  if (!session || !session.running) return;
  session.elapsedMs = getSessionElapsed(session);
  session.running = false;
  session.runningSince = null;
  saveState();
  renderFocusRun();
  updatePageTitle();
}

function resumeSession() {
  const session = state.activeSession;
  if (!session || session.running) return;
  session.running = true;
  session.runningSince = Date.now();
  saveState();
  startSessionTicker();
  renderFocusRun();
}

function startSessionTicker() {
  if (ui.sessionTimer) return;
  ui.sessionTimer = setInterval(tickSession, 250);
}

function stopSessionTicker() {
  if (ui.sessionTimer) clearInterval(ui.sessionTimer);
  ui.sessionTimer = null;
}

function tickSession() {
  const session = state.activeSession;
  if (!session) {
    stopSessionTicker();
    return;
  }
  updateTimerDisplay();
  if (!session.running) return;
  if (getSessionElapsed(session) >= session.plannedMinutes * MINUTE_MS) {
    finishSession('time');
    return;
  }
  if (Date.now() - ui.lastSessionPersist > 5000) persistSession();
}

function updateTimerDisplay() {
  const session = state.activeSession;
  if (!session) return;
  const total = session.plannedMinutes * MINUTE_MS;
  const elapsed = Math.min(getSessionElapsed(session), total);
  const remaining = total - elapsed;
  const clock = formatClock(remaining);
  $('#focusTimeLeft').textContent = clock;
  $('#focusTimerLabel').textContent = session.running ? 'осталось' : 'пауза';
  $('#timerProgress').style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (elapsed / total));
  $('#miniTimerTime').textContent = clock;
  $('#miniTimerLabel').textContent = session.running ? 'Сессия идёт' : 'На паузе';
  updatePageTitle();
}

function renderFocusRun() {
  const session = state.activeSession;
  if (!session) {
    ui.focus.view = 'choose';
    renderFocus();
    return;
  }
  const tasks = session.taskIds.map(findTask).filter(Boolean);
  const current = tasks.find((task) => task.status !== 'done');
  $('#focusPauseBtn').hidden = !session.running;
  $('#focusResumeBtn').hidden = session.running;
  $('#focusTimer').classList.toggle('is-paused', !session.running);
  $('#focusCurrent').innerHTML = current
    ? `${icon('i-target')}<span>Сейчас: <strong>${escapeHtml(current.title)}</strong></span>`
    : `${icon('i-check-circle')}<span>Все задания сессии выполнены!</span>`;

  $('#focusTaskList').innerHTML = tasks.length
    ? tasks.map((task) => `<li class="session-task ${task.status === 'done' ? 'is-done' : ''} ${task === current ? 'is-current' : ''}">
          ${checkButton(task, 'session-toggle-task')}
          <div class="session-task__body">
            <span class="session-task__title">${escapeHtml(task.title)}</span>
            <span class="session-task__meta">${escapeHtml(getSubject(task.subjectId).name)} · ${task.duration} мин</span>
          </div>
        </li>`).join('')
    : '<li class="empty-mini">Задания этой сессии были удалены. Можно завершить сессию.</li>';

  const allDone = tasks.length > 0 && tasks.every((task) => task.status === 'done');
  $('#focusAllDone').innerHTML = allDone
    ? `<div class="alert alert--success">${icon('i-trophy')}<div><strong>Все задания выполнены!</strong> Нажми «Завершить», чтобы увидеть результат сессии.</div></div>`
    : '';
  updateTimerDisplay();
}

function toggleSessionTask(taskId) {
  const task = findTask(taskId);
  if (!task || !state.activeSession) return;
  if (task.status === 'done') reopenTask(task);
  else completeTask(task, { inSession: true });
}

function finishSession(reason = 'manual') {
  const session = state.activeSession;
  if (!session) return;
  stopSessionTicker();
  const now = new Date();
  const spentMs = Math.min(getSessionElapsed(session), session.plannedMinutes * MINUTE_MS);
  const completedTaskIds = session.taskIds.filter((id) => {
    const task = findTask(id);
    return task && task.status === 'done';
  });
  const record = {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: now.toISOString(),
    plannedMinutes: session.plannedMinutes,
    spentSeconds: Math.round(spentMs / 1000),
    taskIds: [...session.taskIds],
    completedTaskIds,
  };
  state.sessions.push(record);
  state.activeSession = null;

  addNotification(
    'session',
    'Учебная сессия завершена',
    `${formatDuration(record.spentSeconds)} учёбы, выполнено ${completedTaskIds.length} из ${countText(record.taskIds.length, TASK_FORMS)}.`,
  );
  saveState();
  const progressAfter = computeDayProgress(now).percent;
  ui.focus = {
    view: 'result',
    plan: null,
    result: { record, reason, progressBefore: session.progressBefore, progressAfter, unlocked: [] },
  };
  openDialog($('#focusDialog'));
  const unlocked = checkAchievements(now);
  ui.focus.result.unlocked = unlocked;
  renderFocus();
  if (!unlocked.length) launchConfetti();
  if (reason === 'time') showToast('Время сессии вышло. Отличная работа!', 'success');
  refresh();
  updatePageTitle();
  const heading = $('#focusResultTitle');
  if (heading) heading.focus();
}

function renderFocusResult() {
  const result = ui.focus.result;
  if (!result) {
    ui.focus.view = 'choose';
    renderFocus();
    return;
  }
  const { record, progressBefore, progressAfter, unlocked, reason } = result;
  const done = record.completedTaskIds.length;
  const total = record.taskIds.length;
  let message = 'Ничего страшного: даже начать — уже шаг вперёд. Невыполненные задания остались в плане.';
  if (total > 0 && done === total) message = 'Все задания из плана выполнены. Отличная работа!';
  else if (done > 0) message = 'Хороший результат! Оставшиеся задания StudyBoost предложит в следующий раз.';

  $('#focusResultContent').innerHTML = `
    <div class="result">
      <div class="result__icon">${icon('i-trophy')}</div>
      <h2 class="result__title" id="focusResultTitle" tabindex="-1">${reason === 'time' ? 'Время вышло — сессия завершена!' : 'Сессия завершена!'}</h2>
      <p class="result__text">${escapeHtml(message)}</p>
      <div class="result-grid">
        <div class="summary-tile"><strong>${escapeHtml(formatDuration(record.spentSeconds))}</strong><span>потрачено из ${record.plannedMinutes} мин</span></div>
        <div class="summary-tile summary-tile--accent"><strong>${done} из ${total}</strong><span>заданий выполнено</span></div>
        <div class="summary-tile"><strong>${progressBefore}% → ${progressAfter}%</strong><span>прогресс за день</span></div>
      </div>
      ${unlocked.length ? `<div class="result__achievements"><span>Новые достижения:</span>${unlocked.map((achievement) => `<span class="achievement-pill">${icon(achievement.icon)}${escapeHtml(achievement.title)}</span>`).join('')}</div>` : ''}
    </div>`;
}

function minimizeFocus() {
  closeDialog($('#focusDialog'));
  if (state.activeSession) showToast('Сессия продолжается. Вернуться можно кнопкой таймера внизу экрана.', 'info');
}

function handleFocusDialogClose() {
  if (ui.focus.view === 'result' || (!state.activeSession && ui.focus.view === 'run')) {
    ui.focus = { view: 'choose', plan: null, result: null };
  }
  updateMiniTimer();
}

function updateMiniTimer() {
  const show = Boolean(state.activeSession) && !$('#focusDialog').open;
  $('#miniTimer').hidden = !show;
  if (state.activeSession) updateTimerDisplay();
}

/* ==========================================================================
   15. Статистика
   ========================================================================== */

function renderBarChart(container, data, ariaLabel) {
  const max = Math.max(0, ...data.map((item) => item.value));
  const maxIndex = max > 0 ? data.findIndex((item) => item.value === max) : -1;
  container.innerHTML = `
    <div class="bars" role="list" aria-label="${escapeHtml(ariaLabel)}" style="--cols: ${data.length}">
      ${data.map((item, index) => {
    const height = max ? Math.max(4, Math.round((item.value / max) * 100)) : 0;
    return `<div class="bars__col" role="listitem">
            <div class="bar ${item.value ? '' : 'bar--zero'}" style="height: ${item.value ? height : 0}%" tabindex="0" data-tip="${escapeHtml(item.tip)}" aria-label="${escapeHtml(item.tip)}">
              ${index === maxIndex ? `<span class="bar__value" aria-hidden="true">${item.value}</span>` : ''}
            </div>
          </div>`;
  }).join('')}
    </div>
    <div class="bars__labels" style="--cols: ${data.length}" aria-hidden="true">
      ${data.map((item) => `<span class="bars__label ${item.isCurrent ? 'is-current' : ''}">${escapeHtml(item.label)}${item.sub ? `<small>${escapeHtml(item.sub)}</small>` : ''}</span>`).join('')}
    </div>`;
}

function renderStats() {
  const now = new Date();
  const stats = computeStats(now);
  const todayKey = toDateKey(now);
  const unlockedCount = ACHIEVEMENTS.filter((achievement) => state.achievements[achievement.id]).length;

  $('#statsKpis').innerHTML = [
    kpiHtml({ iconName: 'i-check-circle', tone: 'success', label: 'Всего выполнено', value: stats.done, sub: `из ${countText(stats.total, TASK_FORMS)}` }),
    kpiHtml({ iconName: 'i-calendar', tone: 'accent', label: 'За 7 дней', value: stats.weekDone, sub: 'выполненных заданий' }),
    kpiHtml({ iconName: 'i-target', tone: 'accent', label: 'Процент выполнения', value: `${stats.completionRate}<small>%</small>`, sub: `вовремя сдано: ${stats.onTime}` }),
    kpiHtml({ iconName: 'i-clock', tone: 'warning', label: 'Время на учёбу', value: escapeHtml(formatMinutes(stats.studyMinutes)), sub: `в сессиях: ${formatMinutes(stats.sessionMinutes)}` }),
    kpiHtml({ iconName: 'i-flame', tone: 'danger', label: 'Серия дней', value: stats.streak.current, sub: `рекорд: ${countText(stats.streak.best, DAY_FORMS)}` }),
  ].join('');

  const weekTotal = stats.last7.reduce((sum, day) => sum + day.count, 0);
  $('#weekChartNote').textContent = weekTotal
    ? `Всего ${countText(weekTotal, TASK_FORMS)} за неделю. Наведи на столбец, чтобы увидеть подробности.`
    : 'За последние 7 дней пока нет выполненных заданий.';
  renderBarChart($('#chartWeek'), stats.last7.map((day) => ({
    label: WEEKDAYS_SHORT[weekdayIndex(day.date)],
    sub: String(day.date.getDate()),
    value: day.count,
    tip: `${capitalize(fmtWeekdayShort.format(day.date))}: ${countText(day.count, TASK_FORMS)}, ${formatMinutes(day.minutes)} учёбы`,
    isCurrent: day.key === todayKey,
  })), 'Выполненные задания за последние 7 дней');

  const maxWeekday = Math.max(...stats.weekdayCounts);
  if (maxWeekday > 0) {
    const bestDays = stats.weekdayCounts
      .map((count, index) => (count === maxWeekday ? WEEKDAYS[index].toLowerCase() : null))
      .filter(Boolean);
    $('#bestDayText').textContent = `${bestDays.length > 1 ? 'Самые продуктивные дни' : 'Самый продуктивный день'} — ${bestDays.join(' и ')}: ${countText(maxWeekday, TASK_FORMS)}.`;
  } else {
    $('#bestDayText').textContent = 'Пока нет данных — выполни первое задание.';
  }
  renderBarChart($('#chartWeekdays'), stats.weekdayCounts.map((count, index) => ({
    label: WEEKDAYS_SHORT[index],
    sub: '',
    value: count,
    tip: `${WEEKDAYS[index]}: ${countText(count, TASK_FORMS)} за всё время`,
    isCurrent: index === weekdayIndex(now),
  })), 'Выполненные задания по дням недели');

  $('#subjectProgress').innerHTML = stats.bySubject.length
    ? `<ul class="subject-progress">${stats.bySubject.map((row) => {
      const percent = Math.round((row.done / row.total) * 100);
      return `<li style="${subjectStyle(row.subject)}">
            <div class="sp-row__head">
              <span class="sp-row__name"><span class="dot" aria-hidden="true"></span>${escapeHtml(row.subject.name)}</span>
              <span class="sp-row__value">${row.done} из ${row.total} · ${percent}%</span>
            </div>
            <div class="sp-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${escapeHtml(row.subject.name)}: выполнено ${percent}%">
              <div class="sp-fill" style="width: ${percent}%"></div>
            </div>
          </li>`;
    }).join('')}</ul>`
    : '<p class="empty-mini">Добавь задания, чтобы увидеть прогресс по предметам.</p>';

  renderStreak(stats, now);
  renderAchievements(stats);
  $('#achievementsCount').textContent = `Открыто ${unlockedCount} из ${ACHIEVEMENTS.length}`;
  renderSessionHistory();
}

function renderStreak(stats, now) {
  const { current, best, days } = stats.streak;
  const todayKey = toDateKey(now);
  const todayActive = days.has(todayKey);
  const squares = [];
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = addDays(startOfDay(now), -offset);
    const key = toDateKey(date);
    const active = days.has(key);
    const label = `${capitalize(fmtWeekdayShort.format(date))}: ${active ? 'была учёба' : 'нет активности'}`;
    squares.push(`<li class="streak-day ${active ? 'is-active' : ''} ${key === todayKey ? 'is-today' : ''}" tabindex="0" data-tip="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></li>`);
  }
  let note = 'Выполни задание сегодня, чтобы начать серию.';
  if (todayActive) note = 'Сегодня уже засчитано! Возвращайся завтра, чтобы продолжить серию.';
  else if (current) note = 'Не прерывай серию — выполни хотя бы одно задание сегодня.';

  $('#streakBox').innerHTML = `
    <div class="streak">
      <div class="streak__flame">${icon('i-flame')}</div>
      <div>
        <p class="streak__value">${current} <span>${pluralRu(current, DAY_FORMS)}</span></p>
        <p class="streak__label">текущая серия · рекорд: ${countText(best, DAY_FORMS)}</p>
      </div>
    </div>
    <ul class="streak-days" aria-label="Активность за последние 14 дней">${squares.join('')}</ul>
    <div class="streak-legend"><span>2 недели назад</span><span>сегодня</span></div>
    <p class="muted-note">${note}</p>`;
}

function renderAchievements(stats) {
  $('#achievementsGrid').innerHTML = ACHIEVEMENTS.map((achievement) => {
    const unlockedAt = state.achievements[achievement.id];
    const progress = getAchievementProgress(achievement, stats);
    const footer = unlockedAt
      ? `<p class="achievement__status">${icon('i-check-circle')}Открыто ${fmtDayMonth.format(new Date(unlockedAt))}</p>`
      : `<div class="progress-line" aria-hidden="true"><span style="width: ${progress.percent}%"></span></div>
         <p class="achievement__status">${icon('i-lock')}Прогресс: ${progress.value} из ${progress.goal}</p>`;
    return `<article class="achievement ${unlockedAt ? 'is-unlocked' : ''}">
        <div class="achievement__icon">${icon(unlockedAt ? achievement.icon : 'i-lock')}</div>
        <h3 class="achievement__title">${escapeHtml(achievement.title)}</h3>
        <p class="achievement__desc">${escapeHtml(achievement.description)}</p>
        <div class="achievement__footer">${footer}</div>
      </article>`;
  }).join('');
}

function renderSessionHistory() {
  const recent = [...state.sessions].reverse().slice(0, 6);
  $('#sessionHistory').innerHTML = recent.length
    ? recent.map((session) => {
      const ended = new Date(session.endedAt);
      return `<li class="history-item">
          <span class="history-item__icon">${icon('i-bolt')}</span>
          <div class="history-item__body">
            <strong>${escapeHtml(capitalize(fmtWeekdayShort.format(ended)))}, ${toTimeValue(ended)}</strong>
            <span>${escapeHtml(formatDuration(session.spentSeconds))} из ${session.plannedMinutes} мин · выполнено ${session.completedTaskIds.length} из ${countText(session.taskIds.length, TASK_FORMS)}</span>
          </div>
        </li>`;
    }).join('')
    : '<li class="empty-mini">Учебных сессий пока не было. Нажми «У меня 30 минут» на главной странице.</li>';
}

/* ==========================================================================
   16. Настройки, предметы, импорт и экспорт
   ========================================================================== */

function renderSettings(fillForm = true) {
  const settings = state.settings;
  if (fillForm) {
    clearFormErrors($('#profileForm'));
    $('#settingName').value = settings.name;
    $('#settingGrade').value = settings.grade;
    $('#settingSession').value = String(settings.sessionMinutes);
    $('#settingDaily').value = String(settings.dailyMinutes);
  }
  $$('input[name="theme"]').forEach((radio) => {
    radio.checked = radio.value === settings.theme;
  });
  $$('input[name="accent"]').forEach((radio) => {
    radio.checked = radio.value === settings.accent;
  });
  renderSubjectList();
  renderDataSummary();
  const demoLoaded = hasDemoData();
  $('#loadDemoBtn').disabled = demoLoaded;
  $('#removeDemoBtn').disabled = !demoLoaded;
  $('#tourShowBtn').disabled = !state.tour.hidden && !TOUR_STEPS.some((step) => state.tour[step.id]);
}

function renderSubjectList() {
  $('#subjectList').innerHTML = state.subjects.map((subject) => {
    const taskCount = state.tasks.filter((task) => task.subjectId === subject.id).length;
    const lessonCount = state.lessons.filter((lesson) => lesson.subjectId === subject.id).length;
    const action = subject.custom
      ? `<button type="button" class="icon-btn icon-btn--sm icon-btn--ghost icon-btn--danger" data-action="delete-subject" data-id="${escapeHtml(subject.id)}" aria-label="Удалить предмет: ${escapeHtml(subject.name)}">${icon('i-trash')}</button>`
      : '<span class="subject-row__badge">базовый</span>';
    return `<li class="subject-row" style="${subjectStyle(subject)}">
        <span class="subject-row__dot" aria-hidden="true"></span>
        <span class="subject-row__name">${escapeHtml(subject.name)}</span>
        <span class="subject-row__meta">${countText(taskCount, TASK_FORMS)} · ${countText(lessonCount, LESSON_FORMS)}</span>
        ${action}
      </li>`;
  }).join('');
}

function renderDataSummary() {
  let sizeKb = 0;
  try {
    sizeKb = Math.ceil(new Blob([JSON.stringify(state)]).size / 1024);
  } catch (error) {
    sizeKb = 0;
  }
  $('#dataSummary').textContent = `Сейчас сохранено: ${countText(state.tasks.length, TASK_FORMS)}, ${countText(state.lessons.length, LESSON_FORMS)}, сессий: ${state.sessions.length}. Объём данных — около ${sizeKb} КБ.`;
}

function handleProfileSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  const name = $('#settingName').value.trim().replace(/\s+/g, ' ');
  const grade = $('#settingGrade').value;
  const sessionRaw = $('#settingSession').value.trim();
  const dailyRaw = $('#settingDaily').value.trim();
  const sessionMinutes = Number(sessionRaw);
  const dailyMinutes = Number(dailyRaw);
  let valid = true;

  if (name.length > 40) {
    setFieldError('settingName', 'Имя — не длиннее 40 символов.');
    valid = false;
  } else if (name && !/^[\p{L}][\p{L}\s'.-]*$/u.test(name)) {
    setFieldError('settingName', 'Имя может содержать только буквы, пробел, дефис и апостроф.');
    valid = false;
  }
  if (!GRADES.includes(grade)) {
    setFieldError('settingGrade', 'Выберите класс из списка.');
    valid = false;
  }
  if (!sessionRaw || !Number.isInteger(sessionMinutes) || sessionMinutes < 5 || sessionMinutes > 240) {
    setFieldError('settingSession', 'Укажите целое число минут от 5 до 240.');
    valid = false;
  }
  if (!dailyRaw || !Number.isInteger(dailyMinutes) || dailyMinutes < 15 || dailyMinutes > 720) {
    setFieldError('settingDaily', 'Укажите целое число минут от 15 до 720.');
    valid = false;
  }
  if (!valid) {
    focusFirstInvalid(form);
    return;
  }

  Object.assign(state.settings, { name, grade, sessionMinutes, dailyMinutes });
  $('#settingName').value = name;
  saveState();
  refresh();
  showToast('Настройки сохранены.', 'success');
}

function handleThemeRadio(event) {
  if (!event.target.checked) return;
  setTheme(event.target.value);
}

function handleAccentRadio(event) {
  if (!event.target.checked || !ACCENTS.includes(event.target.value)) return;
  state.settings.accent = event.target.value;
  applyTheme();
  saveState();
}

function handleSubjectSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  clearFormErrors(form);
  const name = $('#subjectName').value.trim().replace(/\s+/g, ' ');
  const color = Number(form.elements.subjectColor.value);
  const error = validateSubjectName(name);
  if (error) {
    setFieldError('subjectName', error);
    $('#subjectName').focus();
    return;
  }
  getOrCreateSubject(name, Number.isInteger(color) && color >= 1 && color <= 8 ? color : null);
  saveState();
  $('#subjectName').value = '';
  renderSubjectList();
  showToast(`Предмет «${name}» добавлен.`, 'success');
}

async function deleteSubject(subjectId) {
  const subject = state.subjects.find((item) => item.id === subjectId);
  if (!subject || !subject.custom) return;
  const taskCount = state.tasks.filter((task) => task.subjectId === subjectId).length;
  const lessonCount = state.lessons.filter((lesson) => lesson.subjectId === subjectId).length;
  if (taskCount || lessonCount) {
    showToast(`Нельзя удалить «${subject.name}»: он используется (${countText(taskCount, TASK_FORMS)}, ${countText(lessonCount, LESSON_FORMS)}). Сначала измени или удали их.`, 'warning');
    return;
  }
  const ok = await confirmAction({
    title: 'Удалить предмет?',
    message: `Предмет «${subject.name}» будет удалён из списка.`,
    confirmText: 'Удалить',
  });
  if (!ok) return;
  state.subjects = state.subjects.filter((item) => item.id !== subjectId);
  if (ui.filters.subject === subjectId) ui.filters.subject = 'all';
  saveState();
  renderSubjectList();
  showToast('Предмет удалён.', 'info');
}

function exportData() {
  const payload = {
    app: 'StudyBoost',
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      settings: state.settings,
      subjects: state.subjects.filter((subject) => subject.custom),
      tasks: state.tasks,
      lessons: state.lessons,
      sessions: state.sessions,
      achievements: state.achievements,
    },
  };
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studyboost-${toDateKey(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Экспорт готов: ${countText(state.tasks.length, TASK_FORMS)} сохранено в файл.`, 'success');
  } catch (error) {
    showToast('Не удалось создать файл экспорта в этом браузере.', 'danger');
  }
}

function setImportStatus(message, tone = 'info') {
  const status = $('#importStatus');
  status.textContent = message;
  status.className = `import-status import-status--${tone}`;
}

function handleImportChange(event) {
  const input = event.currentTarget;
  const file = input.files && input.files[0];
  if (!file) return;
  setImportStatus('');

  if (state.activeSession) {
    setImportStatus('Сначала заверши текущую учебную сессию, затем импортируй данные.', 'danger');
    input.value = '';
    return;
  }
  if (file.size > MAX_IMPORT_SIZE) {
    setImportStatus('Файл слишком большой (больше 5 МБ). Выбери резервную копию StudyBoost.', 'danger');
    input.value = '';
    return;
  }
  if (!/\.json$/i.test(file.name)) {
    setImportStatus('Нужен файл в формате .json, сохранённый кнопкой «Экспорт в JSON».', 'danger');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    processImportText(String(reader.result || ''));
  };
  reader.onerror = () => {
    setImportStatus('Не удалось прочитать файл. Попробуй ещё раз.', 'danger');
  };
  reader.readAsText(file);
  input.value = '';
}

function prepareImport(parsed) {
  let source = null;
  if (Array.isArray(parsed)) {
    source = { tasks: parsed };
  } else if (parsed && typeof parsed === 'object') {
    source = parsed.app === 'StudyBoost' && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
  }
  if (!source) throw new Error('Файл не похож на данные StudyBoost. Текущие данные не изменены.');
  if (!Array.isArray(source.tasks)) {
    throw new Error('В файле нет списка заданий («tasks»). Выбери файл, созданный кнопкой «Экспорт в JSON».');
  }

  const imported = sanitizeState({
    ...source,
    settings: source.settings && typeof source.settings === 'object' ? source.settings : state.settings,
    activeSession: null,
    notifications: [],
    notifiedKeys: [],
  });
  if (source.tasks.length > 0 && imported.tasks.length === 0) {
    throw new Error('Ни одно задание в файле не прошло проверку. Текущие данные не изменены.');
  }
  const sourceLessons = Array.isArray(source.lessons) ? source.lessons.length : 0;
  const skipped = (source.tasks.length - imported.tasks.length) + (sourceLessons - imported.lessons.length);
  return { imported, skipped };
}

async function processImportText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    setImportStatus('Файл повреждён или это не JSON. Текущие данные не изменены.', 'danger');
    return;
  }

  let prepared;
  try {
    prepared = prepareImport(parsed);
  } catch (error) {
    setImportStatus(error.message, 'danger');
    return;
  }

  const { imported, skipped } = prepared;
  const ok = await confirmAction({
    title: 'Заменить текущие данные?',
    message: `В файле: ${countText(imported.tasks.length, TASK_FORMS)} и ${countText(imported.lessons.length, LESSON_FORMS)}${skipped ? `. Записей с ошибками пропущено: ${skipped}` : ''}. Текущие задания и расписание будут заменены.`,
    confirmText: 'Импортировать',
    tone: 'primary',
  });
  if (!ok) {
    setImportStatus('Импорт отменён. Данные не изменены.', 'info');
    return;
  }

  imported.tour = { ...state.tour };
  state = imported;
  ui.filters = { ...DEFAULT_FILTERS };
  applyTheme();
  saveState();
  checkDeadlineNotifications(new Date());
  checkAchievements(new Date(), { silent: true });
  refresh();
  renderSettings(true);
  setImportStatus(`Импорт завершён: ${countText(state.tasks.length, TASK_FORMS)}, ${countText(state.lessons.length, LESSON_FORMS)}.`, 'success');
  showToast('Данные успешно импортированы.', 'success');
}

async function resetAllData() {
  const ok = await confirmAction({
    title: 'Сбросить все данные?',
    message: 'Будут удалены все задания, расписание, статистика, достижения и настройки. Это действие нельзя отменить. Совет: сначала сделай экспорт в JSON.',
    confirmText: 'Да, удалить всё',
  });
  if (!ok) return;
  stopSessionTicker();
  state = createEmptyState();
  ui.filters = { ...DEFAULT_FILTERS };
  ui.focus = { view: 'choose', plan: null, result: null };
  closeDialog($('#focusDialog'));
  applyTheme();
  saveState();
  setImportStatus('');
  navigate('home');
  refresh();
  showToast('Все данные удалены. Можно начинать с чистого листа.', 'success');
}

function showTourAgain() {
  state.tour = createDefaultTour();
  saveState();
  renderSettings(false);
  showToast('Демо-сценарий снова на главной странице.', 'success');
}

function hideTour() {
  state.tour.hidden = true;
  saveState();
  renderTourCard();
  showToast('Сценарий скрыт. Вернуть его можно в настройках.', 'info');
}

/* ==========================================================================
   17. Тема и цвет акцента
   ========================================================================== */

function applyTheme() {
  const root = document.documentElement;
  const { theme, accent } = state.settings;
  root.dataset.theme = theme;
  root.dataset.accent = accent;
  const isDark = theme === 'dark';
  const toggle = $('#themeToggle');
  toggle.setAttribute('aria-label', isDark ? 'Включить светлую тему' : 'Включить тёмную тему');
  toggle.setAttribute('aria-pressed', String(isDark));
  $('#themeIcon').setAttribute('href', isDark ? '#i-sun' : '#i-moon');
  $('meta[name="theme-color"]').setAttribute('content', isDark ? '#0b0e1d' : ACCENT_THEME_COLORS[accent]);
}

function setTheme(theme) {
  if (!['light', 'dark'].includes(theme)) return;
  state.settings.theme = theme;
  applyTheme();
  saveState();
  $$('input[name="theme"]').forEach((radio) => {
    radio.checked = radio.value === theme;
  });
}

function toggleTheme() {
  setTheme(state.settings.theme === 'dark' ? 'light' : 'dark');
}

/* ==========================================================================
   18. Обработчики событий
   Все кнопки используют атрибут data-action и один делегированный обработчик,
   поэтому после перерисовки списков обработчики не дублируются.
   ========================================================================== */

const ACTIONS = {
  'add-task': () => openTaskForm(),
  'add-task-for-day': (element) => openTaskForm(null, { dateKey: element.dataset.date }),
  'add-task-from-focus': () => {
    closeDialog($('#focusDialog'));
    openTaskForm();
  },
  'edit-task': (element) => openTaskForm(element.dataset.id),
  'delete-task': (element) => deleteTask(element.dataset.id),
  'toggle-task': (element) => toggleTask(element.dataset.id),
  'deadline-preset': (element) => applyDeadlinePreset(element.dataset.preset),
  'duration-preset': (element) => applyDurationPreset(Number(element.dataset.minutes)),
  'close-dialog': (element) => closeDialog(document.getElementById(element.dataset.dialog)),
  'filter-status': (element) => {
    ui.filters.status = element.dataset.value;
    renderTasks();
  },
  'reset-filters': () => resetTaskFilters(),
  'show-overdue': () => showOverdueTasks(),
  'remove-demo': () => removeDemoData(),
  'load-demo': () => loadDemoData(),
  'tour-hide': () => hideTour(),
  'tour-show': () => showTourAgain(),

  'open-focus': () => openFocus(),
  'focus-pick': (element) => pickFocusMinutes(Number(element.dataset.minutes)),
  'focus-custom-toggle': (element) => toggleFocusCustom(element),
  'focus-back': () => {
    ui.focus.view = 'choose';
    renderFocus();
  },
  'focus-start': () => startSession(),
  'focus-pause': () => pauseSession(),
  'focus-resume': () => resumeSession(),
  'focus-finish': () => finishSession('manual'),
  'focus-minimize': () => minimizeFocus(),
  'focus-restore': () => openFocus(),
  'focus-close': () => closeDialog($('#focusDialog')),
  'go-stats': () => {
    closeDialog($('#focusDialog'));
    navigate('stats');
  },
  'session-toggle-task': (element) => toggleSessionTask(element.dataset.id),

  'add-lesson': (element) => openLessonForm(null, Number(element.dataset.day) || null),
  'edit-lesson': (element) => openLessonForm(element.dataset.id),
  'delete-lesson': (element) => deleteLesson(element.dataset.id),
  'week-prev': () => shiftWeek(-1),
  'week-next': () => shiftWeek(1),
  'week-today': () => goToCurrentWeek(),
  'select-day': (element) => selectDay(element.dataset.date),

  'toggle-notifications': () => toggleNotifications(),
  'notif-read': (element) => markNotificationRead(element.dataset.id),
  'notif-read-all': () => markAllNotificationsRead(),
  'notif-clear': () => clearNotifications(),
  'close-toast': (element) => removeToast(element.closest('.toast')),

  'toggle-theme': () => toggleTheme(),
  'delete-subject': (element) => deleteSubject(element.dataset.id),
  'export-data': () => exportData(),
  'reset-data': () => resetAllData(),
  'confirm-yes': () => settleConfirm(true),
  'confirm-no': () => settleConfirm(false),
};

function handleDocumentClick(event) {
  const panel = $('#notifPanel');
  if (!panel.hidden && !event.target.closest('#notifPanel') && !event.target.closest('#bellBtn')) {
    toggleNotifications(false);
  }
  const trigger = event.target.closest('[data-action]');
  if (!trigger || trigger.disabled) return;
  const handler = ACTIONS[trigger.dataset.action];
  if (typeof handler !== 'function') return;
  if (trigger.tagName === 'A') event.preventDefault();
  hideTooltip();
  handler(trigger, event);
}

function handleKeydown(event) {
  if (event.key === 'Escape' && !$('#notifPanel').hidden) {
    toggleNotifications(false);
    $('#bellBtn').focus();
  }
}

function handleTooltipEnter(event) {
  const target = event.target instanceof Element ? event.target.closest('[data-tip]') : null;
  if (target) showTooltip(target);
}

function handleTooltipLeave(event) {
  const target = event.target instanceof Element ? event.target.closest('[data-tip]') : null;
  if (target && !(event.relatedTarget instanceof Node && target.contains(event.relatedTarget))) hideTooltip();
}

function handleFieldInput(event) {
  const field = event.target;
  if (field instanceof HTMLElement && field.id && field.getAttribute('aria-invalid') === 'true') {
    setFieldError(field.id, '');
  }
}

function handleFilterChange() {
  ui.filters.subject = $('#filterSubject').value;
  ui.filters.priority = $('#filterPriority').value;
  ui.filters.sort = $('#sortTasks').value;
  renderTaskList(new Date());
}

function handleSearchInput(event) {
  ui.filters.search = event.target.value;
  renderTaskList(new Date());
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') globalTick();
  else if (state.activeSession) persistSession();
}

// Каждые 30 секунд: проверка дедлайнов и обновление относительного времени
function globalTick() {
  const now = new Date();
  checkDeadlineNotifications(now);
  renderNotifications();
  const active = document.activeElement;
  const userIsInteracting = active && active !== document.body && $('#main').contains(active);
  if (userIsInteracting) return;
  hideTooltip();
  if (ui.page === 'home') renderHome(now);
  else if (ui.page === 'tasks') renderTaskList(now);
  else if (ui.page === 'schedule') renderSchedule();
}

function bindEvents() {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('input', handleFieldInput);
  document.addEventListener('mouseover', handleTooltipEnter);
  document.addEventListener('mouseout', handleTooltipLeave);
  document.addEventListener('focusin', handleTooltipEnter);
  document.addEventListener('focusout', handleTooltipLeave);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('hashchange', () => showPage(getPageFromHash()));
  window.addEventListener('scroll', hideTooltip, { passive: true });
  window.addEventListener('pagehide', () => {
    if (state.activeSession) persistSession();
  });

  $('#taskForm').addEventListener('submit', handleTaskSubmit);
  $('#lessonForm').addEventListener('submit', handleLessonSubmit);
  $('#profileForm').addEventListener('submit', handleProfileSubmit);
  $('#subjectForm').addEventListener('submit', handleSubjectSubmit);
  $('#focusCustomForm').addEventListener('submit', handleFocusCustomSubmit);

  $('#taskSubject').addEventListener('change', handleTaskSubjectChange);
  $('#taskDescription').addEventListener('input', updateDescriptionCounter);
  $('#taskSearch').addEventListener('input', handleSearchInput);
  $('#filterSubject').addEventListener('change', handleFilterChange);
  $('#filterPriority').addEventListener('change', handleFilterChange);
  $('#sortTasks').addEventListener('change', handleFilterChange);
  $('#planBudget').addEventListener('change', handleBudgetChange);
  $('#dayPicker').addEventListener('change', handleDayPickerChange);
  $('#importFile').addEventListener('change', handleImportChange);
  $$('input[name="theme"]').forEach((radio) => radio.addEventListener('change', handleThemeRadio));
  $$('input[name="accent"]').forEach((radio) => radio.addEventListener('change', handleAccentRadio));

  $('#focusDialog').addEventListener('close', handleFocusDialogClose);
  $('#confirmDialog').addEventListener('close', () => {
    if (ui.confirmResolver) settleConfirm(false);
  });
}

/* ==========================================================================
   19. Запуск
   ========================================================================== */

function init() {
  const loaded = loadState();
  state = loaded.state;
  applyTheme();
  $('#timerProgress').style.strokeDasharray = String(TIMER_CIRCUMFERENCE);
  bindEvents();

  const now = new Date();
  checkDeadlineNotifications(now);
  checkAchievements(now, { silent: true });
  saveState();
  showPage(getPageFromHash());
  renderNotifications();

  if (state.activeSession) {
    startSessionTicker();
    showToast('Незавершённая учебная сессия восстановлена и поставлена на паузу.', 'info');
  }
  updateMiniTimer();

  if (loaded.recovered) {
    showToast('Сохранённые данные были повреждены. Их копия сохранена, загружены демо-данные.', 'warning');
  } else if (loaded.firstRun) {
    showToast('Добро пожаловать в StudyBoost! Мы добавили демо-задания, чтобы показать работу планировщика.', 'info');
  }

  setInterval(globalTick, GLOBAL_TICK_MS);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
