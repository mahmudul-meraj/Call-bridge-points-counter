const STORAGE_KEY = "call_bridge_scoreboard_v1";

const defaultState = {
  players: ["Player 1", "Player 2", "Player 3", "Player 4"],
  rounds: []
};

let state = loadState();

const playersContainer = document.getElementById("players");
const roundsBody = document.getElementById("rounds-body");
const winnerBox = document.getElementById("winner-box");
const addRoundBtn = document.getElementById("add-round-btn");
const resetBtn = document.getElementById("reset-btn");
const exportBtn = document.getElementById("export-btn");

addRoundBtn.addEventListener("click", addRound);
resetBtn.addEventListener("click", resetAll);
exportBtn.addEventListener("click", exportData);

render();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultState };
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.players) || !Array.isArray(parsed.rounds)) {
      return { ...defaultState };
    }
    while (parsed.players.length < 4) parsed.players.push(`Player ${parsed.players.length + 1}`);
    parsed.players = parsed.players.slice(0, 4).map((name, i) => (name || `Player ${i + 1}`).toString());
    parsed.rounds = parsed.rounds.map((round) => {
      const safeRound = [0, 0, 0, 0];
      if (Array.isArray(round)) {
        for (let i = 0; i < 4; i += 1) {
          const n = Number(round[i]);
          safeRound[i] = Number.isFinite(n) ? n : 0;
        }
      }
      return safeRound;
    });
    return parsed;
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderPlayers();
  renderRounds();
  renderTotalsAndWinner();
}

function renderPlayers() {
  playersContainer.innerHTML = "";

  state.players.forEach((name, index) => {
    const card = document.createElement("div");
    card.className = "player-card";

    const label = document.createElement("label");
    label.textContent = `Player ${index + 1} Name`;

    const input = document.createElement("input");
    input.type = "text";
    input.value = name;
    input.placeholder = `Player ${index + 1}`;
    input.addEventListener("input", (e) => {
      state.players[index] = e.target.value.trim() || `Player ${index + 1}`;
      saveState();
      updateTableHeaders();
      renderTotalsAndWinner();
    });

    card.append(label, input);
    playersContainer.appendChild(card);
  });

  updateTableHeaders();
}

function updateTableHeaders() {
  for (let i = 0; i < 4; i += 1) {
    const cell = document.querySelector(`[data-player-header="${i}"]`);
    if (cell) cell.textContent = state.players[i] || `Player ${i + 1}`;
  }
}

function renderRounds() {
  roundsBody.innerHTML = "";

  if (state.rounds.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="6" style="color:#6b7280;">No rounds yet. Click \"Add Round\" to start.</td>`;
    roundsBody.appendChild(emptyRow);
    return;
  }

  state.rounds.forEach((round, roundIndex) => {
    const tr = document.createElement("tr");

    const roundNo = document.createElement("td");
    roundNo.textContent = String(roundIndex + 1);
    tr.appendChild(roundNo);

    for (let playerIndex = 0; playerIndex < 4; playerIndex += 1) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      input.className = "round-input";
      input.value = String(round[playerIndex] ?? 0);
      input.setAttribute("aria-label", `Round ${roundIndex + 1}, ${state.players[playerIndex]} points`);
      input.addEventListener("input", (e) => {
        const value = Number(e.target.value);
        state.rounds[roundIndex][playerIndex] = Number.isFinite(value) ? value : 0;
        saveState();
        renderTotalsAndWinner();
      });
      td.appendChild(input);
      tr.appendChild(td);
    }

    const actionsTd = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-round";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      state.rounds.splice(roundIndex, 1);
      saveState();
      render();
    });

    actionsTd.appendChild(deleteBtn);
    tr.appendChild(actionsTd);

    roundsBody.appendChild(tr);
  });
}

function addRound() {
  state.rounds.push([0, 0, 0, 0]);
  saveState();
  render();
}

function getTotals() {
  const totals = [0, 0, 0, 0];

  state.rounds.forEach((round) => {
    for (let i = 0; i < 4; i += 1) {
      totals[i] += Number(round[i]) || 0;
    }
  });

  return totals;
}

function renderTotalsAndWinner() {
  const totals = getTotals();

  for (let i = 0; i < 4; i += 1) {
    const totalCell = document.querySelector(`[data-total="${i}"]`);
    if (totalCell) totalCell.textContent = String(totals[i]);
  }

  const max = Math.max(...totals);
  const winners = totals
    .map((total, index) => ({ total, index }))
    .filter((item) => item.total === max)
    .map((item) => state.players[item.index]);

  if (state.rounds.length === 0) {
    winnerBox.textContent = "Add rounds to see current winner.";
    return;
  }

  if (winners.length > 1) {
    winnerBox.innerHTML = `Current result: <strong>Tie</strong> between ${winners.join(", ")} (${max} points).`;
  } else {
    winnerBox.innerHTML = `Current leader: <strong>${winners[0]}</strong> with ${max} points.`;
  }
}

function resetAll() {
  const shouldReset = window.confirm("Reset all player names and points? This cannot be undone.");
  if (!shouldReset) return;

  state = { ...defaultState };
  saveState();
  render();
}

function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "call-bridge-scoreboard.json";
  a.click();
  URL.revokeObjectURL(url);
}
