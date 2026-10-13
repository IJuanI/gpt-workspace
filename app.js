(() => {
const { GameEngine, SoundKit } = window;
const $ = selector => document.querySelector(selector);
const homeScreen = $('#home-screen');
const gameScreen = $('#game-screen');
const configDialog = $('#config-dialog');
const pauseDialog = $('#pause-dialog');
const resultDialog = $('#result-dialog');
const configFields = $('#config-fields');
const sound = new SoundKit();

const modeInfo = {
  rooftop: { title: 'Saltos por los techos', description: 'Toca para saltar. Si vuelves a tocar en el aire, ¡haces un doble salto!', hint: 'Toca para saltar · Toca otra vez en el aire para el doble salto' },
  space: { title: 'Camión espacial', description: 'El camión tiene tres carriles. Toca el carril al que quieras moverte.', hint: 'Toca uno de los tres carriles para cambiar de rumbo' },
  sorting: { title: '¡Cada cosa en su caja!', description: 'Arrastra cada objeto a la caja de su mismo color.', hint: 'Arrastra cada objeto hasta la caja del mismo color' },
};

const gameConfigs = {
  rooftop: { duration: 90, difficulty: 'suave' },
  space: { duration: 90, difficulty: 'suave' },
  sorting: { count: 15 },
};

let selectedMode = null;
let activeMode = null;
let activeConfig = null;
let engine;

function setupModeCards() {
  const buttons = [...document.querySelectorAll('.choose-button')];
  buttons.forEach((button, index) => {
    if (!button.dataset.mode) button.dataset.mode = ['rooftop', 'space', 'sorting'][index];
    button.addEventListener('click', () => openConfig(button.dataset.mode));
  });
}

function openConfig(mode) {
  if (!modeInfo[mode]) return;
  selectedMode = mode;
  const info = modeInfo[mode];
  $('#config-title').textContent = info.title;
  $('#config-description').textContent = info.description;
  configFields.replaceChildren();
  if (mode === 'sorting') {
    configFields.append(makeSelect('Cantidad de objetos', 'count', [
      ['10', '10 objetos · rapidito'], ['15', '15 objetos · recomendado'], ['20', '20 objetos'], ['30', '30 objetos · ¡todo un reto!'],
    ], String(gameConfigs.sorting.count)));
  } else {
    configFields.append(makeSelect('Duración de la partida', 'duration', [
      ['60', '1 minuto'], ['90', '1 minuto y medio'], ['120', '2 minutos'],
    ], String(gameConfigs[mode].duration)));
    configFields.append(makeSelect('Cantidad de obstáculos', 'difficulty', [
      ['suave', 'Suave · pocos obstáculos'], ['media', 'Media · un poco más'], ['alta', 'Alta · ¡a toda aventura!'],
    ], gameConfigs[mode].difficulty));
  }
  configDialog.showModal();
}

function makeSelect(label, key, options, selected) {
  const wrapper = document.createElement('label');
  wrapper.className = 'field-label';
  wrapper.append(document.createTextNode(label));
  const select = document.createElement('select');
  select.name = key;
  select.setAttribute('aria-label', label);
  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = value; option.textContent = text; option.selected = value === selected;
    select.append(option);
  }
  wrapper.append(select);
  return wrapper;
}

function readConfig() {
  const data = new FormData($('#config-form'));
  if (selectedMode === 'sorting') return { count: Number(data.get('count')) || 15 };
  return { duration: Number(data.get('duration')) || 90, difficulty: data.get('difficulty') || 'suave' };
}

function createEngine() {
  if (engine) engine.stop();
  engine = new GameEngine($('#game-canvas'), {
    jump: () => sound.effect('jump'), collect: () => sound.effect('collect'), hit: () => sound.effect('hit'),
    lane: () => sound.effect('lane'), pick: () => sound.effect('pick'), correct: () => sound.effect('correct'), wrong: () => sound.effect('wrong'),
    onStatus: updateHud,
    onFinish: (score, result) => finishGame(score, result),
  });
}

function startGame(mode = selectedMode, config = readConfig()) {
  if (!mode || !modeInfo[mode]) return;
  activeMode = mode;
  activeConfig = { ...config };
  if (configDialog.open) configDialog.close();
  if (pauseDialog.open) pauseDialog.close();
  if (resultDialog.open) resultDialog.close();
  homeScreen.hidden = true;
  $('#footer-note').hidden = true;
  gameScreen.hidden = false;
  gameScreen.classList.add('is-playing');
  $('#game-title').textContent = modeInfo[mode].title;
  $('#canvas-instructions').textContent = modeInfo[mode].hint;
  $('#game-announcement').textContent = `${modeInfo[mode].title}. ${modeInfo[mode].description}`;
  sound.startMusic();
  if (!engine) createEngine();
  engine.start(mode, config);
  updateHud({ remaining: config.duration ? config.duration : null, score: 0, progress: mode === 'sorting' ? `0/${config.count}` : null });
}

function updateHud(status) {
  const isSort = activeMode === 'sorting';
  $('#hud-left-label').textContent = isSort ? 'Objetos' : 'Tiempo';
  $('#hud-score-label').textContent = isSort ? 'Puntos' : 'Estrellas';
  $('#hud-left').textContent = isSort ? (status.progress || `0/${activeConfig?.count || 15}`) : formatTime(status.remaining || 0);
  $('#hud-score').textContent = String(status.score ?? 0);
  $('.hud-star').textContent = isSort ? '●' : '✦';
}

function formatTime(seconds) {
  const total = Math.ceil(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function finishGame(score, result = {}) {
  engine?.setPaused(true);
  sound.stopMusic();
  $('#result-title').textContent = activeMode === 'sorting' ? '¡Todo en su lugar!' : '¡Aventura completa!';
  $('#result-message').textContent = result.message || '¡Lo hiciste genial!';
  $('#result-score-label').textContent = result.label || (activeMode === 'sorting' ? 'Puntos finales' : 'Estrellas juntadas');
  $('#result-score').textContent = String(score);
  $('#result-score-icon').textContent = result.icon || (activeMode === 'sorting' ? '●' : '✦');
  $('#result-confetti').textContent = activeMode === 'sorting' ? '●　✦　●' : '✦　✧　✦';
  resultDialog.showModal();
}

function goHome() {
  if (engine) engine.stop();
  sound.stopMusic();
  if (configDialog.open) configDialog.close();
  if (pauseDialog.open) pauseDialog.close();
  if (resultDialog.open) resultDialog.close();
  gameScreen.hidden = true;
  homeScreen.hidden = false;
  $('#footer-note').hidden = false;
  gameScreen.classList.remove('is-playing');
  activeMode = null;
  selectedMode = null;
}

function setSoundButton(button, enabled, onLabel, offLabel) {
  button.classList.toggle('is-on', enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.title = enabled ? offLabel : onLabel;
}

setupModeCards();
createEngine();

$('#start-button').addEventListener('click', () => startGame(selectedMode, readConfig()));
$('#brand-home').addEventListener('click', goHome);
$('#back-button').addEventListener('click', goHome);
$('#pause-button').addEventListener('click', () => { engine?.setPaused(true); sound.stopMusic(); pauseDialog.showModal(); });
$('#resume-button').addEventListener('click', () => { pauseDialog.close(); engine?.setPaused(false); sound.startMusic(); });
$('#pause-menu-button').addEventListener('click', goHome);
$('#again-button').addEventListener('click', () => startGame(activeMode, activeConfig));
$('#result-menu-button').addEventListener('click', goHome);

$('#music-toggle').addEventListener('click', async event => {
  const button = event.currentTarget;
  const enabled = !sound.musicOn;
  await sound.setMusic(enabled);
  setSoundButton(button, enabled, 'Activar música', 'Silenciar música');
});

$('#effects-toggle').addEventListener('click', event => {
  const enabled = !sound.effectsOn;
  sound.setEffects(enabled);
  setSoundButton(event.currentTarget, enabled, 'Activar efectos', 'Silenciar efectos');
});

configDialog.addEventListener('close', () => { selectedMode = null; });
configDialog.addEventListener('click', event => { if (event.target === configDialog) configDialog.close(); });
for (const dialog of [pauseDialog, resultDialog]) dialog.addEventListener('cancel', event => event.preventDefault());

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
})();
