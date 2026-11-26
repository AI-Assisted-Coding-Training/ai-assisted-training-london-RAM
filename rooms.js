const form = document.querySelector('#room-form');
const nameInput = document.querySelector('#display-name');
const connectButton = document.querySelector('#connect');
const room = document.querySelector('#room');
const roster = document.querySelector('#roster');
const joinUrl = document.querySelector('#join-url');
const joinQr = document.querySelector('#join-qr');
const joinQrImage = joinQr.querySelector('img');
const feedback = document.querySelector('#feedback');
const deck = document.querySelector('#vote-deck');
const reveal = document.querySelector('#reveal');
const startVoting = document.querySelector('#start-voting');
const skipDiscussion = document.querySelector('#skip-discussion');
const roundTimer = document.querySelector('#round-timer');
const saveForm = document.querySelector('#save-estimate');
const itemInput = document.querySelector('#item-name');
const estimateInput = document.querySelector('#agreed-estimate');
const historyList = document.querySelector('#history-list');
const historyEmpty = document.querySelector('#history-empty');
const discussionDuration = 60_000;
const votingDuration = 10_000;
const historyLimit = 20;
// The contract has no history API, so each saved estimate is an extra
// connection whose display name (max 32 chars) encodes "§index|estimate|item".
const historyName = /^§(\d{1,2})\|([^|]{1,4})\|(.{1,20})$/;
const estimates = ['1', '2', '3', '5', '8', '13', '21', '?'];
const roomHash = /^#\/room\/([a-z0-9]{4,32}(?:-[a-z0-9]{4,32})*)$/;
let socket;
let targetRoom;
let phase = 'idle';
let deadline;
let timerTick;
const savedEstimates = new Map();
const historySockets = new Map();

function parseHistoryEntry(name) {
  const match = historyName.exec(name);
  const index = Number(match?.[1]);
  return index >= 1 && index <= historyLimit
    ? { index, estimate: match[2], item: match[3] } : undefined;
}

function renderHistory() {
  const entries = [...savedEstimates.values()].sort((a, b) => a.index - b.index);
  historyList.replaceChildren(...entries.map(({ item, estimate }) => {
    const entry = document.createElement('li');
    const name = document.createElement('span');
    const value = document.createElement('span');
    name.textContent = item;
    value.className = 'chip';
    value.textContent = estimate;
    entry.append(name, value);
    return entry;
  }));
  historyEmpty.hidden = entries.length > 0;
}

function nextHistoryIndex() {
  return Math.max(0, ...savedEstimates.keys(), ...historySockets.keys()) + 1;
}

function closeHistorySockets() {
  const sockets = [...historySockets.values()];
  historySockets.clear();
  for (const historySocket of sockets) historySocket.close();
}

function stopTimer() {
  clearTimeout(timerTick);
  phase = 'idle';
  deadline = undefined;
  roundTimer.hidden = true;
  skipDiscussion.hidden = true;
}

for (const value of estimates) {
  const card = document.createElement('button');
  card.type = 'button';
  card.value = value;
  card.textContent = value;
  card.setAttribute('aria-pressed', 'false');
  deck.append(card);
}

function selectCard(value) {
  for (const card of deck.querySelectorAll('button')) {
    card.setAttribute('aria-pressed', String(card.value === value));
  }
}

function sendRoundAction(message) {
  if (socket?.readyState !== WebSocket.OPEN) {
    feedback.textContent = 'Not connected. Join the room again to continue.';
    return false;
  }
  socket.send(JSON.stringify(message));
  return true;
}

deck.addEventListener('click', event => {
  const card = event.target;
  if (card instanceof HTMLButtonElement && !deck.disabled) {
    if (sendRoundAction({ type: 'vote', value: card.value })) selectCard(card.value);
  }
});

function showForm() {
  stopTimer();
  closeHistorySockets();
  savedEstimates.clear();
  renderHistory();
  saveForm.hidden = true;
  selectCard();
  const hash = location.hash;
  targetRoom = roomHash.exec(hash)?.[1];
  if (targetRoom?.length > 128) targetRoom = undefined;
  form.hidden = false;
  room.hidden = true;
  roster.replaceChildren();
  connectButton.textContent = hash ? 'Join room' : 'Create room';
  connectButton.disabled = Boolean(hash && !targetRoom);
  feedback.textContent = connectButton.disabled ? 'This join URL is invalid.' : '';
}

function badge(className, text, state) {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  if (state) element.dataset.state = state;
  return element;
}

function renderRoster({ users, hostId, revealed, votes }, userId) {
  roster.replaceChildren(...users.map(({ id, name, hasVoted }) => {
    let hash = 0;
    for (const char of id) hash = (Math.imul(31, hash) + char.codePointAt(0)) >>> 0;
    const item = document.createElement('li');
    const avatar = badge('avatar', name.split(/\s+/).filter(Boolean).slice(0, 2)
      .map(word => Array.from(word)[0]).join('').toUpperCase());
    avatar.setAttribute('aria-hidden', 'true');
    avatar.style.setProperty('--hue', (Math.imul(hash, 0x9e3779b1) >>> 0) % 360);
    item.append(avatar, badge('name', name));
    if (id === userId) item.append(badge('tag', 'You'));
    if (id === hostId) item.append(badge('tag', 'Host', 'host'));
    if (revealed && Object.keys(votes).length) {
      item.append(Object.hasOwn(votes, id) ? badge('chip', votes[id], 'value')
        : badge('chip', 'No vote', 'none'));
    } else if (!revealed) {
      item.append(hasVoted ? badge('chip', '✓ Voted', 'voted') : badge('chip', 'Not voted', 'waiting'));
    }
    return item;
  }));
}

nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
form.addEventListener('submit', event => {
  event.preventDefault();
  if (socket || connectButton.disabled) return;
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.setCustomValidity('Enter a display name.');
    nameInput.reportValidity();
    return;
  }
  const joining = Boolean(targetRoom);
  const roomId = targetRoom ?? Array.from(crypto.getRandomValues(new Uint8Array(12)),
    byte => byte.toString(16).padStart(2, '0')).join('');
  const url = new URL('wss://planning-poker-backend-ymq7.onrender.com/ws');
  url.search = new URLSearchParams({ room: roomId, name });
  const connection = new WebSocket(url);
  socket = connection;
  let userId;
  let entered = false;
  let revealPending = false;
  let resetPending = false;
  let canSave = false;
  let presentEntries = new Set();
  let state;
  function openHistorySocket(index, { item, estimate }) {
    const historyUrl = new URL(url);
    historyUrl.searchParams.set('name', `§${index}|${estimate}|${item}`);
    const historySocket = new WebSocket(historyUrl);
    let opened = false;
    historySockets.set(index, historySocket);
    historySocket.addEventListener('open', () => { opened = true; });
    historySocket.addEventListener('close', () => {
      if (historySockets.get(index) !== historySocket) return;
      historySockets.delete(index);
      if (socket !== connection) return;
      if (savedEstimates.has(index)) {
        if (opened) restoreHistory();
        return;
      }
      canSave = true;
      feedback.textContent = 'Could not save the estimate. The room may be full.';
      if (state) updateRound();
    });
  }
  // History connections close with the host, so a newly promoted host
  // re-opens any entries it has seen that are no longer in the room.
  function restoreHistory() {
    if (state?.hostId !== userId) return;
    for (const [index, entry] of savedEstimates) {
      if (!presentEntries.has(index) && !historySockets.has(index)) openHistorySocket(index, entry);
    }
  }
  function requestReveal() {
    if (revealPending) return;
    revealPending = sendRoundAction({ type: 'reveal' });
    reveal.disabled = revealPending;
  }
  function openVoting() {
    phase = 'voting';
    deadline = Date.now() + votingDuration;
    resetPending = sendRoundAction({ type: 'reset' });
    if (!resetPending) stopTimer();
  }
  reveal.onclick = () => {
    if (!reveal.hidden && !reveal.disabled) requestReveal();
  };
  // The backend rejects votes while revealed, so the host keeps the room
  // revealed until voting opens and then sends reset to unlock it for everyone.
  function updateRound() {
    const isHost = state.hostId === userId;
    const now = Date.now();
    if (!isHost) {
      stopTimer();
      canSave = false;
    } else if (state.revealed) {
      if (phase === 'voting' && !resetPending) {
        stopTimer();
        canSave = true;
      }
    } else if (phase !== 'voting' && !revealPending) {
      if (state.users.some(user => user.hasVoted)) {
        phase = 'voting';
        deadline = now + votingDuration;
      } else {
        requestReveal();
      }
    }
    if (phase === 'discussion' && now >= deadline) openVoting();
    clearTimeout(timerTick);
    roundTimer.hidden = false;
    if (phase === 'idle') {
      roundTimer.dataset.state = state.revealed ? 'closed' : 'open';
      roundTimer.textContent = state.revealed
        ? 'Voting is closed. Waiting for the host to start voting.' : 'Voting is open.';
    } else {
      const left = Math.max(0, deadline - now);
      roundTimer.dataset.state = phase === 'voting' && left <= 5000 ? 'urgent' : phase;
      roundTimer.textContent = `${phase === 'discussion' ? 'Discussion' : 'Voting'}: ${Math.ceil(left / 1000)}s`;
      if (left) timerTick = setTimeout(updateRound, left % 1000 || 1000);
    }
    deck.disabled = state.revealed;
    startVoting.hidden = !isHost || !state.revealed || phase !== 'idle';
    startVoting.disabled = revealPending;
    skipDiscussion.hidden = phase !== 'discussion';
    reveal.hidden = !isHost || state.revealed;
    reveal.disabled = revealPending;
    saveForm.hidden = !isHost || !state.revealed || phase !== 'idle' || !canSave
      || nextHistoryIndex() > historyLimit;
    const allVoted = state.users.length && state.users.every(user => user.hasVoted);
    if (phase === 'voting' && !state.revealed && !resetPending && (now >= deadline || allVoted)) {
      requestReveal();
    }
  }
  startVoting.onclick = () => {
    if (startVoting.hidden || startVoting.disabled) return;
    canSave = false;
    phase = 'discussion';
    deadline = Date.now() + discussionDuration;
    updateRound();
  };
  skipDiscussion.onclick = () => {
    if (phase !== 'discussion') return;
    openVoting();
    updateRound();
  };
  saveForm.onsubmit = submitEvent => {
    submitEvent.preventDefault();
    const item = itemInput.value.trim();
    const estimate = estimateInput.value.trim();
    if (saveForm.hidden || !item || !estimate || estimate.includes('|')) {
      feedback.textContent = 'Enter an item and an agreed estimate without "|".';
      return;
    }
    canSave = false;
    openHistorySocket(nextHistoryIndex(), { item, estimate });
    saveForm.reset();
    feedback.textContent = '';
    updateRound();
  };
  connectButton.disabled = true;
  feedback.textContent = 'Connecting…';

  connection.addEventListener('message', event => {
    if (socket !== connection) return;
    const message = JSON.parse(event.data);
    if (message.type === 'welcome') userId = message.userId;
    if (message.type === 'error') {
      revealPending = false;
      reveal.disabled = false;
      startVoting.disabled = false;
      feedback.textContent = message.message;
      if (resetPending) {
        resetPending = false;
        stopTimer();
        updateRound();
      }
      return;
    }
    if (message.type !== 'state' || !userId) return;
    const people = [];
    presentEntries = new Set();
    for (const user of message.users) {
      const entry = parseHistoryEntry(user.name);
      if (!entry) {
        people.push(user);
        continue;
      }
      presentEntries.add(entry.index);
      if (!savedEstimates.has(entry.index)) savedEstimates.set(entry.index, entry);
    }
    const wasRevealed = state?.revealed !== false;
    state = { ...message, users: people };
    renderRoster(state, userId);
    if (wasRevealed && !message.revealed) selectCard();
    renderHistory();
    if (message.revealed) revealPending = false;
    else resetPending = false;
    updateRound();
    restoreHistory();
    if (!entered) {
      entered = true;
      if (!joining) history.pushState(null, '', `#/room/${roomId}`);
      joinUrl.value = location.href;
      form.hidden = true;
      room.hidden = false;
      feedback.textContent = '';
      joinQr.hidden = true;
      joinQrImage.removeAttribute('src');
      try {
        const code = qrcode(0, 'M');
        code.addData(joinUrl.value);
        code.make();
        joinQrImage.src = code.createDataURL(4);
        joinQr.hidden = false;
      } catch (error) {
        console.error('Could not generate the room QR code:', error);
        feedback.textContent = 'Could not generate a QR code. You can still copy the join URL.';
      }
      document.querySelector('#room-heading').focus();
    }
  });

  connection.addEventListener('close', () => {
    if (socket !== connection) return;
    socket = undefined;
    showForm();
    feedback.textContent = entered ? 'Disconnected. Join again to reconnect.'
      : joining ? 'Could not join. The room may be full or the server unavailable.'
        : 'Could not create room. Please try again.';
  });
});

document.querySelector('#copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(joinUrl.value);
    feedback.textContent = 'Join URL copied.';
  } catch {
    joinUrl.select();
    feedback.textContent = 'Could not copy automatically. Copy the selected URL manually.';
  }
});

function leaveRoom() {
  const previous = socket;
  socket = undefined;
  closeHistorySockets();
  previous?.close();
  showForm();
}

document.querySelector('#leave').addEventListener('click', () => {
  history.pushState(null, '', location.href.split('#')[0]);
  leaveRoom();
  nameInput.focus();
});
window.addEventListener('hashchange', leaveRoom);
showForm();
