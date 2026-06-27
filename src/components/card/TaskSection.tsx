'use client';

import { useEffect, useRef, useState } from 'react';
import type { Task } from '@/types/card';
import { InlineAdd } from './InlineAdd';

interface TaskSectionProps {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
}

function TaskRow({
  task,
  onToggle,
  onRename,
  onRemove,
}: {
  task: Task;
  onToggle: () => void;
  onRename: (text: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    const v = ref.current?.value.trim() ?? '';
    if (v && v !== task.text) onRename(v);
  }

  return (
    <div className={`card-task ${task.completed ? 'done' : ''}`}>
      <button
        type="button"
        className="card-box"
        onClick={onToggle}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed ? '✓' : ''}
      </button>
      {editing ? (
        <input
          ref={ref}
          defaultValue={task.text}
          className="card-task-input"
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className="card-task-txt" onClick={() => setEditing(true)}>
          {task.text}
        </span>
      )}
      <button type="button" className="card-task-rm" onClick={onRemove} aria-label="Remove task">
        ✕
      </button>
    </div>
  );
}

export function TaskSection({ tasks, onChange }: TaskSectionProps) {
  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <>
      <div className="card-progress">
        <div className="card-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div>
        {tasks.map((task, i) => (
          <TaskRow
            key={i}
            task={task}
            onToggle={() =>
              onChange(tasks.map((t, j) => (j === i ? { ...t, completed: !t.completed } : t)))
            }
            onRename={(text) => onChange(tasks.map((t, j) => (j === i ? { ...t, text } : t)))}
            onRemove={() => onChange(tasks.filter((_, j) => j !== i))}
          />
        ))}
      </div>
      <InlineAdd
        variant="task"
        label="Add a task"
        placeholder="Task name"
        onAdd={(text) => onChange([...tasks, { text, completed: false }])}
      />
    </>
  );
}
