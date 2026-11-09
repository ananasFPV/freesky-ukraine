/**
 * Free Sky Ukraine — приймання заявок з сайту.
 * Кожна заявка дописується рядком у цю Google-таблицю
 * і надсилається повідомленням у Telegram.
 *
 * Налаштування (Project Settings → Script Properties):
 *   BOT_TOKEN — токен бота від @BotFather
 *   CHAT_ID   — куди слати: id менеджера або робочого чату
 */

var SHEET_NAME = 'Заявки';
var HEADERS = ['Дата', "Ім'я батьків", 'Телефон', 'Вік дитини', 'Місто', 'Батьки військові', 'Мова сайту'];

function doPost(e) {
  var p = (e && e.parameter) || {};

  // пастка для ботів: справжні люди це поле не бачать
  if (p.website) return json({ ok: true });

  var phone = String(p.phone || '').trim().slice(0, 30);
  var row = [
    new Date(),
    clean(p.parent, 80),
    "'" + phone, // апостроф: щоб номер лишився текстом із плюсом
    clean(p.age, 3),
    clean(p.city, 20),
    clean(p.mil, 5),
    clean(p.lang, 5)
  ];
  if (!row[1] || !phone) return json({ ok: false, error: 'empty' });

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet().appendRow(row);
  } finally {
    lock.releaseLock();
  }

  var text = '🛩 Нова заявка на пробне\n\n' +
    "Ім'я: " + row[1] + '\n' +
    'Телефон: ' + phone + '\n' +
    'Вік дитини: ' + row[3] + '\n' +
    'Місто: ' + row[4] + '\n' +
    'Батьки військові: ' + row[5] +
    (row[6] === 'en' ? '\n(заповнено англійською версією сайту)' : '');

  try {
    sendTelegram(text);
  } catch (err) {
    // заявка вже в таблиці, тож не губимо її через збій Telegram
    console.error(err);
  }

  return json({ ok: true });
}

function sendTelegram(text) {
  var props = PropertiesService.getScriptProperties();
  var token = getToken();
  var chatId = props.getProperty('CHAT_ID');
  if (!token || !chatId) throw new Error('BOT_TOKEN або CHAT_ID не задані');

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    payload: { chat_id: chatId, text: text },
    muteHttpExceptions: true
  });
}

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function clean(v, max) {
  v = String(v == null ? '' : v).trim().slice(0, max);
  // щоб таблиця не сприйняла текст як формулу
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Допоміжне: напишіть боту /start (або додайте його в робочий чат і напишіть там),
 * потім запустіть цю функцію і подивіться в журнал виконання — там буде CHAT_ID.
 */
function findChatId() {
  var token = getToken();
  if (!token) {
    console.log('BOT_TOKEN не знайдено. Додайте його у Налаштування проєкту → Властивості скрипта.');
    return;
  }

  var me = tg(token, 'getMe');
  if (!me.ok) {
    console.log('Telegram не впізнав токен (' + me.description + '). ' +
      'Скопіюйте токен з @BotFather ще раз: лише сам токен вигляду 1234567890:AA..., без слова bot, лапок і пробілів.');
    return;
  }
  console.log('Бот знайдений: @' + me.result.username);

  var updates = tg(token, 'getUpdates').result || [];
  if (!updates.length) {
    console.log('Повідомлень немає. Напишіть боту @' + me.result.username + ' /start і запустіть ще раз.');
    return;
  }
  updates.forEach(function (u) {
    var chat = (u.message || u.my_chat_member || u.channel_post || {}).chat;
    if (chat) console.log('CHAT_ID: ' + chat.id + '  (' + (chat.title || chat.first_name || '') + ')');
  });
}

function getToken() {
  var t = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') || '';
  // прибираємо пробіли, лапки й випадково скопійоване слово "bot"
  return t.replace(/[\s"']/g, '').replace(/^bot(?=\d)/i, '');
}

function tg(token, method) {
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, { muteHttpExceptions: true });
  return JSON.parse(res.getContentText());
}

/** Перевірка: надсилає тестову заявку, як із сайту. */
function testSubmit() {
  doPost({ parameter: { parent: 'Тест', phone: '+380000000000', age: '9', city: 'Київ', mil: 'ні', lang: 'uk' } });
}
