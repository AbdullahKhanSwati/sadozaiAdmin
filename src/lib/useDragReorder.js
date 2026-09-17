import { useState } from 'react';

// HTML5 drag-and-drop for a list of rows. Spread `rowProps(id)` onto each row
// and call `onMove(fromId, toId)` reorders when a row is dropped on another.
// `dragId` / `overId` let the row style itself while dragging. Pair it with
// up/down buttons for touch screens, where HTML5 drag events aren't reliable.
export function useDragReorder(onMove) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const rowProps = (id) => ({
    draggable: true,
    onDragStart: (e) => {
      setDragId(id);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(id)); } catch { /* older browsers */ }
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (overId !== id) setOverId(id);
    },
    onDrop: (e) => {
      e.preventDefault();
      if (dragId != null && dragId !== id) onMove(dragId, id);
      setDragId(null);
      setOverId(null);
    },
    onDragEnd: () => { setDragId(null); setOverId(null); },
  });

  // Row classes for the two visual states.
  const rowClass = (id) => [
    dragId === id ? 'opacity-40' : '',
    overId === id && dragId && dragId !== id ? 'bg-mun-50 ring-1 ring-mun-300' : '',
  ].join(' ');

  return { dragId, overId, rowProps, rowClass };
}

// Move the element with id `fromId` to the position of `toId`; returns a new array.
export function moveById(list, fromId, toId) {
  const from = list.findIndex((x) => x.id === fromId);
  const to = list.findIndex((x) => x.id === toId);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

// Move the element at `index` one step up (-1) or down (+1); returns a new array.
export function moveByStep(list, index, dir) {
  const j = index + dir;
  if (index < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}
