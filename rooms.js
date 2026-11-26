const form = document.querySelector('#room-form');
const nameInput = document.querySelector('#display-name');
const connectButton = document.querySelector('#connect');
const room = document.querySelector('#room');
const roster = document.querySelector('#roster');
const joinUrl = document.querySelector('#join-url');
const feedback = document.querySelector('#feedback');
const deck = document.querySelector('#vote-deck');
const reveal = document.querySelector('#reveal');
const reset = document.querySelector('#reset');
const startVoting = document.querySelector('#start-voting');
const skipDiscussion = document.querySelector('#skip-discussion');
const roundTimer = document.querySelector('#round-timer');
const discussionDuration = 60_000;
const votingDuration = 20_000;
const estimates = ['1', '2', '3', '5', '8', '13', '21', '?'];
const avatars = ['🚀', '🦊', '🐙', '🐼', '🦉', '🐢', '🐝', '🐬'];
const roomHash = /^#\/room\/([a-z0-9]{4,32}(?:-[a-z0-9]{4,32})*)$/;
let socket;
let targetRoom;
let discussionEnds;
let timerTick;

function stopTimer() {
  clearTimeout(timerTick);
  discussionEnds = undefined;
  roundTimer.hidden = true;
  skipDiscussion.hidden = true;
}

for (const value of estimates) {
  const card = document.createElement('button');
  card.type = 'button';
  card.value = value;
  card.textContent = value;
  deck.append(card);
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
    sendRoundAction({ type: 'vote', value: card.value });
  }
});

function showForm() {
  stopTimer();
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

function renderRoster({ users, hostId, revealed, votes }, userId) {
  roster.replaceChildren(...users.map(({ id, name, hasVoted }) => {
    let hash = 0;
    for (const char of id) hash = (Math.imul(31, hash) + char.codePointAt(0)) >>> 0;
    const item = document.createElement('li');
    const avatar = document.createElement('span');
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = avatars[hash % avatars.length];
    item.append(avatar, ` ${name}${id === userId ? ' (you)' : ''}${id === hostId ? ' (host)' : ''}`);
    const result = revealed && Object.hasOwn(votes, id) ? votes[id] : 'No vote';
    item.append(` — ${revealed ? result : hasVoted ? 'Voted' : 'Not voted'}`);
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
  let state;
  function requestReveal() {
    if (revealPending) return;
    revealPending = sendRoundAction({ type: 'reveal' });
    reveal.disabled = revealPending;
  }
  reveal.onclick = () => {
    if (!reveal.hidden && !reveal.disabled) requestReveal();
  };
  reset.onclick = () => {
    if (!reset.hidden) sendRoundAction({ type: 'reset' });
  };
  function updateRound() {
    const isHost = state.hostId === userId;
    if (!isHost || state.revealed) stopTimer();
    const now = Date.now();
    const discussing = discussionEnds !== undefined && now < discussionEnds;
    skipDiscussion.hidden = !discussing;
    const votingEnds = discussionEnds === undefined ? undefined : discussionEnds + votingDuration;
    const timedOut = votingEnds !== undefined && now >= votingEnds;
    if (votingEnds !== undefined) {
      const deadline = discussing ? discussionEnds : votingEnds;
      const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
      roundTimer.hidden = false;
      roundTimer.textContent = `${discussing ? 'Discussion' : 'Voting'}: ${seconds}s (host only)`;
      clearTimeout(timerTick);
      if (!timedOut) timerTick = setTimeout(updateRound, (deadline - now) % 1000 || 1000);
    }
    deck.disabled = state.revealed || discussing;
    startVoting.hidden = !isHost || state.revealed;
    startVoting.disabled = discussionEnds !== undefined || revealPending || state.users.some(user => user.hasVoted);
    reveal.hidden = !isHost || state.revealed;
    reveal.disabled = discussing || revealPending;
    reset.hidden = !isHost || !state.revealed;
    if (!reveal.hidden && !discussing && (timedOut ||
      (state.users.length && state.users.every(user => user.hasVoted)))) {
      requestReveal();
    }
  }
  startVoting.onclick = () => {
    if (startVoting.hidden || startVoting.disabled) return;
    discussionEnds = Date.now() + discussionDuration;
    updateRound();
  };
  skipDiscussion.onclick = () => {
    const now = Date.now();
    if (discussionEnds === undefined || now >= discussionEnds) return;
    discussionEnds = now;
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
      reveal.disabled = discussionEnds !== undefined && Date.now() < discussionEnds;
      feedback.textContent = message.message;
      return;
    }
    if (message.type !== 'state' || !userId) return;
    renderRoster(message, userId);
    state = message;
    if (message.revealed) revealPending = false;
    updateRound();
    if (!entered) {
      entered = true;
      if (!joining) history.pushState(null, '', `#/room/${roomId}`);
      joinUrl.value = location.href;
      form.hidden = true;
      room.hidden = false;
      feedback.textContent = '';
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
