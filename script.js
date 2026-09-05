const { ipcRenderer } = require('electron');

const book = document.getElementById('book');
const cover = document.getElementById('cover');
const page2Flipper = document.getElementById('page2-flipper');
const twilightSpread = document.getElementById('twilight-spread');
const page3Flipper = document.getElementById('page3-flipper');
const matrixSpread = document.getElementById('matrix-spread');
const page4Flipper = document.getElementById('page4-flipper');
const gotSpread = document.getElementById('got-spread');
const page5Flipper = document.getElementById('page5-flipper');
const bttfSpread = document.getElementById('bttf-spread');
const page6Flipper = document.getElementById('page6-flipper');
const finalSpread = document.getElementById('final-spread');

const OPEN_TRANSITION_MS = 1200;
const SUCCESS_REVEAL_DELAY_MS = 900;

let bookState = 'closed'; 
let transitionTimer = null;
let dragState = null;
let isSudokuSolved = false;
let successRevealTimer = null;
let successRevealToken = 0;

function cancelSuccessReveal() {
    if (successRevealTimer !== null) {
        clearTimeout(successRevealTimer);
        successRevealTimer = null;
    }
    successRevealToken += 1;
}

function revealSuccessAfterPause(callback) {
    cancelSuccessReveal();
    const token = successRevealToken;
    successRevealTimer = window.setTimeout(() => {
        if (token !== successRevealToken) return;
        successRevealTimer = null;
        callback();
    }, SUCCESS_REVEAL_DELAY_MS);
}

const NOTEBOOK_STATE_KEY = 'userNotebookState';

function readNotebookState() {
    try {
        const saved = JSON.parse(localStorage.getItem(NOTEBOOK_STATE_KEY) || '{}');
        return saved && typeof saved === 'object' ? saved : {};
    } catch (error) {
        return {};
    }
}

let notebookState = readNotebookState();

function saveNotebookState(changes) {
    notebookState = { ...notebookState, ...changes };
    localStorage.setItem(NOTEBOOK_STATE_KEY, JSON.stringify(notebookState));
}

function savePuzzleDraft(key, values, page) {
    saveNotebookState({
        [key]: values,
        currentPage: page
    });
}

function rememberResumePage(page) {
    saveNotebookState({ currentPage: page });
}

function saveProgress(level) {
    const current = parseInt(localStorage.getItem('userProgress')) || 0;
    const nextLevel = Math.max(current, level);
    localStorage.setItem('userProgress', nextLevel);
    saveNotebookState({ level: Math.max(Number(notebookState.level) || 0, nextLevel) });
}

function isInteractiveTarget(target) {
    return target.closest('button, input, .cell, .heart-puzzle-piece, .continue-btn, .start-again-btn');
}

book.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) {
        return;
    }

    const [windowX, windowY] = ipcRenderer.sendSync('window-get-position-sync');
    dragState = {
        startX: event.screenX,
        startY: event.screenY,
        windowX,
        windowY,
        moved: false
    };
    book.setPointerCapture(event.pointerId);
});

book.addEventListener('pointermove', (event) => {
    if (!dragState) return;

    const deltaX = event.screenX - dragState.startX;
    const deltaY = event.screenY - dragState.startY;
    if (!dragState.moved && Math.hypot(deltaX, deltaY) > 4) {
        dragState.moved = true;
    }

    if (dragState.moved) {
        ipcRenderer.send('window-set-position', dragState.windowX + deltaX, dragState.windowY + deltaY);
    }
});

book.addEventListener('pointerup', (event) => {
    if (!dragState) return;

    book.releasePointerCapture(event.pointerId);
    const wasDragged = dragState.moved;
    dragState = null;
    if (wasDragged) {
        book.dataset.preventClick = 'true';
        window.setTimeout(() => delete book.dataset.preventClick, 0);
    }
});

function clearTransitionTimer() {
    if (transitionTimer !== null) {
        clearTimeout(transitionTimer);
        transitionTimer = null;
    }
}

function openBook(afterOpen = null) {
    if (bookState !== 'closed') return;

    clearTransitionTimer();
    bookState = 'opening';
    book.classList.add('is-open');
    cover.classList.remove('settled');
    cover.classList.add('open');

    transitionTimer = window.setTimeout(() => {
        if (bookState === 'opening') {
            bookState = 'open';
            cover.classList.add('settled');
        }
        transitionTimer = null;
        if (bookState === 'open' && afterOpen) {
            afterOpen();
        }
    }, OPEN_TRANSITION_MS);
}

function closeBook() {
    if (bookState !== 'open') return;

    clearTransitionTimer();
    rememberResumePage(0);
    bookState = 'closing';
    cover.classList.remove('settled');
    cover.classList.remove('open');
    book.classList.add('is-closing');

    transitionTimer = window.setTimeout(() => {
        bookState = 'closed';
        book.classList.remove('is-open');
        book.classList.remove('is-closing');
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage1() {
    if (bookState !== 'open') return;

    clearTransitionTimer();
    rememberResumePage(1);
    bookState = 'turning-page1';
    document.getElementById('page1-flipper').classList.add('turned');

    transitionTimer = window.setTimeout(() => {
        bookState = 'page1-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage1Back() {
    if (bookState !== 'page1-turned') return;

    clearTransitionTimer();
    rememberResumePage(0);
    bookState = 'turning-page1-back';
    document.getElementById('page1-flipper').classList.remove('turned');

    transitionTimer = window.setTimeout(() => {
        bookState = 'open';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage2() {
    if (bookState !== 'page1-turned' || !crosswordSolved) return;

    clearTransitionTimer();
    rememberResumePage(2);
    bookState = 'turning-page2';
    crosswordSuccess.style.display = 'none';
    twilightSpread.classList.add('visible');
    page2Flipper.classList.add('ready');
    window.requestAnimationFrame(() => {
        page2Flipper.classList.add('turned');
    });

    transitionTimer = window.setTimeout(() => {
        bookState = 'page2-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage2Back() {
    if (bookState !== 'page2-turned') return;

    clearTransitionTimer();
    rememberResumePage(1);
    bookState = 'turning-page2-back';
    page2Flipper.classList.remove('turned');

    transitionTimer = window.setTimeout(() => {
        page2Flipper.classList.remove('ready');
        twilightSpread.classList.remove('visible');
        crosswordSuccess.style.display = 'flex';
        bookState = 'page1-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage3() {
    if (bookState !== 'page2-turned' || !twilightCrosswordSolved) return;

    clearTransitionTimer();
    rememberResumePage(3);
    bookState = 'turning-page3';
    twilightCrosswordSuccess.style.display = 'none';
    matrixSpread.classList.add('visible');
    page3Flipper.classList.add('ready');
    window.requestAnimationFrame(() => {
        page3Flipper.classList.add('turned');
    });

    transitionTimer = window.setTimeout(() => {
        bookState = 'page3-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage3Back() {
    if (bookState !== 'page3-turned') return;

    clearTransitionTimer();
    rememberResumePage(2);
    bookState = 'turning-page3-back';
    page3Flipper.classList.remove('turned');

    transitionTimer = window.setTimeout(() => {
        page3Flipper.classList.remove('ready');
        matrixSpread.classList.remove('visible');
        twilightCrosswordSuccess.style.display = 'flex';
        bookState = 'page2-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage4() {
    if (bookState !== 'page3-turned' || !matrixCrosswordSolved) return;

    clearTransitionTimer();
    rememberResumePage(4);
    bookState = 'turning-page4';
    matrixCrosswordSuccess.style.display = 'none';
    gotSpread.classList.add('visible');
    page4Flipper.classList.add('ready');
    window.requestAnimationFrame(() => {
        page4Flipper.classList.add('turned');
    });

    transitionTimer = window.setTimeout(() => {
        bookState = 'page4-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage4Back() {
    if (bookState !== 'page4-turned') return;

    clearTransitionTimer();
    rememberResumePage(3);
    bookState = 'turning-page4-back';
    page4Flipper.classList.remove('turned');

    transitionTimer = window.setTimeout(() => {
        page4Flipper.classList.remove('ready');
        gotSpread.classList.remove('visible');
        matrixCrosswordSuccess.style.display = 'flex';
        bookState = 'page3-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage5() {
    if (bookState !== 'page4-turned' || !gotCrosswordSolved) return;

    clearTransitionTimer();
    rememberResumePage(5);
    bookState = 'turning-page5';
    gotCrosswordSuccess.style.display = 'none';
    
    bttfSpread.classList.add('visible');
    
    const bttfLeftPage = bttfSpread.querySelector('.bttf-left-page');
    bttfLeftPage.style.visibility = 'hidden';
    
    page5Flipper.classList.add('ready');
    void page5Flipper.offsetWidth;
    page5Flipper.classList.add('turned');

    transitionTimer = window.setTimeout(() => {
        bttfLeftPage.style.visibility = 'visible';
        bookState = 'page5-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage5Back() {
    if (bookState !== 'page5-turned') return;

    clearTransitionTimer();
    rememberResumePage(4);
    bookState = 'turning-page5-back';
    
   
    const bttfLeftPage = bttfSpread.querySelector('.bttf-left-page');
    bttfLeftPage.style.visibility = 'hidden';
    
    page5Flipper.classList.remove('turned');

    transitionTimer = window.setTimeout(() => {
        bttfSpread.classList.remove('visible');
        bttfLeftPage.style.visibility = ''; 
        page5Flipper.classList.remove('ready');
        gotCrosswordSuccess.style.display = 'flex';
        bookState = 'page4-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage6() {
    if (bookState !== 'page5-turned' || !bttfCrosswordSolved) return;

    clearTransitionTimer();
    rememberResumePage(6);
    bookState = 'turning-page6';
    bttfCrosswordSuccess.style.display = 'none';
    bttfSpread.classList.remove('visible');
    finalSpread.classList.add('visible');
    page6Flipper.classList.add('ready');
    window.requestAnimationFrame(() => {
        page6Flipper.classList.add('turned');
    });

    transitionTimer = window.setTimeout(() => {
        bookState = 'page6-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

function turnPage6Back() {
    if (bookState !== 'page6-turned' || finalPuzzleSolved) return;

    clearTransitionTimer();
    rememberResumePage(5);
    bookState = 'turning-page6-back';
    page6Flipper.classList.remove('turned');

    transitionTimer = window.setTimeout(() => {
        page6Flipper.classList.remove('ready');
        finalSpread.classList.remove('visible');
        bttfSpread.classList.add('visible');
        bttfCrosswordSuccess.style.display = 'flex';
        bookState = 'page5-turned';
        transitionTimer = null;
    }, OPEN_TRANSITION_MS);
}

document.getElementById('min-btn').addEventListener('click', () => ipcRenderer.send('window-minimize'));
document.getElementById('max-btn').addEventListener('click', () => ipcRenderer.send('window-maximize'));
document.getElementById('close-btn').addEventListener('click', () => ipcRenderer.send('window-close'));

book.addEventListener('click', (event) => {
    if (book.dataset.preventClick === 'true' || isInteractiveTarget(event.target)) {
        return;
    }

    const rect = book.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const isRightSide = clickX > (rect.width / 2);

    if (bookState === 'closed') {
        if (isRightSide) {
            rememberResumePage(0);
            openBook();
        }
    } else if (bookState === 'open' && !event.target.closest('.sudoku-board')) {
        if (isRightSide) {
            if (isSudokuSolved) turnPage1();
        } else {
            closeBook();
        }
    } else if (bookState === 'page1-turned') {
        if (isRightSide) {
            turnPage2();
        } else {
            turnPage1Back();
        }
    } else if (bookState === 'page2-turned') {
        if (isRightSide) {
            turnPage3();
        } else {
            turnPage2Back();
        }
    } else if (bookState === 'page3-turned') {
        if (isRightSide) {
            turnPage4();
        } else {
            turnPage3Back();
        }
    } else if (bookState === 'page4-turned') {
        if (isRightSide) {
            turnPage5();
        } else {
            turnPage4Back();
        }
    } else if (bookState === 'page5-turned') {
        if (isRightSide) {
            turnPage6();
        } else {
            turnPage5Back();
        }
    } else if (bookState === 'page6-turned') {
        if (!isRightSide) turnPage6Back();
    }
});

book.classList.remove('is-open', 'is-closing');
cover.classList.remove('open', 'settled');

// --- SUDOKU LOGIC ---
function checkWinCondition() {
    cancelSuccessReveal();
    const cells = document.querySelectorAll('.cell');
    const grid = [];
    let index = 0;
    let isBoardFull = true;

    document.getElementById('error-message').style.display = 'none';

    for (let r = 0; r < 9; r++) {
        const row = [];
        for (let c = 0; c < 9; c++) {
            const val = cells[index].innerText;
            if (!val) isBoardFull = false;
            row.push(parseInt(val, 10) || 0); 
            index++;
        }
        grid.push(row);
    }

    if (!isBoardFull) {
        document.getElementById('instructions').style.display = 'block';
        return;
    }

    let isValid = true;
    for (let i = 0; i < 9; i++) {
        const rowSet = new Set();
        const colSet = new Set();
        for (let j = 0; j < 9; j++) {
            rowSet.add(grid[i][j]);
            colSet.add(grid[j][i]);
        }
        if (rowSet.size !== 9 || colSet.size !== 9) isValid = false;
    }

    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
            const blockSet = new Set();
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    blockSet.add(grid[br * 3 + i][bc * 3 + j]);
                }
            }
            if (blockSet.size !== 9) isValid = false;
        }
    }

    if (isValid) {
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
        cells.forEach(c => c.removeAttribute('tabindex'));
        saveProgress(1);
        revealSuccessAfterPause(() => {
            isSudokuSolved = true;
            document.getElementById('success-message').style.display = 'block';
        });
    } else {
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('error-message').style.display = 'block';
    }
}

const board = document.getElementById('board');
const sampleGrid = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
];

for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');

        const val = sampleGrid[r][c];
        if (val !== 0) {
            cell.innerText = String(val);
            cell.style.color = '#4a3b32';
        } else {
            cell.setAttribute('tabindex', '0');
            cell.style.color = '#254e7a';
            cell.addEventListener('keydown', (e) => {
                if (e.key >= '1' && e.key <= '9') {
                    cell.innerText = e.key;
                    checkWinCondition(); 
                    savePuzzleDraft('sudoku', [...document.querySelectorAll('.cell')].map((entry) => entry.innerText), 0);
                }
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    cell.innerText = '';
                    checkWinCondition();
                    savePuzzleDraft('sudoku', [...document.querySelectorAll('.cell')].map((entry) => entry.innerText), 0);
                }
            });
        }

        board.appendChild(cell);
    }
}

// --- CROSSWORD LOGIC ---
const crosswordContainer = document.querySelector('.crossword-container');
const crosswordSuccess = document.getElementById('crossword-success');
const crosswordBoard = document.getElementById('crossword-board');

// HARRY POTTER GRID
const hpGridRows = [
    '.Х.......',
    '.О.......',
    '.Г..Ф....',
    'АВАДАД...',
    '.А..ВР...',
    '.Р..КА...',
    '.ТМАСКА..',
    '.С...ОМУТ',
    '....СНЕЙП'
];

const hpStartNumbers = {
    1: 1,
    22: 2,
    32: 3,
    27: 4,
    56: 5,
    68: 6,
    76: 7
};

crosswordBoard.replaceChildren();
hpGridRows.forEach((row, rowIndex) => {
    [...row].forEach((letter, colIndex) => {
        const cellIndex = rowIndex * hpGridRows[0].length + colIndex;
        const cell = document.createElement('div');
        cell.classList.add('cw-cell');

        if (letter === '.') {
            cell.classList.add('cw-empty');
        } else {
            cell.dataset.answer = letter;
            const number = hpStartNumbers[cellIndex];
            if (number) {
                const numberLabel = document.createElement('span');
                numberLabel.className = 'cw-num';
                numberLabel.textContent = String(number);
                cell.appendChild(numberLabel);
            }

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'cw-input';
            input.spellcheck = false;
            cell.appendChild(input);
        }

        crosswordBoard.appendChild(cell);
    });
});

const cwCells = [...document.querySelectorAll('.cw-cell')];
const cwInputs = [...document.querySelectorAll('.cw-input')];

// HARRY POTTER ANSWERS
const crosswordWords = [
    { answer: 'ХОГВАРТС', cells: [1, 10, 19, 28, 37, 46, 55, 64] },
    { answer: 'ФАВКС', cells: [22, 31, 40, 49, 58] },
    { answer: 'ДРАКОН', cells: [32, 41, 50, 59, 68, 77] },
    { answer: 'АВАДА', cells: [27, 28, 29, 30, 31] },
    { answer: 'МАСКА', cells: [56, 57, 58, 59, 60] },
    { answer: 'ОМУТ', cells: [68, 69, 70, 71] },
    { answer: 'СНЕЙП', cells: [76, 77, 78, 79, 80] }
];

const wordsByCell = new Map();
crosswordWords.forEach((word) => {
    word.cells.forEach((cellIndex) => {
        const matches = wordsByCell.get(cellIndex) || [];
        matches.push(word);
        wordsByCell.set(cellIndex, matches);
    });
});

let activeCrosswordWord = crosswordWords[0];
let crosswordSolved = false;
let crosswordPointerWasAlreadyFocused = false;

function inputForCell(cellIndex) {
    return cwCells[cellIndex].querySelector('.cw-input');
}

function cellIndexForInput(input) {
    return cwCells.indexOf(input.closest('.cw-cell'));
}

function selectCrosswordWord(input, toggleAtIntersection = false) {
    const cellIndex = cellIndexForInput(input);
    const candidates = wordsByCell.get(cellIndex) || [];
    if (!candidates.length) return null;

    if (toggleAtIntersection && candidates.length > 1 && candidates.includes(activeCrosswordWord)) {
        const currentIndex = candidates.indexOf(activeCrosswordWord);
        activeCrosswordWord = candidates[(currentIndex + 1) % candidates.length];
    } else if (!candidates.includes(activeCrosswordWord)) {
        activeCrosswordWord = candidates[0];
    }

    return activeCrosswordWord;
}

function normalizeCrosswordInput(input) {
    input.value = input.value.slice(-1).toLocaleUpperCase('ru-RU');
    return input.value;
}

function updateCrosswordErrors() {
    crosswordWords.forEach((word) => {
        const isWrong = word.cells.some((cellIndex, letterIndex) => {
            const value = inputForCell(cellIndex).value;
            return value && value !== word.answer[letterIndex];
        });

        word.cells.forEach((cellIndex) => {
            inputForCell(cellIndex).closest('.cw-cell').classList.toggle('cw-wrong', isWrong);
        });
    });
}

function isCrosswordComplete() {
    return crosswordWords.every((word) => word.cells.every((cellIndex) => inputForCell(cellIndex).value));
}

function isCrosswordCorrect() {
    return crosswordWords.every((word) => word.cells.every((cellIndex, letterIndex) => (
        inputForCell(cellIndex).value === word.answer[letterIndex]
    )));
}

function showCrosswordSuccess() {
    savePuzzleDraft('hp', cwInputs.map((input) => input.value), 1);
    saveProgress(2);
    cwInputs.forEach((input) => {
        input.disabled = true;
    });
    revealSuccessAfterPause(() => {
        crosswordSolved = true;
        crosswordContainer.style.display = 'none';
        crosswordSuccess.style.display = 'flex';
    });
}

function focusNextCrosswordLetter(word, input) {
    const currentCellIndex = cellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const nextCellIndex = word.cells
        .slice(currentLetterIndex + 1)
        .find((cellIndex) => !inputForCell(cellIndex).value);
    if (nextCellIndex !== undefined) {
        inputForCell(nextCellIndex).focus();
    }
}

function focusPreviousCrosswordLetter(word, input) {
    const currentCellIndex = cellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const previousCellIndex = word.cells[currentLetterIndex - 1];
    if (previousCellIndex !== undefined) {
        inputForCell(previousCellIndex).focus();
    }
}

cwInputs.forEach((input) => {
    input.addEventListener('focus', () => {
        selectCrosswordWord(input);
    });

    input.addEventListener('pointerdown', () => {
        crosswordPointerWasAlreadyFocused = document.activeElement === input;
    });

    input.addEventListener('click', () => {
        selectCrosswordWord(input, crosswordPointerWasAlreadyFocused);
        crosswordPointerWasAlreadyFocused = false;
    });

    input.addEventListener('input', () => {
        if (crosswordSolved) return;

        const word = selectCrosswordWord(input);
        normalizeCrosswordInput(input);
        updateCrosswordErrors();
        savePuzzleDraft('hp', cwInputs.map((entry) => entry.value), 1);

        if (isCrosswordComplete() && isCrosswordCorrect()) {
            showCrosswordSuccess();
            return;
        }

        if (input.value && word) {
            focusNextCrosswordLetter(word, input);
        }
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value) {
            const word = selectCrosswordWord(input);
            if (word) {
                event.preventDefault();
                focusPreviousCrosswordLetter(word, input);
            }
        }
    });
});

// --- TWILIGHT CROSSWORD LOGIC ---
const twilightCrosswordContainer = document.querySelector('.twilight-crossword-container');
const twilightCrosswordSuccess = document.getElementById('twilight-crossword-success');
const twilightCwCells = [...document.querySelectorAll('.tw-cw-cell')];
const twilightCwInputs = [...document.querySelectorAll('.tw-cw-input')];
const twilightWords = [
    { answer: 'ЛАПУШ', cells: [31, 43, 55, 67, 79] },
    { answer: 'ЛОРАН', cells: [31, 32, 33, 34, 35] },
    { answer: 'ПОЛ', cells: [55, 56, 57] },
    { answer: 'ЭМИЛИ', cells: [2, 14, 26, 38, 50] },
    { answer: 'ВОЛЬТЕРА', cells: [36, 37, 38, 39, 40, 41, 42, 43] },
    { answer: 'ДЖЕНКС', cells: [17, 29, 41, 53, 65, 77] },
    { answer: 'КЕЙТ', cells: [4, 16, 28, 40] },
    { answer: 'КВИЛЕТ', cells: [4, 5, 6, 7, 8, 9] }
];

const twilightWordsByCell = new Map();
twilightWords.forEach((word) => {
    word.cells.forEach((cellIndex) => {
        const matches = twilightWordsByCell.get(cellIndex) || [];
        matches.push(word);
        twilightWordsByCell.set(cellIndex, matches);
    });
});

let activeTwilightWord = twilightWords[0];
let twilightCrosswordSolved = false;
let twilightPointerWasAlreadyFocused = false;

function inputForTwilightCell(cellIndex) {
    return twilightCwCells[cellIndex].querySelector('.tw-cw-input');
}

function twilightCellIndexForInput(input) {
    return twilightCwCells.indexOf(input.closest('.tw-cw-cell'));
}

function selectTwilightWord(input, toggleAtIntersection = false) {
    const cellIndex = twilightCellIndexForInput(input);
    const candidates = twilightWordsByCell.get(cellIndex) || [];
    if (!candidates.length) return null;

    if (toggleAtIntersection && candidates.length > 1 && candidates.includes(activeTwilightWord)) {
        const currentIndex = candidates.indexOf(activeTwilightWord);
        activeTwilightWord = candidates[(currentIndex + 1) % candidates.length];
    } else if (!candidates.includes(activeTwilightWord)) {
        activeTwilightWord = candidates[0];
    }

    return activeTwilightWord;
}

function updateTwilightCrosswordErrors() {
    twilightWords.forEach((word) => {
        const isWrong = word.cells.some((cellIndex, letterIndex) => {
            const value = inputForTwilightCell(cellIndex).value;
            return value && value !== word.answer[letterIndex];
        });

        word.cells.forEach((cellIndex) => {
            inputForTwilightCell(cellIndex).closest('.tw-cw-cell').classList.toggle('tw-cw-wrong', isWrong);
        });
    });
}

function isTwilightCrosswordComplete() {
    return twilightWords.every((word) => word.cells.every((cellIndex) => inputForTwilightCell(cellIndex).value));
}

function isTwilightCrosswordCorrect() {
    return twilightWords.every((word) => word.cells.every((cellIndex, letterIndex) => (
        inputForTwilightCell(cellIndex).value === word.answer[letterIndex]
    )));
}

function showTwilightCrosswordSuccess() {
    savePuzzleDraft('twilight', twilightCwInputs.map((input) => input.value), 2);
    saveProgress(3);
    twilightCwInputs.forEach((input) => {
        input.disabled = true;
    });
    revealSuccessAfterPause(() => {
        twilightCrosswordSolved = true;
        twilightCrosswordContainer.style.display = 'none';
        twilightCrosswordSuccess.style.display = 'flex';
    });
}

function focusNextTwilightLetter(word, input) {
    const currentCellIndex = twilightCellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const nextCellIndex = word.cells
        .slice(currentLetterIndex + 1)
        .find((cellIndex) => !inputForTwilightCell(cellIndex).value);
    if (nextCellIndex !== undefined) {
        inputForTwilightCell(nextCellIndex).focus();
    }
}

function focusPreviousTwilightLetter(word, input) {
    const currentCellIndex = twilightCellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const previousCellIndex = word.cells[currentLetterIndex - 1];
    if (previousCellIndex !== undefined) {
        inputForTwilightCell(previousCellIndex).focus();
    }
}

twilightCwInputs.forEach((input) => {
    input.addEventListener('focus', () => {
        selectTwilightWord(input);
    });

    input.addEventListener('pointerdown', () => {
        twilightPointerWasAlreadyFocused = document.activeElement === input;
    });

    input.addEventListener('click', () => {
        selectTwilightWord(input, twilightPointerWasAlreadyFocused);
        twilightPointerWasAlreadyFocused = false;
    });

    input.addEventListener('input', () => {
        if (twilightCrosswordSolved) return;

        const word = selectTwilightWord(input);
        input.value = input.value.slice(-1).toLocaleUpperCase('ru-RU');
        updateTwilightCrosswordErrors();
        savePuzzleDraft('twilight', twilightCwInputs.map((entry) => entry.value), 2);

        if (isTwilightCrosswordComplete() && isTwilightCrosswordCorrect()) {
            showTwilightCrosswordSuccess();
            return;
        }

        if (input.value && word) {
            focusNextTwilightLetter(word, input);
        }
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value) {
            const word = selectTwilightWord(input);
            if (word) {
                event.preventDefault();
                focusPreviousTwilightLetter(word, input);
            }
        }
    });
});

// --- MATRIX CROSSWORD LOGIC ---
const matrixCrosswordContainer = document.querySelector('.matrix-crossword-container');
const matrixCrosswordSuccess = document.getElementById('matrix-crossword-success');
const matrixCrosswordGrid = document.getElementById('matrix-crossword-board');
const matrixGridRows = [
    'МЕРОВИНГЕН............',
    '.....З..П...С.........',
    '.....Б..И...МЗ........',
    '.....Р..Ф...ИИ........',
    '.....АРХИТЕКТОР.......',
    '.....Н..Я..КОНСТРУКТОР',
    '.....НАВУХОДОНОСОР....',
    '.....Ы................',
    '.....Й................'
];
const matrixStartNumbers = {
    0: 7, 5: 2, 30: 3, 34: 4, 57: 5, 93: 6, 121: 8, 137: 1
};
const matrixGridWidth = matrixGridRows[0].length;

matrixGridRows.forEach((row, rowIndex) => {
    [...row].forEach((letter, colIndex) => {
        const cellIndex = rowIndex * matrixGridWidth + colIndex;
        const cell = document.createElement('div');
        cell.classList.add('matrix-cw-cell');

        if (letter === '.') {
            cell.classList.add('matrix-cw-empty');
        } else {
            cell.dataset.answer = letter;
            const number = matrixStartNumbers[cellIndex];
            if (number) {
                const numberLabel = document.createElement('span');
                numberLabel.className = 'matrix-cw-num';
                numberLabel.textContent = String(number);
                cell.appendChild(numberLabel);
            }

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'matrix-cw-input';
            input.spellcheck = false;
            cell.appendChild(input);
        }

        matrixCrosswordGrid.appendChild(cell);
    });
});

const matrixCwCells = [...matrixCrosswordGrid.querySelectorAll('.matrix-cw-cell')];
const matrixCwInputs = [...matrixCrosswordGrid.querySelectorAll('.matrix-cw-input')];
const matrixWords = [
    { answer: 'НАВУХОДОНОСОР', cells: [137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149] },
    { answer: 'АРХИТЕКТОР', cells: [93, 94, 95, 96, 97, 98, 99, 100, 101, 102] },
    { answer: 'МЕРОВИНГЕН', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { answer: 'КОНСТРУКТОР', cells: [121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131] },
    { answer: 'ИЗБРАННЫЙ', cells: [5, 27, 49, 71, 93, 115, 137, 159, 181] },
    { answer: 'ПИФИЯ', cells: [30, 52, 74, 96, 118] },
    { answer: 'СМИТ', cells: [34, 56, 78, 100] },
    { answer: 'ЗИОН', cells: [57, 79, 101, 123] }
];
const matrixWordsByCell = new Map();

matrixWords.forEach((word) => {
    word.cells.forEach((cellIndex) => {
        const matches = matrixWordsByCell.get(cellIndex) || [];
        matches.push(word);
        matrixWordsByCell.set(cellIndex, matches);
    });
});

let activeMatrixWord = matrixWords[0];
let matrixCrosswordSolved = false;
let matrixPointerWasAlreadyFocused = false;

function inputForMatrixCell(cellIndex) {
    return matrixCwCells[cellIndex].querySelector('.matrix-cw-input');
}

function matrixCellIndexForInput(input) {
    return matrixCwCells.indexOf(input.closest('.matrix-cw-cell'));
}

function selectMatrixWord(input, toggleAtIntersection = false) {
    const cellIndex = matrixCellIndexForInput(input);
    const candidates = matrixWordsByCell.get(cellIndex) || [];
    if (!candidates.length) return null;

    if (toggleAtIntersection && candidates.length > 1 && candidates.includes(activeMatrixWord)) {
        const currentIndex = candidates.indexOf(activeMatrixWord);
        activeMatrixWord = candidates[(currentIndex + 1) % candidates.length];
    } else if (!candidates.includes(activeMatrixWord)) {
        activeMatrixWord = candidates[0];
    }

    return activeMatrixWord;
}

function updateMatrixCrosswordErrors() {
    matrixWords.forEach((word) => {
        const isWrong = word.cells.some((cellIndex, letterIndex) => {
            const value = inputForMatrixCell(cellIndex).value;
            return value && value !== word.answer[letterIndex];
        });

        word.cells.forEach((cellIndex) => {
            inputForMatrixCell(cellIndex).closest('.matrix-cw-cell').classList.toggle('matrix-cw-wrong', isWrong);
        });
    });
}

function isMatrixCrosswordComplete() {
    return matrixWords.every((word) => word.cells.every((cellIndex) => inputForMatrixCell(cellIndex).value));
}

function isMatrixCrosswordCorrect() {
    return matrixWords.every((word) => word.cells.every((cellIndex, letterIndex) => (
        inputForMatrixCell(cellIndex).value === word.answer[letterIndex]
    )));
}

function showMatrixCrosswordSuccess() {
    savePuzzleDraft('matrix', matrixCwInputs.map((input) => input.value), 3);
    saveProgress(4);
    matrixCwInputs.forEach((input) => {
        input.disabled = true;
    });
    revealSuccessAfterPause(() => {
        matrixCrosswordSolved = true;
        matrixCrosswordContainer.style.display = 'none';
        matrixCrosswordSuccess.style.display = 'flex';
    });
}

function focusNextMatrixLetter(word, input) {
    const currentCellIndex = matrixCellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const nextCellIndex = word.cells
        .slice(currentLetterIndex + 1)
        .find((cellIndex) => !inputForMatrixCell(cellIndex).value);
    if (nextCellIndex !== undefined) {
        inputForMatrixCell(nextCellIndex).focus();
    }
}

function focusPreviousMatrixLetter(word, input) {
    const currentCellIndex = matrixCellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const previousCellIndex = word.cells[currentLetterIndex - 1];
    if (previousCellIndex !== undefined) {
        inputForMatrixCell(previousCellIndex).focus();
    }
}

matrixCwInputs.forEach((input) => {
    input.addEventListener('focus', () => {
        selectMatrixWord(input);
    });

    input.addEventListener('pointerdown', () => {
        matrixPointerWasAlreadyFocused = document.activeElement === input;
    });

    input.addEventListener('click', () => {
        selectMatrixWord(input, matrixPointerWasAlreadyFocused);
        matrixPointerWasAlreadyFocused = false;
    });

    input.addEventListener('input', () => {
        if (matrixCrosswordSolved) return;

        const word = selectMatrixWord(input);
        input.value = input.value.slice(-1).toLocaleUpperCase('ru-RU');
        updateMatrixCrosswordErrors();
        savePuzzleDraft('matrix', matrixCwInputs.map((entry) => entry.value), 3);

        if (isMatrixCrosswordComplete() && isMatrixCrosswordCorrect()) {
            showMatrixCrosswordSuccess();
            return;
        }

        if (input.value && word) {
            focusNextMatrixLetter(word, input);
        }
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value) {
            const word = selectMatrixWord(input);
            if (word) {
                event.preventDefault();
                focusPreviousMatrixLetter(word, input);
            }
        }
    });
});

// --- GAME OF THRONES CROSSWORD LOGIC ---
const gotCrosswordContainer = document.querySelector('.got-crossword-container');
const gotCrosswordSuccess = document.getElementById('got-crossword-success');
const gotCrosswordGrid = document.getElementById('got-crossword-board');
const gotGridRows = [
    '..Б...........У..',
    '..А...ХБ......П..',
    'ЖЕЛЕЗНОРОЖДЕННЫЕ.',
    '..Е...ДА.ДРАКАРИС',
    '..Р...ОА......Ь..',
    '..И...РВ.........',
    '..О.ЛЮТОВОЛК.....',
    '..НМЕЛИСАНДРА....'
];
const gotStartNumbers = { 2: 2, 14: 4, 23: 5, 24: 3, 34: 7, 60: 1, 106: 6, 122: 8 };
const gotGridWidth = gotGridRows[0].length;

gotGridRows.forEach((row, rowIndex) => {
    [...row].forEach((letter, colIndex) => {
        const cellIndex = rowIndex * gotGridWidth + colIndex;
        const cell = document.createElement('div');
        cell.classList.add('got-cw-cell');

        if (letter === '.') {
            cell.classList.add('got-cw-empty');
        } else {
            cell.dataset.answer = letter;
            const number = gotStartNumbers[cellIndex];
            if (number) {
                const numberLabel = document.createElement('span');
                numberLabel.className = 'got-cw-num';
                numberLabel.textContent = String(number);
                cell.appendChild(numberLabel);
            }

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'got-cw-input';
            input.spellcheck = false;
            cell.appendChild(input);
        }

        gotCrosswordGrid.appendChild(cell);
    });
});

const gotCwCells = [...gotCrosswordGrid.querySelectorAll('.got-cw-cell')];
const gotCwInputs = [...gotCrosswordGrid.querySelectorAll('.got-cw-input')];
const gotWords = [
    { answer: 'ДРАКАРИС', cells: [60, 61, 62, 63, 64, 65, 66, 67] },
    { answer: 'ЛЮТОВОЛК', cells: [106, 107, 108, 109, 110, 111, 112, 113] },
    { answer: 'ЖЕЛЕЗНОРОЖДЕННЫЕ', cells: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49] },
    { answer: 'МЕЛИСАНДРА', cells: [122, 123, 124, 125, 126, 127, 128, 129, 130, 131] },
    { answer: 'БАЛЕРИОН', cells: [2, 19, 36, 53, 70, 87, 104, 121] },
    { answer: 'БРААВОС', cells: [24, 41, 58, 75, 92, 109, 126] },
    { answer: 'УПЫРЬ', cells: [14, 31, 48, 65, 82] },
    { answer: 'ХОДОР', cells: [23, 40, 57, 74, 91] }
];
const gotWordsByCell = new Map();

gotWords.forEach((word) => {
    word.cells.forEach((cellIndex) => {
        const matches = gotWordsByCell.get(cellIndex) || [];
        matches.push(word);
        gotWordsByCell.set(cellIndex, matches);
    });
});

let activeGotWord = gotWords[0];
let gotCrosswordSolved = false;
let gotPointerWasAlreadyFocused = false;

function inputForGotCell(cellIndex) {
    return gotCwCells[cellIndex].querySelector('.got-cw-input');
}

function gotCellIndexForInput(input) {
    return gotCwCells.indexOf(input.closest('.got-cw-cell'));
}

function selectGotWord(input, toggleAtIntersection = false) {
    const cellIndex = gotCellIndexForInput(input);
    const candidates = gotWordsByCell.get(cellIndex) || [];
    if (!candidates.length) return null;

    if (toggleAtIntersection && candidates.length > 1 && candidates.includes(activeGotWord)) {
        const currentIndex = candidates.indexOf(activeGotWord);
        activeGotWord = candidates[(currentIndex + 1) % candidates.length];
    } else if (!candidates.includes(activeGotWord)) {
        activeGotWord = candidates[0];
    }

    return activeGotWord;
}

function updateGotCrosswordErrors() {
    gotWords.forEach((word) => {
        const isWrong = word.cells.some((cellIndex, letterIndex) => {
            const value = inputForGotCell(cellIndex).value;
            return value && value !== word.answer[letterIndex];
        });

        word.cells.forEach((cellIndex) => {
            inputForGotCell(cellIndex).closest('.got-cw-cell').classList.toggle('got-cw-wrong', isWrong);
        });
    });
}

function isGotCrosswordComplete() {
    return gotWords.every((word) => word.cells.every((cellIndex) => inputForGotCell(cellIndex).value));
}

function isGotCrosswordCorrect() {
    return gotWords.every((word) => word.cells.every((cellIndex, letterIndex) => (
        inputForGotCell(cellIndex).value === word.answer[letterIndex]
    )));
}

function showGotCrosswordSuccess() {
    savePuzzleDraft('got', gotCwInputs.map((input) => input.value), 4);
    saveProgress(5);
    gotCwInputs.forEach((input) => {
        input.disabled = true;
    });
    revealSuccessAfterPause(() => {
        gotCrosswordSolved = true;
        gotCrosswordContainer.style.display = 'none';
        gotCrosswordSuccess.style.display = 'flex';
    });
}

function focusNextGotLetter(word, input) {
    const currentCellIndex = gotCellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const nextCellIndex = word.cells
        .slice(currentLetterIndex + 1)
        .find((cellIndex) => !inputForGotCell(cellIndex).value);
    if (nextCellIndex !== undefined) {
        inputForGotCell(nextCellIndex).focus();
    }
}

function focusPreviousGotLetter(word, input) {
    const currentCellIndex = gotCellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const previousCellIndex = word.cells[currentLetterIndex - 1];
    if (previousCellIndex !== undefined) {
        inputForGotCell(previousCellIndex).focus();
    }
}

gotCwInputs.forEach((input) => {
    input.addEventListener('focus', () => {
        selectGotWord(input);
    });

    input.addEventListener('pointerdown', () => {
        gotPointerWasAlreadyFocused = document.activeElement === input;
    });

    input.addEventListener('click', () => {
        selectGotWord(input, gotPointerWasAlreadyFocused);
        gotPointerWasAlreadyFocused = false;
    });

    input.addEventListener('input', () => {
        if (gotCrosswordSolved) return;

        const word = selectGotWord(input);
        input.value = input.value.slice(-1).toLocaleUpperCase('ru-RU');
        updateGotCrosswordErrors();
        savePuzzleDraft('got', gotCwInputs.map((entry) => entry.value), 4);

        if (isGotCrosswordComplete() && isGotCrosswordCorrect()) {
            showGotCrosswordSuccess();
            return;
        }

        if (input.value && word) {
            focusNextGotLetter(word, input);
        }
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value) {
            const word = selectGotWord(input);
            if (word) {
                event.preventDefault();
                focusPreviousGotLetter(word, input);
            }
        }
    });
});

// --- BACK TO THE FUTURE CROSSWORD LOGIC ---
const bttfCrosswordContainer = document.querySelector('.bttf-crossword-container');
const bttfCrosswordSuccess = document.getElementById('bttf-crossword-success');
const bttfCrosswordGrid = document.getElementById('bttf-crossword-board');
const bttfGridRows = [
    '.Э...........',
    '.М...........',
    '.М....Ч......',
    'ДЕЛОРЕАН.....',
    '.Т..ПИСЬМО...',
    '.Т....Ы.А....',
    '........Р..Б.',
    '.....ПЛУТОНИЙ',
    'ХИЛЛВЭЛЛИ..Ф.',
    '...........Ф.'
];
const bttfStartNumbers = { 1: 2, 32: 4, 39: 1, 56: 8, 60: 5, 89: 3, 96: 6, 104: 7 };
const bttfGridWidth = bttfGridRows[0].length;

bttfGridRows.forEach((row, rowIndex) => {
    [...row].forEach((letter, colIndex) => {
        const cellIndex = rowIndex * bttfGridWidth + colIndex;
        const cell = document.createElement('div');
        cell.classList.add('bttf-cw-cell');

        if (letter === '.') {
            cell.classList.add('bttf-cw-empty');
        } else {
            cell.dataset.answer = letter;
            const number = bttfStartNumbers[cellIndex];
            if (number) {
                const numberLabel = document.createElement('span');
                numberLabel.className = 'bttf-cw-num';
                numberLabel.textContent = String(number);
                cell.appendChild(numberLabel);
            }

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.className = 'bttf-cw-input';
            input.spellcheck = false;
            cell.appendChild(input);
        }

        bttfCrosswordGrid.appendChild(cell);
    });
});

const bttfCwCells = [...bttfCrosswordGrid.querySelectorAll('.bttf-cw-cell')];
const bttfCwInputs = [...bttfCrosswordGrid.querySelectorAll('.bttf-cw-input')];
const bttfWords = [
    { answer: 'ДЕЛОРЕАН', cells: [39, 40, 41, 42, 43, 44, 45, 46] },
    { answer: 'ПЛУТОНИЙ', cells: [96, 97, 98, 99, 100, 101, 102, 103] },
    { answer: 'ХИЛЛВЭЛЛИ', cells: [104, 105, 106, 107, 108, 109, 110, 111, 112] },
    { answer: 'ПИСЬМО', cells: [56, 57, 58, 59, 60, 61] },
    { answer: 'ЭММЕТТ', cells: [1, 14, 27, 40, 53, 66] },
    { answer: 'БИФФ', cells: [89, 102, 115, 128] },
    { answer: 'ЧАСЫ', cells: [32, 45, 58, 71] },
    { answer: 'МАРТИ', cells: [60, 73, 86, 99, 112] }
];
const bttfWordsByCell = new Map();

bttfWords.forEach((word) => {
    word.cells.forEach((cellIndex) => {
        const matches = bttfWordsByCell.get(cellIndex) || [];
        matches.push(word);
        bttfWordsByCell.set(cellIndex, matches);
    });
});

let activeBttfWord = bttfWords[0];
let bttfCrosswordSolved = false;
let bttfPointerWasAlreadyFocused = false;

function inputForBttfCell(cellIndex) {
    return bttfCwCells[cellIndex].querySelector('.bttf-cw-input');
}

function bttfCellIndexForInput(input) {
    return bttfCwCells.indexOf(input.closest('.bttf-cw-cell'));
}

function selectBttfWord(input, toggleAtIntersection = false) {
    const cellIndex = bttfCellIndexForInput(input);
    const candidates = bttfWordsByCell.get(cellIndex) || [];
    if (!candidates.length) return null;

    if (toggleAtIntersection && candidates.length > 1 && candidates.includes(activeBttfWord)) {
        const currentIndex = candidates.indexOf(activeBttfWord);
        activeBttfWord = candidates[(currentIndex + 1) % candidates.length];
    } else if (!candidates.includes(activeBttfWord)) {
        activeBttfWord = candidates[0];
    }

    return activeBttfWord;
}

function updateBttfCrosswordErrors() {
    bttfWords.forEach((word) => {
        const isWrong = word.cells.some((cellIndex, letterIndex) => {
            const value = inputForBttfCell(cellIndex).value;
            return value && value !== word.answer[letterIndex];
        });

        word.cells.forEach((cellIndex) => {
            inputForBttfCell(cellIndex).closest('.bttf-cw-cell').classList.toggle('bttf-cw-wrong', isWrong);
        });
    });
}

function isBttfCrosswordComplete() {
    return bttfWords.every((word) => word.cells.every((cellIndex) => inputForBttfCell(cellIndex).value));
}

function isBttfCrosswordCorrect() {
    return bttfWords.every((word) => word.cells.every((cellIndex, letterIndex) => (
        inputForBttfCell(cellIndex).value === word.answer[letterIndex]
    )));
}

function showBttfCrosswordSuccess() {
    savePuzzleDraft('bttf', bttfCwInputs.map((input) => input.value), 5);
    saveProgress(6);
    bttfCwInputs.forEach((input) => {
        input.disabled = true;
    });
    revealSuccessAfterPause(() => {
        bttfCrosswordSolved = true;
        bttfCrosswordContainer.style.display = 'none';
        bttfCrosswordSuccess.style.display = 'flex';
    });
}

function focusNextBttfLetter(word, input) {
    const currentCellIndex = bttfCellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const nextCellIndex = word.cells
        .slice(currentLetterIndex + 1)
        .find((cellIndex) => !inputForBttfCell(cellIndex).value);
    if (nextCellIndex !== undefined) {
        inputForBttfCell(nextCellIndex).focus();
    }
}

function focusPreviousBttfLetter(word, input) {
    const currentCellIndex = bttfCellIndexForInput(input);
    const currentLetterIndex = word.cells.indexOf(currentCellIndex);
    const previousCellIndex = word.cells[currentLetterIndex - 1];
    if (previousCellIndex !== undefined) {
        inputForBttfCell(previousCellIndex).focus();
    }
}

bttfCwInputs.forEach((input) => {
    input.addEventListener('focus', () => {
        selectBttfWord(input);
    });

    input.addEventListener('pointerdown', () => {
        bttfPointerWasAlreadyFocused = document.activeElement === input;
    });

    input.addEventListener('click', () => {
        selectBttfWord(input, bttfPointerWasAlreadyFocused);
        bttfPointerWasAlreadyFocused = false;
    });

    input.addEventListener('input', () => {
        if (bttfCrosswordSolved) return;

        const word = selectBttfWord(input);
        input.value = input.value.slice(-1).toLocaleUpperCase('ru-RU');
        updateBttfCrosswordErrors();
        savePuzzleDraft('bttf', bttfCwInputs.map((entry) => entry.value), 5);

        if (isBttfCrosswordComplete() && isBttfCrosswordCorrect()) {
            showBttfCrosswordSuccess();
            return;
        }

        if (input.value && word) {
            focusNextBttfLetter(word, input);
        }
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value) {
            const word = selectBttfWord(input);
            if (word) {
                event.preventDefault();
                focusPreviousBttfLetter(word, input);
            }
        }
    });
});

// --- FINAL HEART PUZZLE ---
const heartPuzzleStage = document.getElementById('heart-puzzle-stage');
const heartPuzzleBoard = document.getElementById('heart-puzzle-board');
const finalLoveMessage = document.getElementById('final-love-message');

const HEART_PUZZLE_DIMENSION = 3;
const HEART_TILE_SIZE = 160;

const heartPuzzleSlots = [
    { row: 0, column: 0 }, { row: 0, column: 1 }, { row: 0, column: 2 },
    { row: 1, column: 0 }, { row: 1, column: 1 }, { row: 1, column: 2 },
    { row: 2, column: 0 }, { row: 2, column: 1 }, { row: 2, column: 2 }
];
const heartPuzzleSlotKeys = new Set(heartPuzzleSlots.map(({ row, column }) => `${row}:${column}`));

const shuffledHeartTiles = [4, 0, 8, 2, 6, 1, 7, 3, 5];
const heartPieces = [];
let activeHeartDrag = null;
let finalPuzzleSolved = false;

function hasHeartPuzzleSlot(row, column) {
    return heartPuzzleSlotKeys.has(`${row}:${column}`);
}

function oppositeHeartEdge(edge) {
    if (edge === 'tab') return 'slot';
    if (edge === 'slot') return 'tab';
    return 'flat';
}

function heartSeamType(row, column, axis) {
    const seed = axis === 'vertical' ? 1 : 2;
    return ((row * 7 + column * 11 + seed) % 2 === 0) ? 'tab' : 'slot';
}

function horizontalHeartEdge(y, outward, edge, reverse = false, start = 0, end = 160) {
    if (edge === 'flat') return `L ${reverse ? start : end} ${y}`;
    const sign = (edge === 'tab' ? 1 : -1) * outward;
    const bulge = y + sign * 34;
    const neck = y + sign * 12;
    
    if (!reverse) {
        return `L 64 ${y} C 64 ${neck}, 45 ${bulge}, 80 ${bulge} C 115 ${bulge}, 96 ${neck}, 96 ${y} L ${end} ${y}`;
    } else {
        return `L 96 ${y} C 96 ${neck}, 115 ${bulge}, 80 ${bulge} C 45 ${bulge}, 64 ${neck}, 64 ${y} L ${start} ${y}`;
    }
}

function verticalHeartEdge(x, outward, edge, reverse = false, start = 0, end = 160) {
    if (edge === 'flat') return `L ${x} ${reverse ? start : end}`;
    const sign = (edge === 'tab' ? 1 : -1) * outward;
    const bulge = x + sign * 34;
    const neck = x + sign * 12;
    
    if (!reverse) {
        return `L ${x} 64 C ${neck} 64, ${bulge} 45, ${bulge} 80 C ${bulge} 115, ${neck} 96, ${x} 96 L ${x} ${end}`;
    } else {
        return `L ${x} 96 C ${neck} 96, ${bulge} 115, ${bulge} 80 C ${bulge} 45, ${neck} 64, ${x} 64 L ${x} ${start}`;
    }
}

function heartPiecePath(tileIndex) {
    const { row, column } = heartPuzzleSlots[tileIndex];
    const boundaryEdge = (side) => {
        const neighbor = {
            top: [row - 1, column],
            right: [row, column + 1],
            bottom: [row + 1, column],
            left: [row, column - 1]
        }[side];
        return hasHeartPuzzleSlot(neighbor[0], neighbor[1]) ? null : 'boundary';
    };
    
    const edges = {
        top: boundaryEdge('top') || oppositeHeartEdge(heartSeamType(row - 1, column, 'horizontal')),
        right: boundaryEdge('right') || heartSeamType(row, column, 'vertical'),
        bottom: boundaryEdge('bottom') || heartSeamType(row, column, 'horizontal'),
        left: boundaryEdge('left') || oppositeHeartEdge(heartSeamType(row, column - 1, 'vertical'))
    };

    let d = '';
    const tl = [edges.left === 'boundary' ? -80 : 0, edges.top === 'boundary' ? -80 : 0];
    const tr = [edges.right === 'boundary' ? 240 : 160, edges.top === 'boundary' ? -80 : 0];
    const br = [edges.right === 'boundary' ? 240 : 160, edges.bottom === 'boundary' ? 240 : 160];
    const bl = [edges.left === 'boundary' ? -80 : 0, edges.bottom === 'boundary' ? 240 : 160];
    
    d += `M ${tl[0]} ${tl[1]} `;
    if (edges.top === 'boundary') {
        d += `L ${tr[0]} ${tr[1]} `;
    } else {
        d += `L 0 0 `;
        d += horizontalHeartEdge(0, -1, edges.top, false, 0, 160) + ' ';
    }
    
    if (edges.right === 'boundary') {
        d += `L ${br[0]} ${br[1]} `;
    } else {
        d += `L 160 0 `;
        d += verticalHeartEdge(160, 1, edges.right, false, 0, 160) + ' ';
    }
    
    if (edges.bottom === 'boundary') {
        d += `L ${bl[0]} ${bl[1]} `;
    } else {
        d += `L 160 160 `;
        d += horizontalHeartEdge(160, 1, edges.bottom, true, 0, 160) + ' ';
    }
    
    if (edges.left === 'boundary') {
        d += `L ${tl[0]} ${tl[1]} `;
    } else {
        d += `L 0 160 `;
        d += verticalHeartEdge(0, -1, edges.left, true, 0, 160) + ' ';
    }
    
    d += 'Z';
    return d;
}

function createHeartPieceArt(tileIndex) {
    const { row, column } = heartPuzzleSlots[tileIndex];
    const svgNamespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNamespace, 'svg');
    
    svg.setAttribute('viewBox', '-80 -80 320 320');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.pointerEvents = 'none';
    svg.style.setProperty('width', '320px', 'important');
    svg.style.setProperty('height', '320px', 'important');
    svg.style.setProperty('position', 'absolute', 'important');
    svg.style.setProperty('top', '-80px', 'important');
    svg.style.setProperty('left', '-80px', 'important');
    
    const defs = document.createElementNS(svgNamespace, 'defs');
    const clipPath = document.createElementNS(svgNamespace, 'clipPath');
    clipPath.id = `heart-clip-${tileIndex}`;
    
    const heartPathD = `M 240 120 C 240 20, 100 -20, 20 80 C -60 200, 120 340, 240 440 C 360 340, 540 200, 460 80 C 380 -20, 240 20, 240 120 Z`;
    
    const clipPathShape = document.createElementNS(svgNamespace, 'path');
    const shiftX = -column * HEART_TILE_SIZE;
    const shiftY = -row * HEART_TILE_SIZE;
    clipPathShape.setAttribute('transform', `translate(${shiftX}, ${shiftY})`);
    clipPathShape.setAttribute('d', heartPathD);
    
    clipPath.appendChild(clipPathShape);
    defs.appendChild(clipPath);
    svg.appendChild(defs);
    
    const g = document.createElementNS(svgNamespace, 'g');
    g.setAttribute('clip-path', `url(#heart-clip-${tileIndex})`);
    
    const path = document.createElementNS(svgNamespace, 'path');
    path.setAttribute('d', heartPiecePath(tileIndex));
    path.setAttribute('fill', tileIndex % 3 === 0 ? '#e52534' : '#d7192a');
    path.style.pointerEvents = 'visiblePainted';
    path.style.cursor = 'grab';
    path.setAttribute('stroke', '#8e1020');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linejoin', 'round');
    
    g.appendChild(path);
    svg.appendChild(g);
    return svg;
}

function setHeartPieceSlot(piece, slotIndex) {
    piece.dataset.slotIndex = String(slotIndex);
    const { row, column } = heartPuzzleSlots[slotIndex];
    piece.style.left = `${column * HEART_TILE_SIZE}px`;
    piece.style.top = `${row * HEART_TILE_SIZE}px`;
}

function isHeartPuzzleSolved() {
    return heartPieces.every((piece) => (
        Number(piece.dataset.tileIndex) === Number(piece.dataset.slotIndex)
    ));
}

function showFinalLoveMessage() {
    finalPuzzleSolved = true;
    saveProgress(7);
    revealSuccessAfterPause(() => {
        heartPuzzleStage.style.display = 'none';
        finalLoveMessage.style.display = 'flex';
    });
}

function beginHeartDrag(event) {
    if (event.button !== 0 || finalPuzzleSolved) return;

    event.preventDefault();
    event.stopPropagation();
    
    const piece = event.currentTarget;
    const captureTarget = event.target; 
    
    const pieceRect = piece.getBoundingClientRect();
    activeHeartDrag = {
        piece,
        captureTarget,
        offsetX: event.clientX - pieceRect.left,
        offsetY: event.clientY - pieceRect.top
    };
    piece.classList.add('is-dragging');
    
    try {
        captureTarget.setPointerCapture(event.pointerId);
    } catch(e) {}
}

function moveHeartPiece(event) {
    if (!activeHeartDrag) return;

    const { piece, offsetX, offsetY } = activeHeartDrag;
    const boardRect = heartPuzzleBoard.getBoundingClientRect();
    const maximumOffset = HEART_TILE_SIZE * (HEART_PUZZLE_DIMENSION - 1);
    
    const left = Math.max(0, Math.min(
        maximumOffset,
        event.clientX - boardRect.left - offsetX
    ));
    const top = Math.max(0, Math.min(
        maximumOffset,
        event.clientY - boardRect.top - offsetY
    ));
    
    piece.style.left = `${left}px`;
    piece.style.top = `${top}px`;
}

function finishHeartDrag(event) {
    if (!activeHeartDrag) return;

    const { piece, captureTarget } = activeHeartDrag;
    try {
        if (captureTarget && captureTarget.hasPointerCapture(event.pointerId)) {
            captureTarget.releasePointerCapture(event.pointerId);
        }
    } catch(e) {}
    
    piece.classList.remove('is-dragging');

    const originalSlot = Number(piece.dataset.slotIndex);
    const left = parseFloat(piece.style.left) || 0;
    const top = parseFloat(piece.style.top) || 0;
    
    const targetSlot = heartPuzzleSlots.reduce((closestSlot, slot, slotIndex) => {
        const closest = heartPuzzleSlots[closestSlot];
        const closestDistance = Math.hypot(
            left - closest.column * HEART_TILE_SIZE,
            top - closest.row * HEART_TILE_SIZE
        );
        const slotDistance = Math.hypot(
            left - slot.column * HEART_TILE_SIZE,
            top - slot.row * HEART_TILE_SIZE
        );
        return slotDistance < closestDistance ? slotIndex : closestSlot;
    }, 0);
    
    const occupant = heartPieces.find((candidate) => (
        candidate !== piece && Number(candidate.dataset.slotIndex) === targetSlot
    ));

    if (occupant) {
        setHeartPieceSlot(occupant, originalSlot);
    }
    setHeartPieceSlot(piece, targetSlot);
    activeHeartDrag = null;
    savePuzzleDraft('heart', heartPieces.map((entry) => Number(entry.dataset.slotIndex)), 6);

    if (isHeartPuzzleSolved()) {
        showFinalLoveMessage();
    }
}

shuffledHeartTiles.forEach((tileIndex, slotIndex) => {
    const piece = document.createElement('div');
    piece.className = 'heart-puzzle-piece';
    piece.style.pointerEvents = 'none';
    piece.style.width = `${HEART_TILE_SIZE}px`;
    piece.style.height = `${HEART_TILE_SIZE}px`;
    piece.dataset.tileIndex = String(tileIndex);
    
    piece.appendChild(createHeartPieceArt(tileIndex));
    setHeartPieceSlot(piece, slotIndex);
    
    piece.addEventListener('pointerdown', beginHeartDrag);
    piece.addEventListener('pointermove', moveHeartPiece);
    piece.addEventListener('pointerup', finishHeartDrag);
    piece.addEventListener('pointercancel', finishHeartDrag);
    
    heartPieces.push(piece);
    heartPuzzleBoard.appendChild(piece);
});

// --- SAVING & RESTORE PROGRESS LOGIC ---
const continueBtn = document.getElementById('continue-btn');
const startAgainBtn = document.getElementById('start-again-btn');
const nameInput = document.getElementById('name-input');
const signatureName = document.querySelector('.signature-name');
const legacySavedLevel = parseInt(localStorage.getItem('userProgress')) || 0;
let savedLevel = Math.max(legacySavedLevel, Number(notebookState.level) || 0);

function applyPlayerName(value) {
    const name = value.trim();
    signatureName.textContent = name ? `from ${name}` : 'from ...';
}

const storedName = typeof notebookState.name === 'string'
    ? notebookState.name
    : (localStorage.getItem('userName') || '');
nameInput.value = storedName;
applyPlayerName(storedName);

nameInput.addEventListener('input', () => {
    localStorage.setItem('userName', nameInput.value);
    saveNotebookState({ name: nameInput.value });
    applyPlayerName(nameInput.value);
});

function hasSavedDraft(key) {
    return Array.isArray(notebookState[key]) && notebookState[key].some((value) => String(value || '').trim());
}

const hasSavedWork = savedLevel > 0
    || Number(notebookState.currentPage) > 0
    || ['sudoku', 'hp', 'twilight', 'matrix', 'got', 'bttf', 'heart'].some(hasSavedDraft);

if (hasSavedWork) {
    continueBtn.style.display = 'block';
}

function restoreInputDraft(inputs, key) {
    const values = notebookState[key];
    if (!Array.isArray(values)) return;

    inputs.forEach((input, index) => {
        input.value = typeof values[index] === 'string' ? values[index] : '';
    });
}

function fillCrosswordAnswers(words, inputForCell) {
    words.forEach((word) => word.cells.forEach((cellIndex, letterIndex) => {
        const input = inputForCell(cellIndex);
        input.value = word.answer[letterIndex];
        input.disabled = true;
    }));
}

function enableCrosswordInputs(inputs) {
    inputs.forEach((input) => {
        input.disabled = false;
    });
}

function restoreProgressTo(level) {
    const savedSudoku = notebookState.sudoku;
    const sudokuCells = [...document.querySelectorAll('.cell')];
    if (Array.isArray(savedSudoku)) {
        sudokuCells.forEach((cell, index) => {
            if (sampleGrid[Math.floor(index / 9)][index % 9] === 0) {
                cell.innerText = typeof savedSudoku[index] === 'string' ? savedSudoku[index] : '';
            }
        });
    }

    if (level >= 1) {
        const solvedGrid = [
            [5, 3, 4, 6, 7, 8, 9, 1, 2], [6, 7, 2, 1, 9, 5, 3, 4, 8], [1, 9, 8, 3, 4, 2, 5, 6, 7],
            [8, 5, 9, 7, 6, 1, 4, 2, 3], [4, 2, 6, 8, 5, 3, 7, 9, 1], [7, 1, 3, 9, 2, 4, 8, 5, 6],
            [9, 6, 1, 5, 3, 7, 2, 8, 4], [2, 8, 7, 4, 1, 9, 6, 3, 5], [3, 4, 5, 2, 8, 6, 1, 7, 9]
        ];
        sudokuCells.forEach((cell, index) => {
            cell.innerText = solvedGrid[Math.floor(index / 9)][index % 9];
            cell.removeAttribute('tabindex');
        });
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('error-message').style.display = 'none';
        document.getElementById('success-message').style.display = 'block';
        isSudokuSolved = true;
    }

    restoreInputDraft(cwInputs, 'hp');
    if (level >= 2) {
        fillCrosswordAnswers(crosswordWords, inputForCell);
        crosswordContainer.style.display = 'none';
        crosswordSuccess.style.display = 'flex';
        crosswordSolved = true;
    } else {
        enableCrosswordInputs(cwInputs);
        crosswordContainer.style.display = '';
        crosswordSuccess.style.display = 'none';
        crosswordSolved = false;
    }

    restoreInputDraft(twilightCwInputs, 'twilight');
    if (level >= 3) {
        fillCrosswordAnswers(twilightWords, inputForTwilightCell);
        twilightCrosswordContainer.style.display = 'none';
        twilightCrosswordSuccess.style.display = 'flex';
        twilightCrosswordSolved = true;
    } else {
        enableCrosswordInputs(twilightCwInputs);
        twilightCrosswordContainer.style.display = '';
        twilightCrosswordSuccess.style.display = 'none';
        twilightCrosswordSolved = false;
    }

    restoreInputDraft(matrixCwInputs, 'matrix');
    if (level >= 4) {
        fillCrosswordAnswers(matrixWords, inputForMatrixCell);
        matrixCrosswordContainer.style.display = 'none';
        matrixCrosswordSuccess.style.display = 'flex';
        matrixCrosswordSolved = true;
    } else {
        enableCrosswordInputs(matrixCwInputs);
        matrixCrosswordContainer.style.display = '';
        matrixCrosswordSuccess.style.display = 'none';
        matrixCrosswordSolved = false;
    }

    restoreInputDraft(gotCwInputs, 'got');
    if (level >= 5) {
        fillCrosswordAnswers(gotWords, inputForGotCell);
        gotCrosswordContainer.style.display = 'none';
        gotCrosswordSuccess.style.display = 'flex';
        gotCrosswordSolved = true;
    } else {
        enableCrosswordInputs(gotCwInputs);
        gotCrosswordContainer.style.display = '';
        gotCrosswordSuccess.style.display = 'none';
        gotCrosswordSolved = false;
    }

    restoreInputDraft(bttfCwInputs, 'bttf');
    if (level >= 6) {
        fillCrosswordAnswers(bttfWords, inputForBttfCell);
        bttfCrosswordContainer.style.display = 'none';
        bttfCrosswordSuccess.style.display = 'flex';
        bttfCrosswordSolved = true;
    } else {
        enableCrosswordInputs(bttfCwInputs);
        bttfCrosswordContainer.style.display = '';
        bttfCrosswordSuccess.style.display = 'none';
        bttfCrosswordSolved = false;
    }

    const savedHeartSlots = notebookState.heart;
    if (Array.isArray(savedHeartSlots)) {
        heartPieces.forEach((piece, index) => {
            const slotIndex = Number(savedHeartSlots[index]);
            if (Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < heartPuzzleSlots.length) {
                setHeartPieceSlot(piece, slotIndex);
            }
        });
    }

    if (level >= 7) {
        heartPieces.forEach((piece) => {
            setHeartPieceSlot(piece, Number(piece.dataset.tileIndex));
        });
        finalPuzzleSolved = true;
        heartPuzzleStage.style.display = 'none';
        finalLoveMessage.style.display = 'flex';
    } else {
        finalPuzzleSolved = false;
        heartPuzzleStage.style.display = '';
        finalLoveMessage.style.display = 'none';
    }

    updateCrosswordErrors();
    updateTwilightCrosswordErrors();
    updateMatrixCrosswordErrors();
    updateGotCrosswordErrors();
    updateBttfCrosswordErrors();
}

function getResumePage(level) {
    const storedPage = Number(notebookState.currentPage);
    let resumePage = Number.isInteger(storedPage) && storedPage >= 0 && storedPage <= 6
        ? storedPage
        : Math.max(0, Math.min(6, level - 1));
    const completedPages = [
        isSudokuSolved,
        crosswordSolved,
        twilightCrosswordSolved,
        matrixCrosswordSolved,
        gotCrosswordSolved,
        bttfCrosswordSolved,
        finalPuzzleSolved
    ];

    if (completedPages[resumePage]) {
        resumePage = Math.min(6, resumePage + 1);
    }

    return resumePage;
}

function getReachableResumePage(page) {
    let reachablePage = page;
    if (reachablePage >= 1 && !isSudokuSolved) reachablePage = 0;
    if (reachablePage >= 2 && !crosswordSolved) reachablePage = 1;
    if (reachablePage >= 3 && !twilightCrosswordSolved) reachablePage = 2;
    if (reachablePage >= 4 && !matrixCrosswordSolved) reachablePage = 3;
    if (reachablePage >= 5 && !gotCrosswordSolved) reachablePage = 4;
    if (reachablePage >= 6 && !bttfCrosswordSolved) reachablePage = 5;
    return reachablePage;
}

function resumeToPage(page) {
    const targetPage = getReachableResumePage(page);

    const advance = () => {
        if (targetPage >= 1 && bookState === 'open') {
            turnPage1();
        } else if (targetPage >= 2 && bookState === 'page1-turned') {
            turnPage2();
        } else if (targetPage >= 3 && bookState === 'page2-turned') {
            turnPage3();
        } else if (targetPage >= 4 && bookState === 'page3-turned') {
            turnPage4();
        } else if (targetPage >= 5 && bookState === 'page4-turned') {
            turnPage5();
        } else if (targetPage >= 6 && bookState === 'page5-turned') {
            turnPage6();
        } else {
            return;
        }

        window.setTimeout(advance, OPEN_TRANSITION_MS);
    };

    advance();
}

restoreProgressTo(savedLevel);

continueBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    openBook(() => resumeToPage(getResumePage(savedLevel)));
});

startAgainBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    localStorage.removeItem(NOTEBOOK_STATE_KEY);
    localStorage.removeItem('userProgress');
    localStorage.removeItem('userName');
    window.location.reload();
});
