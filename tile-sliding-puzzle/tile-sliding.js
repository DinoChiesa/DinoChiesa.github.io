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
//    page is hung" message, we need to unwrap and "asynchronize"" the loop with
//    setTimeout().
//
// 3. Using a string representation for the data model results in much better
//    performance than using an array of integers. In Javascript anyway,
//    checking for a string in the "closed" list is much faster than checking
//    for the presence of an integer within an array of integers.
//
// 4. Pre-computing the list of adjacent tiles helps with performance too.
//    No searching necessary at runtime. I could've used a memoize for this as well.
//


// created: Fri Feb 26 15:54:58 2021
// last saved: <2022-December-06 15:23:34>

/* jshint esversion:9, node:false, browser:true, strict:implied */
/* global console, jQuery */

const $ = jQuery;
const EMPTY ='&nbsp;';
let datamodel = '123456789abcdef0';

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
  let $main = $('#main');
  for(let i = 0; i < 4; i++) {
    let $rowdiv = $(`<div class='row' data-row="${i}"></div>\n`);
    for(let j = 0; j < 4; j++) {
      let ix = i * 4 + j;
      let value = parseInt(datamodel.substr(ix,1), 16);
      let content = EMPTY;
      let $celldiv = $(`<div class='cell' data-col="${j}"><div data-col="${j}" data-row="${i}"id='c-${i}-${j}' class='data'>${content}</div></div>\n`);
      $rowdiv.append($celldiv);
    }
    $main.append($rowdiv);
  }
}

function paintGrid() {
  for(let i = 0; i < 4; i++) {
    for(let j = 0; j < 4; j++) {
      let ix = i * 4 + j;
      let value = parseInt(datamodel.substr(ix,1), 16);
      let id = `c-${i}-${j}`;
      let $dataCell = $(`#${id}`);
      let currentContent = $dataCell.html();
      if (value == 0){
        if (currentContent != EMPTY) {
          $dataCell.html(EMPTY);
        }
      }
      else if (value != Number(currentContent)) {
          $dataCell.html(value);
      }
    }
  }
  updateDistance();
}

function isAdjacent(a, b) {
  return adjacentTiles[a].indexOf(b)>=0;
}

function getOpenCell(model) {
  model = model || datamodel;
  for(let i = 0; i < 4; i++) {
    for(let j = 0; j < 4; j++) {
      let ix = i * 4 + j;
      let value = model[ix];
      if (value == '0') {
        return {row:i, col:j};
      }
    }
  }
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

function cellClick(event) {
  let $dataDiv = $(this),
      row = Number($dataDiv.data('row')),
      col = Number($dataDiv.data('col')),
      clickedIndex = row * 4 + col;

  let openCell = findAdjacentOpenCell(clickedIndex);
  if (typeof openCell == 'number') {
    move(clickedIndex, openCell);
  }
}

function updateDistance() {
  $('#distance').html('<span>distance: ' + aggregateManhattanDistance(datamodel) + '</span>');
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

const delay = (interval)  => new Promise(resolve => setTimeout(resolve, interval));

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

function solve() {
  $('#solveit').prop('disabled', true);
  $('#notes').html('thinking...');

  let goal = '123456789abcdef0';
  let openCell = getOpenCell();

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

      if (chosen.isState(goal)) {
        // follow chosen parents to the beginning
        let current = chosen;
        let nodes = [current];
        while (current.parent != null) {
          nodes.push(current.parent);
          current = current.parent;
        }
        nodes.reverse();

        // now, convert those state changes into "moves."
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
        if ( ! closed.find(a => a.isState(state))) {
          // not already traversed
          let g = chosen.g + 1;
          if ( ! open.find(openitem =>
                           (openitem.isState(state) && g > openitem.g))) {
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

function doReset() {
  return shuffleGrid()
    .then (_ => {
      updateDistance();
      $('#solveit').prop('disabled', false);
    });
}

function animateSolution(indexes) {
  $('#notes')
    .html(`solution steps: ${indexes.length-1}`);
  let p = delay(1800);
  for (let i = 1; i < indexes.length; i++) {
    p = p
      .then(_ => delay(180))
      .then(_ => move(indexes[i - 1]))
      .then(_ => $('#notes').html(`solution steps: ${i}/${indexes.length-1}`));
  }
  return p.then(doReset);
}

function shuffleGrid() {
  // Cannot just randomly shuffle values. That can result in unsolvable
  // puzzles. About half of the arrangements are unsolvable.  So we shuffle by
  // mimicing a tile move, and animating the same.

  // With a thorough shuffle, it takes a long time to find the solution.
  // Sometimes it takes 160 moves or more.

  const NUM_MOVES = Math.floor(Math.random() * 306) + 525,
        DELAY_BETWEEN_MOVES = 5;
  const swapOne =
    () => new Promise(resolve => {
      let possibleTiles = possibleTilesToMove();
      let chosenMoveIdx = Math.floor(Math.random() * possibleTiles.length);
      let tileToMove = possibleTiles[chosenMoveIdx];
      resolve(move(tileToMove));
    });

  let p = delay(2000)
    .then(_ => $('#notes').html('shuffling...'));
  for (let i = 0; i < NUM_MOVES; i++) {
    p = p
      .then(_ => delay(DELAY_BETWEEN_MOVES))
      .then(swapOne);
  }
  return p.then(_ => $('#notes').html('ready.'));
}


/**
 * @param {String} url - address for the HTML to fetch
 * @return {String} the resulting HTML string fragment
 */
async function fetchHtmlAsText(url) {
  return await (await fetch(url)).text();
}

function dismissExplanation() {
  const contentDiv = document.getElementById("explanation");
  contentDiv.innerHTML = '';
  setElementVisibility(contentDiv, false);
}

async function showExplanation() {
  const contentDiv = document.getElementById("explanation");
  contentDiv.innerHTML = await fetchHtmlAsText("about.htm");
  //contentDiv.classList.add('overlay');
  $('#dismiss').on('click', dismissExplanation);
  setElementVisibility(contentDiv, true);
}

function setElementVisibility(element, visible) {
  if (element) {
    element.classList.add(visible?'visible':'hidden');
    element.classList.remove(visible?'hidden':'visible');
  }
}

$(document).ready(function() {
  initializeGrid();
  paintGrid();
  shuffleGrid()
    .then (_ => {
      updateDistance();
      $('.data').on('click', cellClick);
      $('#solveit').on('click', solve);
      $('#explain').on('click', showExplanation);
      $('#solveit').prop('disabled', false);
      $('#explain').prop('disabled', false);
    });
});
