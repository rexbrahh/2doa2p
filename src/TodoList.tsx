import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TodoList.css'; // import CSS for TodoList styling
import { Todo } from './types/todo.ts';
import { Folder } from './types/folder'; // Import Folder type
import { FolderIconRenderer } from './Sidebar.tsx'; // Corrected import
import { CheckIcon, XMarkIcon, BookmarkIcon } from '@heroicons/react/24/solid'; // For new task input buttons and BookmarkIcon
import { todoStorage } from './services/todoStorage.ts';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'; // For search input

interface TodoListProps {
  selectedFolder: Folder; // Receive the full selected folder object
  globalSearchTerm: string; // Added new prop for global search term
  allTodos: Todo[]; // Receive all todos as a prop
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>; // Receive setter for todos
  isAddingTask: boolean;    // Is the new task input UI visible?
  onConfirmAddTask: (taskText: string) => void; // Callback to add the task
  onCancelAddTask: () => void;  // Callback to cancel adding
}

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

  const [expandedTagInputTodoId, setExpandedTagInputTodoId] = useState<number | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null); // Ref for the actual tag input field

  // Focus the new task input when isAddingTask becomes true
  useEffect(() => {
    if (isAddingTask && newTaskInputRef.current) {
      newTaskInputRef.current.focus();
      setNewTodoText(''); // Clear any previous text
    }
  }, [isAddingTask]);

  // Effect to focus tag input when it expands
  useEffect(() => {
    if (expandedTagInputTodoId !== null && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [expandedTagInputTodoId]);

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

  const handleAddTagAndClose = (todoId: number) => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag !== '') {
      setTodos(prevTodos => prevTodos.map(t => (t.id === todoId && !t.tags.includes(trimmedTag)) ? {...t, tags: [...t.tags, trimmedTag]} : t));
    }
    setTagInput('');
    setExpandedTagInputTodoId(null);
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, todoId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTagAndClose(todoId);
    }
    if (e.key === 'Escape') {
      setExpandedTagInputTodoId(null);
      setTagInput('');
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

  const removeTag = (todoId: number, tagToRemove: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === todoId
          ? { ...todo, tags: todo.tags.filter(tag => tag !== tagToRemove) }
          : todo
      )
    );
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
                {expandedTagInputTodoId === todo.id ? (
                  <div className="tag-input-expanded-wrapper">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagInput} // Controlled input
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => handleTagInputKeyPress(e, todo.id)}
                      placeholder="Add tag..."
                      className="tag-input expanded"
                    />
                    <button onClick={() => handleAddTagAndClose(todo.id)} className="tag-input-action-button confirm-tag-button"><CheckIcon /></button>
                    <button onClick={() => { setExpandedTagInputTodoId(null); setTagInput(''); }} className="tag-input-action-button cancel-tag-button"><XMarkIcon /></button>
                  </div>
                ) : (
                  <button 
                    className="tag-input-icon-button"
                    onClick={() => {
                        setExpandedTagInputTodoId(todo.id);
                        setTagInput(''); // Clear previous tag input text
                    }}
                    aria-label="Add tag"
                  >
                    <BookmarkIcon />
                  </button>
                )}
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