import React, { useState, useEffect } from 'react';
import './MondrianGrid.css';

export default function MondrianGrid({ gridSize, markSelection, onMark, clearRectangle, onDeleteRect }) {
  const GRID_SIZE_PX = 600; // total grid size in px
  const cellSize = GRID_SIZE_PX / gridSize;

  // cellStates: { [cellId]: { color, letter } }
  const [cellStates, setCellStates] = useState({});
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);

  // Reset all state when grid size changes
  useEffect(() => {
    setCellStates({});
    setSelectedCells(new Set());
    setIsDragging(false);
    setStartCell(null);
  }, [gridSize]);

  // Clear rectangle externally when clearRectangle changes
  useEffect(() => {
    if (!clearRectangle || !Array.isArray(clearRectangle.cells) || clearRectangle.cells.length === 0) return;
    setCellStates((prev) => {
      const next = { ...prev };
      clearRectangle.cells.forEach((id) => {
        if (next[id] && (!clearRectangle.letter || next[id].letter === clearRectangle.letter)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [clearRectangle]);

  // Mark selection or undo when markSelection changes
  useEffect(() => {
    if (!markSelection) return;
    if (markSelection.undo) {
      // Undo: clear marks for given cells and letter
      setCellStates((prev) => {
        const next = { ...prev };
        markSelection.cells.forEach((id) => {
          if (next[id] && next[id].letter === markSelection.letter) {
            delete next[id];
          }
        });
        return next;
      });
      return;
    }
    const { color, letter, trigger } = markSelection;
    if (!color || !letter || !trigger) return;
    // Only mark if all selected cells are unmarked
    const canMark = Array.from(selectedCells).every(
      (id) => !cellStates[id]
    );
    if (selectedCells.size > 0 && canMark) {
      setCellStates((prev) => {
        const next = { ...prev };
        selectedCells.forEach((id) => {
          next[id] = { color, letter };
        });
        // Inform parent of the mark for history/undo
        if (onMark) onMark(Array.from(selectedCells), letter, color);
        return next;
      });
      setSelectedCells(new Set()); // clear selection immediately after marking
    }
  }, [markSelection]);

  const getCellsInRect = (start, end) => {
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const cells = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        cells.push(`${row}-${col}`);
      }
    }
    return cells;
  };

  // Selection logic: left mouse only (no ctrl)
  const handleMouseDown = (e, row, col) => {
    if (e.button === 0) { // left mouse only
      setStartCell({ row, col });
      setIsDragging(true);
      e.preventDefault(); // prevent text selection
    }
  };

  const handleMouseEnter = (e, row, col) => {
    if (isDragging && startCell) {
      const newCells = getCellsInRect(startCell, { row, col });
      setSelectedCells(new Set(newCells));
    }
  };

  // Listen for mouseup anywhere on document to end drag
  useEffect(() => {
    if (!isDragging) return;
    const handleDocMouseUp = () => {
      setIsDragging(false);
      setStartCell(null);
    };
    document.addEventListener('mouseup', handleDocMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleDocMouseUp);
    };
  }, [isDragging]);

  // Render
  return (
    <div
      className="grid-container"
      style={{ width: GRID_SIZE_PX, height: GRID_SIZE_PX }}
    >
      {Array.from({ length: gridSize }).map((_, row) => (
        <div className="row" key={row}>
          {Array.from({ length: gridSize }).map((_, col) => {
            const id = `${row}-${col}`;
            const isSelected = selectedCells.has(id);
            const mark = cellStates[id];
            return (
              <div
                key={id}
                className={`cell${isSelected ? ' selected' : ''}${mark ? ' marked' : ''}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  background: mark ? mark.color : undefined,
                }}
                onMouseDown={(e) => handleMouseDown(e, row, col)}
                onMouseEnter={(e) => handleMouseEnter(e, row, col)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (mark && onDeleteRect) {
                    onDeleteRect(mark.letter);
                  }
                }}
              >
                {/* No letter shown */}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
