import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TodoList.css'; // import CSS for TodoList styling
import { Todo } from './types/todo.ts';
import { Folder } from './types/folder'; // Import Folder type
import { FolderIconRenderer } from './Sidebar.tsx'; // Corrected import
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'; // For new task input buttons

interface TodoListProps {
  selectedFolder: Folder; // Receive the full selected folder object
  globalSearchTerm: string; // Added new prop for global search term
  allTodos: Todo[]; // Receive all todos as a prop
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>; // Receive setter for todos
  isAddingTask: boolean;    // Is the new task input UI visible?
  onConfirmAddTask: (taskText: string) => void; // Callback to add the task
  onCancelAddTask: () => void;  // Callback to cancel adding
}

// REMOVED Unused constants for the old input field's magnetic effect
// const INPUT_PROXIMITY_RADIUS = 75; 
// const INPUT_MAX_OFFSET = 10; 
// const INPUT_PULL_FACTOR = 0.12; 

// Constants for the checkbox magnetic effect (ensure these are also removed if that feature is not active)
// const CHECKBOX_PROXIMITY_RADIUS = 50; 
// const CHECKBOX_MAX_OFFSET = 4;      
// const CHECKBOX_PULL_FACTOR = 0.1;   

const TodoList: React.FC<TodoListProps> = ({ 
  selectedFolder, 
  globalSearchTerm, 
  allTodos, 
  setTodos, 
  isAddingTask, 
  onConfirmAddTask, 
  onCancelAddTask 
}) => {
  const [tagInput, setTagInput] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  // REMOVED checkbox magnetic effect refs and state as per earlier decisions
  // const checkmarkRefs = useRef(new Map<number, HTMLSpanElement | null>());
  // const checkboxLabelRefs = useRef(new Map<number, HTMLLabelElement | null>());
  // const [magneticallyActiveCheckboxId, setMagneticallyActiveCheckboxId] = useState<number | null>(null);
  // const checkboxAnimationRef = useRef<number | null>(null);

  const [newTodoText, setNewTodoText] = useState(''); // Local state for the new task input
  const newTaskInputRef = useRef<HTMLInputElement>(null); // Ref for the new task input

  // Focus the new task input when isAddingTask becomes true
  useEffect(() => {
    if (isAddingTask && newTaskInputRef.current) {
      newTaskInputRef.current.focus();
      setNewTodoText(''); // Clear any previous text
    }
  }, [isAddingTask]);

  const handleCheckboxContainerMouseEnter = useCallback((todoId: number) => {
    if (focusedId === todoId) {
      setFocusedId(null);
    }
  }, [focusedId]);

  const handleCheckboxContainerMouseLeave = useCallback((todoId: number) => {
    setFocusedId(todoId);
  }, []);

  useEffect(() => {
    if (focusedId === null) return () => {};

    const handleCheckboxMouseMove = (event: MouseEvent) => {
      const element = document.querySelector(`[data-todo-id="${focusedId}"] .todo-text`);
      if (element instanceof HTMLElement) {
        element.blur();
      }
    };

    document.addEventListener('mousemove', handleCheckboxMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleCheckboxMouseMove);
    };
  }, [focusedId]);

  // Filter todos based on selected folder, search term, and tags
  const todosForCurrentFolder = allTodos.filter(todo => todo.folderId === selectedFolder.id);

  const filteredTodos = todosForCurrentFolder.filter(todo => {
    const searchTerm = globalSearchTerm.toLowerCase();
    if (searchTerm === '') return true; // Show all todos in folder if no search term
    const matchesText = todo.text.toLowerCase().includes(searchTerm);
    const matchesTags = todo.tags.some(tag => tag.toLowerCase().includes(searchTerm));
    return matchesText || matchesTags;
  });

  // Toggle completed state of a todo
  const toggleComplete = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const updateTodoText = (id: number, newText: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, text: newText } : todo
      )
    );
  };

  const handleMouseLeave = (id: number) => {
    setEditingId(null);
    if (focusedId === id) {
      const element = document.querySelector(`[data-todo-id="${id}"] .todo-text`);
      if (element instanceof HTMLElement) {
        element.blur();
      }
    }
  };

  const addTag = (todoId: number, tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag === '') return;

    setTodos(prev =>
      prev.map(todo => {
        if (todo.id === todoId) {
          if (todo.tags.includes(trimmedTag)) return todo;
          return { ...todo, tags: [...todo.tags, trimmedTag] };
        }
        return todo;
      })
    );
    setTagInput('');
  };

  const removeTag = (todoId: number, tagToRemove: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === todoId
          ? { ...todo, tags: todo.tags.filter(tag => tag !== tagToRemove) }
          : todo
      )
    );
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, todoId: number) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(todoId, tagInput);
    }
  };

  const handleNewTaskConfirm = () => {
    if (newTodoText.trim() !== '') {
      onConfirmAddTask(newTodoText.trim());
      setNewTodoText(''); // Clear input after confirm
    }
  };

  const handleNewTaskCancel = () => {
    onCancelAddTask();
    setNewTodoText(''); // Clear input on cancel
  };

  const handleNewTaskKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNewTaskConfirm();
    }
    if (e.key === 'Escape') {
      handleNewTaskCancel();
    }
  };

  return (
    <div className="todo-list-container">
      <header className="todo-list-header">
        <h1>
          {selectedFolder.icon && (
            <span className="folder-title-icon">
              <FolderIconRenderer iconName={selectedFolder.icon} />
            </span>
          )}
          {selectedFolder.name}
        </h1>
      </header>

      {isAddingTask && (
        <div className="new-task-entry-section">
          <input
            ref={newTaskInputRef}
            type="text"
            placeholder="Enter new task..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={handleNewTaskKeyPress}
            className="new-task-entry-input"
          />
          <button onClick={handleNewTaskConfirm} className="new-task-confirm-button" aria-label="Confirm add task">
            <CheckIcon />
          </button>
          <button onClick={handleNewTaskCancel} className="new-task-cancel-button" aria-label="Cancel add task">
            <XMarkIcon />
          </button>
        </div>
      )}

      {filteredTodos.length === 0 && globalSearchTerm === '' && !isAddingTask && (
        <div className="empty-folder-placeholder">
          <span className="placeholder-icon">
            <FolderIconRenderer iconName={selectedFolder.icon || 'DefaultFolderIcon'} />
          </span>
          <p>No tasks in {selectedFolder.name}.</p>
        </div>
      )}

      {filteredTodos.length === 0 && globalSearchTerm !== '' && !isAddingTask && (
        <div className="empty-folder-placeholder">
          <p>No tasks match "{globalSearchTerm}" in {selectedFolder.name}.</p>
        </div>
      )}

      {filteredTodos.length > 0 && (
        <ul className="todo-list" style={{ marginTop: isAddingTask ? '10px' : '0' }}>
          {filteredTodos.map(todo => (
            <li 
              key={todo.id} 
              className="todo-item"
              data-todo-id={todo.id}
            >
              <div className="todo-content">
                <label 
                  className="checkbox-container"
                  onMouseEnter={() => handleCheckboxContainerMouseEnter(todo.id)}
                  onMouseLeave={() => handleCheckboxContainerMouseLeave(todo.id)}
                >
                  <input
                    type="checkbox"
                    className="todo-checkbox"
                    checked={todo.completed}
                    onChange={() => toggleComplete(todo.id)}
                    aria-label={`Toggle completion for ${todo.text}`}
                  />
                  <span 
                    className="checkmark"
                  />
                </label>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck="false"
                  onFocus={() => setFocusedId(todo.id)}
                  onBlur={(e) => {
                    updateTodoText(todo.id, e.currentTarget.textContent || '');
                    setEditingId(null);
                    setFocusedId(null);
                  }}
                  onMouseEnter={() => setEditingId(todo.id)}
                  onMouseLeave={() => handleMouseLeave(todo.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLElement).blur();
                    }
                  }}
                  className={`todo-text ${todo.completed ? 'completed' : ''} ${editingId === todo.id || focusedId === todo.id ? 'editing' : ''}`}
                >
                  {todo.text}
                </div>
              </div>
              <div className="tag-section">
                <input
                  type="text"
                  defaultValue={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => handleTagKeyPress(e, todo.id)}
                  placeholder="Add tag..."
                  className="tag-input"
                />
                <div className="tags-container">
                  {todo.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                      <button
                        className="remove-tag"
                        onClick={() => removeTag(todo.id, tag)}
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TodoList; 