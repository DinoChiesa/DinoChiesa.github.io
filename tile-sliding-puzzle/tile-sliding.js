// tile-sliding.js
// ------------------------------------------------------------------
//
// This uses the A* algorithm to solve a tile sliding puzzle.
//
// What I found.
//
// 1. For a heuristic, Manhattan distance + linear conflict works better than
//    simple Manhattan distance.
//
// 2. The search takes a while, with many iterations. To avoid the "this web
//    page is hung" message, we need to unwrap and "asynchronize" the loop with
//    setTimeout().
//
// 3. Using a string representation for the "state" results in much better
//    performance than using an array of integers. In Javascript anyway,
//    checking for a string match in the "closed" list is much faster than
//    checking for the match of an array of integers within a 2-D array.
//
// 4. Pre-computing the list of adjacent tiles helps with performance too.
//    No searching necessary at runtime. I could've used a memoize for this
//    as well, but didn't.
//


// created: Fri Feb 26 15:54:58 2021
// last saved: <2022-December-06 15:42:11>

/* jshint esversion:9, node:false, browser:true, strict:implied */
/* global console */

const $sel = (query) => document.querySelector(query),
      $all = (query) => document.querySelectorAll(query);
const GOAL_STATE = '123456789abcdef0';
const EMPTY = '&nbsp;';
let datamodel = GOAL_STATE;

let isSolving = false;
let isShuffling = false;

// the precomputed list of adjacent tiles.
const adjacentTiles = [
        [1, 4],
        [0, 2, 5],
        [1, 3, 6],
        [2, 7],
        [0, 5, 8],
        [1, 4, 6, 9],
        [2, 5, 7, 10],
        [3, 6, 11],
        [4, 9, 12],
        [5, 8, 10, 13],
        [6, 9, 11, 14],
        [7, 10, 15],
        [8, 13],
        [9, 12, 14],
        [10, 13, 15],
        [11, 14]
      ];

function initializeGrid() {
  let main = $sel('#main');
  let html = '';
  for (let i = 0; i < 4; i++) {
    html += `<div class='row' data-row="${i}">\n`;
    for (let j = 0; j < 4; j++) {
      let ix = i * 4 + j;
      let value = parseInt(datamodel.substr(ix, 1), 16);
      let content = EMPTY;
      html += `<div class='cell' data-col="${j}"><div data-col="${j}" data-row="${i}" data-index="${ix}" id='c-${i}-${j}' class='data empty'>${content}</div></div>\n`;
    }
    html += `</div>\n`;
  }
  main.innerHTML = html;
}

function isSolved() {
  return datamodel === GOAL_STATE;
}

function updateSolveButtonState() {
  const btn = $sel('#solveit');
  if (!btn) return;
  if (isSolving) {
    btn.textContent = 'Solving...';
    btn.disabled = true;
  } else if (isShuffling) {
    btn.textContent = 'Shuffling...';
    btn.disabled = true;
  } else if (isSolved()) {
    btn.textContent = 'Shuffle';
    btn.disabled = false;
  } else {
    btn.textContent = 'Solve It';
    btn.disabled = false;
  }
}

function checkVictory() {
  const notes = $sel('#notes');
  if (!notes) return;
  if (isSolved()) {
    notes.innerHTML = 'Solved! 🎉';
    notes.classList.add('badge-victory');
  } else {
    notes.classList.remove('badge-victory');
  }
  updateSolveButtonState();
}

function paintGrid() {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let ix = i * 4 + j;
      let value = parseInt(datamodel.substr(ix, 1), 16);
      let id = `c-${i}-${j}`;
      let dataCell = document.getElementById(id);
      let currentContent = dataCell.innerHTML;
      if (value == 0) {
        if (currentContent != EMPTY) {
          dataCell.innerHTML = EMPTY;
        }
        dataCell.classList.add('empty');
      }
      else {
        if (value != Number(currentContent)) {
          dataCell.innerHTML = value;
        }
        dataCell.classList.remove('empty');
      }
    }
  }
  updateDistance();
  checkVictory();
}

function isAdjacent(a, b) {
  return adjacentTiles[a].indexOf(b)>=0;
}

function findAdjacentOpenCell(reference) {
  let openIndex = datamodel.indexOf('0');
  if (isAdjacent(reference, openIndex)) {
    return openIndex;
  }
}

function applyChangeToModel(model, index, openIndex) {
  openIndex = openIndex || model.indexOf('0');
  return swapTwoChars(model, index, openIndex);
}

function move(index, open) {
  datamodel = applyChangeToModel(datamodel, index, open);
  paintGrid();
}

function shakeCell(element) {
  if (!element) return;
  element.classList.remove('shake');
  void element.offsetWidth; // trigger reflow
  element.classList.add('shake');
}

function cellClick(_event) {
  if (isSolving || isShuffling) return;
  let clickedIndex = Number(this.dataset.index);
  let openCell = findAdjacentOpenCell(clickedIndex);
  if (typeof openCell == 'number') {
    move(clickedIndex, openCell);
  } else if (!this.classList.contains('empty')) {
    shakeCell(this);
  }
}

function updateDistance() {
  $sel('#distance').innerHTML = '<span>distance: ' + aggregateManhattanDistance(datamodel) + '</span>';
}

function targetPosition(model, cell) {
  let idx = cell.row * 4 + cell.col;
  let value = model[idx];
  if (value == '0') {
    return {row:3, col:3};
  }
  value = parseInt(value, 16);
  let row = Math.floor((value - 1) /4);
  let col = (value - 1) % 4;
  return {row, col};
}

function manhattanDistance(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function aggregateManhattanDistance(model) {
  let aggregate = 0;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let idx = i * 4 + j;
      if (model[idx] != '0') {
        let cell = {row:i, col:j};
        let target = targetPosition(model, cell);
        let additionalDistance = manhattanDistance(cell, target);
        aggregate += additionalDistance;
        if (additionalDistance) {
          // also consider linear conflict
          // horizontal
          if (cell.row == target.row && j < 3) {
            for (let k = j + 1; k < 4; k++) {
              let target2 = targetPosition(model, {row:i, col:k});
              if (target2.row == cell.row && target2.col < target.col) {
                aggregate += 2;
              }
            }
          }
          // vertical
          if (cell.col == target.col && i < 3) {
            for (let k = i + 1; k < 4; k++) {
              let target2 = targetPosition(model, {row:k, col:j});
              if (target2.col == cell.col && target2.row < target.row) {
                aggregate += 2;
              }
            }
          }
        }
      }
    }
  }
  return aggregate;
}

function swapTwoChars(model, aIdx, bIdx) {
  let [lower, upper] = (aIdx < bIdx) ? [aIdx, bIdx] : [bIdx, aIdx];
  return model.substring(0,lower) + model[upper] + model.substring(lower+1, upper) + model[lower] + model.substring(upper + 1);
}

function possibleNextStates(model) {
  model = model || datamodel;
  let openIndex = model.indexOf('0');
  let nextToClick = possibleTilesToMove(model, openIndex);
  let states = nextToClick.map(ix => swapTwoChars(model, openIndex, ix));
  return states;
}

function possibleTilesToMove(model, openIndex) {
  model = model || datamodel;
  openIndex = openIndex || model.indexOf('0');
  return adjacentTiles[openIndex];
}

const delay = (interval) => new Promise(resolve => setTimeout(resolve, interval));

class Node {
  constructor(state) {
    this.state = state;
    this.g = 0; // cost of moving from first state to current state
    this.h = 0; // heuristic cost of getting to target state
    this.f = 0; // sum of the two above
    this.closed = false;
    this.open = false;
    this.parent = null;
   }
   isState(state) {
    return this.state == state;
  }
  equals(node) {
    return this.state == node.state;
  }
}

function indexOfCellToClick(fromState, toState) {
  let idx = toState.indexOf('0');
  return idx;
}

async function animateSolution(indexes) {
  $sel('#notes').innerHTML = `solution steps: ${indexes.length - 1}`;
  await delay(800);
  for (let i = 1; i < indexes.length; i++) {
    await delay(160);
    move(indexes[i - 1]);
    $sel('#notes').innerHTML = `step: ${i}/${indexes.length - 1}`;
  }
  isSolving = false;
  checkVictory();
}

function solve() {
  if (isSolving || isShuffling) return;
  isSolving = true;
  updateSolveButtonState();
  $sel('#notes').innerHTML = 'thinking...';

  let open = [],
      closed = [];

  open.push(new Node(datamodel));

  function step() {
    if (open.length > 0) {
      // choose next node to minimize cost
      let chosen = open.reduce((acc, item) => (acc.f > item.f) ? item : acc);

      // place this chosen node on the closed list.
      chosen.closed = true;
      closed.push(chosen);
      open = open.filter(item => !item.equals(chosen));

      if (chosen.isState(GOAL_STATE)) {
        // follow chosen parents to the beginning
        let current = chosen;
        let nodes = [current];
        while (current.parent != null) {
          nodes.push(current.parent);
          current = current.parent;
        }
        nodes.reverse();

        // convert state changes into moves
        let indexes = nodes
          .map(node => node.state)
          .map((state, ix, a) => {
            if (ix < a.length - 1) {
              return indexOfCellToClick(state, a[ix + 1]);
            }
          });

        return animateSolution(indexes);
      }

      let possible = possibleNextStates(chosen.state);

      possible.forEach(state => {
        if (!closed.find(a => a.isState(state))) {
          // not already traversed
          let g = chosen.g + 1;
          if (!open.find(openitem => (openitem.isState(state) && g > openitem.g))) {
            let child = new Node(state);
            child.parent = chosen;
            child.h = aggregateManhattanDistance(child.state);
            child.f = child.g + child.h;
            open.push(child);
          }
        }
      });
    }
    setTimeout(step, 1);
  }
  step();
}

async function shuffleGrid() {
  if (isSolving || isShuffling) return;
  isShuffling = true;
  updateSolveButtonState();
  $sel('#notes').innerHTML = 'shuffling...';
  await delay(120);

  const numMoves = Math.floor(Math.random() * 25) + 60;
  let lastMove = -1;

  for (let i = 0; i < numMoves; i++) {
    const openIndex = datamodel.indexOf('0');
    let possible = adjacentTiles[openIndex];
    if (possible.length > 1 && lastMove !== -1) {
      const filtered = possible.filter(ix => ix !== lastMove);
      if (filtered.length > 0) possible = filtered;
    }
    const chosenMove = possible[Math.floor(Math.random() * possible.length)];
    lastMove = openIndex;
    move(chosenMove, openIndex);
    await delay(6);
  }

  isShuffling = false;
  $sel('#notes').innerHTML = 'ready.';
  updateDistance();
  updateSolveButtonState();
}

function handleSolveOrShuffle() {
  if (isSolved()) {
    shuffleGrid();
  } else {
    solve();
  }
}

function handleKeyDown(event) {
  // If modal is open, Escape closes it
  const explanation = $sel('#explanation');
  if (explanation && !explanation.classList.contains('hidden')) {
    if (event.key === 'Escape') {
      dismissExplanation();
    }
    return;
  }

  if (isSolving || isShuffling) return;

  const openIndex = datamodel.indexOf('0');
  const openRow = Math.floor(openIndex / 4);
  const openCol = openIndex % 4;

  let targetRow = openRow;
  let targetCol = openCol;

  switch (event.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      targetRow = openRow + 1;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      targetRow = openRow - 1;
      break;
    case 'ArrowLeft':
    case 'd':
    case 'D':
      targetCol = openCol + 1;
      break;
    case 'ArrowRight':
    case 'a':
    case 'A':
      targetCol = openCol - 1;
      break;
    default:
      return;
  }

  if (targetRow >= 0 && targetRow < 4 && targetCol >= 0 && targetCol < 4) {
    event.preventDefault();
    const targetIndex = targetRow * 4 + targetCol;
    move(targetIndex, openIndex);
  } else {
    event.preventDefault();
    shakeCell($sel('#main'));
  }
}

function dismissExplanation() {
  const contentDiv = document.getElementById("explanation");
  setElementVisibility(contentDiv, false);
}

function showExplanation() {
  const contentDiv = document.getElementById("explanation");
  setElementVisibility(contentDiv, true);
}

function setElementVisibility(element, visible) {
  if (element) {
    element.classList.add(visible?'visible':'hidden');
    element.classList.remove(visible?'hidden':'visible');
  }
}

document.addEventListener("DOMContentLoaded", (_event) => {
  initializeGrid();
  paintGrid();

  $sel('#dismiss').addEventListener('click', dismissExplanation);

  // Close modal when clicking on dark backdrop
  const overlay = $sel('#explanation');
  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        dismissExplanation();
      }
    });
  }

  // Keyboard navigation (Arrow keys, WASD, Escape)
  window.addEventListener('keydown', handleKeyDown);

  $all('.data').forEach(el => el.addEventListener('click', cellClick));
  $sel('#solveit').addEventListener('click', handleSolveOrShuffle);
  $sel('#explain').addEventListener('click', showExplanation);

  // Initial shuffle on load
  shuffleGrid().then(_ => {
    $sel('#explain').disabled = false;
  });
});
