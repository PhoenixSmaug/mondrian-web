import React, { useState, useEffect } from 'react';
import MondrianGrid from './MondrianGrid';
import './App.css';

// 26 highly distinct colors (Kelly's + extended)
const BUTTON_COLORS = [
  "#FFB300", "#803E75", "#FF6800", "#A6BDD7", "#C10020", "#CEA262", "#817066", "#007D34", "#F6768E", "#00538A", "#FF7A5C", "#53377A", "#FF8E00", "#B32851", "#F4C800", "#7F180D", "#93AA00", "#593315", "#F13A13", "#232C16", "#00A1C2", "#A0A0A0", "#8F3931", "#1E90FF", "#FF1493", "#228B22", "#FF1493"
];

// OEIS A276523 b-file (grid size -> smallest possible defect)
const SMALLEST_DEFECT = {
  3:2, 4:4, 5:4, 6:5, 7:5, 8:6, 9:6, 10:8, 11:6, 12:7, 13:8, 14:6, 15:8, 16:8, 17:8, 18:8, 19:8, 20:9, 21:9, 22:9, 23:8, 24:9, 25:10, 26:9, 27:10, 28:9, 29:9, 30:11, 31:11, 32:10, 33:12, 34:12, 35:11, 36:12, 37:11, 38:10, 39:11, 40:12
};

function App() {
  const [sliderValue, setSliderValue] = useState(10);
  const [gridSize, setGridSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [pendingValue, setPendingValue] = useState(10);
  const [isDragging, setIsDragging] = useState(false);
  const [markSelection, setMarkSelection] = useState(null);
  const [markTrigger, setMarkTrigger] = useState(0);
  const [usedLetters, setUsedLetters] = useState([]); // track used letters
  const [history, setHistory] = useState([]); // {cells, letter, color}
  const [resetKey, setResetKey] = useState(0); // force grid reset
  const [pendingUndo, setPendingUndo] = useState(null); // ensure undo is processed
  // Add congruent warning modal
  const [congruentWarning, setCongruentWarning] = useState(null);
  const [hasCongruence, setHasCongruence] = useState(false); // track congruence state
  const [deleteLetter, setDeleteLetter] = useState(null); // for delete popup
  const [clearRectangle, setClearRectangle] = useState(null); // for external clearing
  const [showResetModal, setShowResetModal] = useState(false); // modal for grid reset

  // Reset everything on grid size change
  useEffect(() => {
    setUsedLetters([]);
    setHistory([]);
    setMarkSelection(null);
    setMarkTrigger(0);
    setResetKey(k => k + 1);
    setPendingUndo(null);
    setHasCongruence(false); // Reset congruence state on grid size change
    setCongruentWarning(null); // Also clear congruence warning
  }, [gridSize]);

  // Helper: get rectangle from cells
  function getRectFromCells(cells) {
    const coords = cells.map(id => id.split('-').map(Number));
    const rows = coords.map(([r]) => r);
    const cols = coords.map(([,c]) => c);
    const minRow = Math.min(...rows), maxRow = Math.max(...rows);
    const minCol = Math.min(...cols), maxCol = Math.max(...cols);
    return { width: maxCol - minCol + 1, height: maxRow - minRow + 1 };
  }
  // Helper: congruence (width/height or flipped)
  function areRectsCongruent(r1, r2) {
    return (
      (r1.width === r2.width && r1.height === r2.height) ||
      (r1.width === r2.height && r1.height === r2.width)
    );
  }

  // Check for congruence in history
  function checkHasCongruence(hist) {
    const rects = hist.filter(h => h.cells.length > 1).map(h => ({...getRectFromCells(h.cells), letter: h.letter}));
    for (let i = 0; i < rects.length; ++i) {
      for (let j = i + 1; j < rects.length; ++j) {
        if (areRectsCongruent(rects[i], rects[j])) return {letters: [rects[i].letter, rects[j].letter]};
      }
    }
    return null;
  }

  // When a letter is placed, update usedLetters and history
  const handleMark = (cells, letter, color) => {
    // Block placement if congruence exists
    if (hasCongruence) {
      if (congruentWarning) setCongruentWarning({ ...congruentWarning });
      else {
        // Show warning for the first found congruent pair
        const found = checkHasCongruence([...history, {cells, letter, color}]);
        if (found) {
          setCongruentWarning({
            letter1: found.letters[0],
            letter2: found.letters[1],
            onClose: () => setCongruentWarning(null)
          });
        }
      }
      return;
    }
    setUsedLetters(prev => [...prev, letter]);
    const newHistory = [...history, { cells, letter, color }];
    setHistory(newHistory);
    // Check for congruence after placement
    const found = checkHasCongruence(newHistory);
    setHasCongruence(!!found);
    if (found) {
      setCongruentWarning({
        letter1: found.letters[0],
        letter2: found.letters[1],
        onClose: () => setCongruentWarning(null)
      });
    }
  };

  // Compute defect: area difference between largest and smallest rectangle (only if at least 2 placed)
  const rectAreas = history
    .filter(h => h.cells.length > 1)
    .map(h => h.cells.length);
  let defect = '-';
  if (rectAreas.length >= 2) {
    defect = Math.max(...rectAreas) - Math.min(...rectAreas);
  }
  // Check if grid is fully filled
  const totalCells = gridSize * gridSize;
  const filledCells = history.reduce((acc, h) => acc + h.cells.length, 0);
  const gridFilled = filledCells === totalCells;

  // Undo last marking
  useEffect(() => {
    if (!pendingUndo) return;
    const { cells, letter } = pendingUndo;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setUsedLetters(prev => prev.filter(l => l !== letter));
    setMarkSelection({ undo: true, cells, letter, trigger: markTrigger + 1 });
    setMarkTrigger(markTrigger + 1);
    setPendingUndo(null);
    // Update congruence state and warning after undo
    const found = checkHasCongruence(newHistory);
    setHasCongruence(!!found);
    if (found) {
      setCongruentWarning({
        letter1: found.letters[0],
        letter2: found.letters[1],
        onClose: () => setCongruentWarning(null)
      });
    } else {
      setCongruentWarning(null);
    }
  }, [pendingUndo]);

  // Handle letter button click
  const handleClick = (letter, color, used) => {
    if (used) {
      setDeleteLetter(letter);
      return;
    }
    if (usedLetters.includes(letter) || hasCongruence) return; // block if congruence
    setMarkSelection({ color, letter, trigger: markTrigger + 1 });
    setMarkTrigger(markTrigger + 1);
  };

  // Confirm delete rectangle
  const confirmDelete = () => {
    if (!deleteLetter) return;
    // Find the rectangle to delete
    const rect = history.find(h => h.letter === deleteLetter);
    // Remove from history and usedLetters
    const newHistory = history.filter(h => h.letter !== deleteLetter);
    setHistory(newHistory);
    setUsedLetters(prev => prev.filter(l => l !== deleteLetter));
    // Trigger external clearing of the rectangle in the grid
    if (rect) {
      setClearRectangle({ cells: rect.cells, letter: rect.letter, trigger: Date.now() });
    }
    // Update congruence state and warning after delete
    const found = checkHasCongruence(newHistory);
    setHasCongruence(!!found);
    if (found) {
      setCongruentWarning({
        letter1: found.letters[0],
        letter2: found.letters[1],
        onClose: () => setCongruentWarning(null)
      });
    } else {
      setCongruentWarning(null);
    }
    setDeleteLetter(null);
  };
  const cancelDelete = () => setDeleteLetter(null);

  // Handle slider change
  const handleSliderChange = (e) => {
    setSliderValue(Number(e.target.value));
    setIsDragging(true);
  };
  const handleSliderChangeEnd = () => {
    setIsDragging(false);
    if (sliderValue !== gridSize) {
      setPendingValue(sliderValue);
      setShowModal(true);
    }
  };
  const confirmChange = () => {
    setGridSize(pendingValue);
    setShowModal(false);
  };
  const cancelChange = () => {
    setSliderValue(gridSize);
    setShowModal(false);
  };

  // Handle undo button click
  function handleUndo() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setPendingUndo({ cells: last.cells, letter: last.letter });
  }

  // Handle grid reset
  const handleResetGrid = () => {
    setUsedLetters([]);
    setHistory([]);
    setMarkSelection(null);
    setMarkTrigger(0);
    setResetKey(k => k + 1);
    setPendingUndo(null);
    setHasCongruence(false);
    setCongruentWarning(null);
    setDeleteLetter(null);
    setClearRectangle(null);
    setShowResetModal(false);
  };

  // Render 26 buttons in 13x2 grid
  const letterButtons = Array.from({ length: 26 }, (_, i) => {
    const letter = String.fromCharCode(65 + i);
    const used = usedLetters.includes(letter);
    return (
      <button
        key={letter}
        className="letter-btn"
        style={{ background: BUTTON_COLORS[i % BUTTON_COLORS.length], opacity: used ? 0.3 : 1, cursor: used ? 'pointer' : 'pointer' }}
        onClick={() => handleClick(letter, BUTTON_COLORS[i % BUTTON_COLORS.length], used)}
      >
        {letter}
      </button>
    );
  });

  // Defect coloring uses hasCongruence
  const smallestDefect = SMALLEST_DEFECT[gridSize] !== undefined ? SMALLEST_DEFECT[gridSize] : '-';
  return (
    <div className="container">
      <h1 style={{ fontSize: '2.3em'}}>Mondrian Art Problem</h1>
      <h2 style={{ fontSize: '1.6em', fontWeight: 600, margin: '1.2em auto 0 auto', maxWidth: 600, color: '#222', textAlign: 'center', marginBottom: '0.7em' }}>How to Play</h2>
      <div className="rules" style={{ background: '#f6f6f6', borderRadius: 10, padding: '0.8em 1.2em', margin: '0.5em auto 0 auto', maxWidth: 600 }}>
        <ul style={{ color: '#333', fontSize: '0.98em', margin: 0, paddingLeft: '1.2em', lineHeight: 1.45 }}>
          <li><strong>Draw rectangles:</strong> Click and drag with the left mouse button to select a rectangle. Then press one of the 26 letter buttons (or use your keyboard) to color it.</li>
          <li><strong>Erase:</strong> Right-click a rectangle to delete it, or use the Undo button to remove your last move.</li>
          <li><strong>No repeats:</strong> Each rectangle size can only be used once! A 3×4 and a 4×3 count as the same — so pick carefully.</li>
          <li><strong>What’s the defect?</strong> It’s the difference in area between your biggest and smallest rectangles so far. The more balanced your pieces, the lower the defect.</li>
          <li><strong>What’s the goal?</strong> Fill the entire grid with rectangles and try to keep your defect as low as possible while doing it. It’s a fun puzzle and surprisingly tricky!</li>
        </ul>
      </div>
      <h2 style={{ fontSize: '1.6em', fontWeight: 600, margin: '2em auto 0.5em auto', maxWidth: 600, color: '#222', textAlign: 'center', marginBottom: '0.7em' }}>Try it yourself!</h2>
      <div className="defect-bar">
        <span className={`defect-label${hasCongruence ? ' defect-red' : gridFilled ? ' defect-green' : ''}`}>Current Defect:</span>
        <span className={`defect-value${hasCongruence ? ' defect-red' : gridFilled ? ' defect-green' : ''}`}>{defect}</span>
        <span className="defect-separator">|</span>
        <span className="defect-label">Smallest possible Defect:</span>
        <span className="defect-value">{smallestDefect}</span>
      </div>
      <div className="letter-grid">
        {letterButtons}
      </div>
      <div className="game-area">
        <MondrianGrid
          key={resetKey}
          gridSize={gridSize}
          markSelection={markSelection}
          onMark={handleMark}
          clearRectangle={clearRectangle}
          onDeleteRect={setDeleteLetter}
        />
      </div>
      <div className="controls-bar" style={{ display: 'flex', alignItems: 'center', gap: '1.2em', justifyContent: 'center', marginTop: '1.5em' }}>
        <div className="slider-area" style={{ display: 'flex', alignItems: 'center', gap: '1em' }}>
          <input
            id="grid-size-slider"
            type="range"
            min="5"
            max="40"
            value={sliderValue}
            onChange={handleSliderChange}
            onMouseUp={handleSliderChangeEnd}
            onTouchEnd={handleSliderChangeEnd}
            style={{ marginRight: '0.5em' }}
          />
          <div className="slider-label">Grid Size: {sliderValue}</div>
        </div>
        <div style={{ display: 'flex', gap: '1em' }}>
          <button className="action-btn" onClick={handleUndo} disabled={history.length === 0} title="Undo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: 'auto' }}>
              <rect width="28" height="28" rx="8" fill="#f5f5f5"/>
              <path d="M19 19C19 15.134 15.866 12 12 12H7.83l2.58-2.58a1 1 0 10-1.42-1.42l-4.3 4.3a1 1 0 000 1.42l4.3 4.3a1 1 0 101.42-1.42L7.83 16H12c2.761 0 5 2.239 5 5a1 1 0 102 0z" fill="#1976d2"/>
            </svg>
          </button>
          <button className="action-btn" onClick={() => setShowResetModal(true)} title="Reset Grid">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: 'auto' }}>
              <rect width="28" height="28" rx="8" fill="#f5f5f5"/>
              <line x1="9" y1="9" x2="19" y2="19" stroke="#1976d2" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="19" y1="9" x2="9" y2="19" stroke="#1976d2" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <h2 style={{ fontSize: '1.6em', fontWeight: 600, margin: '2em auto 0.5em auto', maxWidth: 600, color: '#222', textAlign: 'center', marginBottom: '0.7em' }}>Background</h2>
      <div className="rules" style={{ background: '#f6f6f6', borderRadius: 10, padding: '0.8em 1.2em', margin: '0.5em auto 0 auto', maxWidth: 600 }}>
        <div style={{ color: '#333', fontSize: '0.98em', lineHeight: 1.45 }}>
          <p>
            The <strong>Mondrian Art Problem</strong> is inspired by the abstract, geometric style of the Dutch painter <a href="https://en.wikipedia.org/wiki/Piet_Mondrian" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>Piet Mondrian</a>. Finding the minimal defect is challenging even with modern computers, with optimal values known only up to grid size 65, as detailed on the <a href='https://oeis.org/A276523' target='_blank' rel='noopener noreferrer' style={{ color: '#1976d2', textDecoration: 'underline' }}>OEIS</a>.
          </p>
          <p>
            In collaboration with Natalia García-Colín, Dimitri Leemans, and Érika Roldán, I explored whether certain grid sizes allow for a <strong>perfect solution with defect 0</strong> in <a href="https://doi.org/10.1016/j.dam.2024.09.021" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }}>this research paper</a>.
          </p>
        </div>
      </div>
      <div className="footer" style={{ marginTop: '2em', color: '#333', fontSize: '1em', textAlign: 'center' }}>
        Website made by <a href="https://github.com/PhoenixSmaug" target="_blank" style={{ color: '#1976d2', textDecoration: 'underline' }}>Mia Müßig</a>
      </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Are you sure you want to change the grid size to {pendingValue}? All rectangles will be cleared.</p>
            <div className="modal-buttons">
              <button className="confirm" onClick={confirmChange}>Confirm</button>
              <button className="cancel" onClick={cancelChange}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {congruentWarning && (
        <div className="modal-overlay">
          <div className="modal congruent-modal">
            <div className="congruent-warning-text">
              <span className="congruent-warning-bold">Warning:</span> Rectangle
              <span className="congruent-rect-btn" style={{background: BUTTON_COLORS[congruentWarning.letter1.charCodeAt(0)-65]}}>
                {congruentWarning.letter1}
              </span>
              is congruent to
              <span className="congruent-rect-btn" style={{background: BUTTON_COLORS[congruentWarning.letter2.charCodeAt(0)-65]}}>
                {congruentWarning.letter2}
              </span>
              !
            </div>
            <div className="modal-buttons">
              <button className="confirm" onClick={congruentWarning.onClose}>OK</button>
            </div>
          </div>
        </div>
      )}
      {deleteLetter && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Delete rectangle <span className="congruent-rect-btn" style={{background: BUTTON_COLORS[deleteLetter.charCodeAt(0)-65]}}>{deleteLetter}</span>?</p>
            <div className="modal-buttons">
              <button className="confirm" onClick={confirmDelete}>Delete</button>
              <button className="cancel" onClick={cancelDelete}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Are you sure you want to reset the grid? All rectangles will be cleared.</p>
            <div className="modal-buttons">
              <button className="confirm" onClick={handleResetGrid}>Reset</button>
              <button className="cancel" onClick={() => setShowResetModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Keyboard shortcut for letter buttons */}
      <div style={{ display: 'none' }}>
        {useEffect(() => {
          function handleKeyDown(e) {
            const key = e.key.toUpperCase();
            if (key.length === 1 && key >= 'A' && key <= 'Z') {
              const idx = key.charCodeAt(0) - 65;
              if (idx >= 0 && idx < 26) {
                const color = BUTTON_COLORS[idx % BUTTON_COLORS.length];
                const used = usedLetters.includes(key);
                handleClick(key, color, used);
              }
            }
          }
          window.addEventListener('keydown', handleKeyDown);
          return () => window.removeEventListener('keydown', handleKeyDown);
        }, [usedLetters, hasCongruence, handleClick])}
      </div>
    </div>
  );
}

export default App;
