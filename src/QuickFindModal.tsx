import React, { useState, useEffect, useRef } from 'react';
import './QuickFindModal.css'; // We'll create this CSS file next
import { Folder } from '../types/folder';
import { Todo } from '../types/todo';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FolderIconRenderer } from './Sidebar.tsx'; // Import from Sidebar

interface QuickFindModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  allTodos: Todo[];
  onNavigate: (folderId: string, todoId?: number) => void;
}

const QuickFindModal: React.FC<QuickFindModalProps> = ({ 
  isOpen, 
  onClose, 
  folders, 
  allTodos, 
  onNavigate 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(''); // Clear search on open
      inputRef.current?.focus();
    } 
  }, [isOpen]);

  const lowerSearchTerm = searchTerm.toLowerCase();

  const filteredFolders = searchTerm
    ? folders.filter(f => f.name.toLowerCase().includes(lowerSearchTerm))
    : []; // Only show folders if there's a search term, or show recents later

  const filteredTodos = searchTerm
    ? allTodos.filter(t => 
        t.text.toLowerCase().includes(lowerSearchTerm) || 
        t.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
      )
    : []; // Only show todos if there's a search term

  if (!isOpen) {
    return null;
  }

  return (
    <div className="quick-find-modal-backdrop" onClick={onClose}>
      <div className="quick-find-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="quick-find-header">
          <MagnifyingGlassIcon className="quick-find-search-icon" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Quick Find: Folders, tasks, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="quick-find-input"
          />
          <button onClick={onClose} className="quick-find-close-button" aria-label="Close quick find">
            <XMarkIcon />
          </button>
        </div>
        <div className="quick-find-results">
          {searchTerm && filteredFolders.length === 0 && filteredTodos.length === 0 && (
            <p className="no-results">No results found for "{searchTerm}".</p>
          )}
          {!searchTerm && (
            <p className="no-results-init">Quickly switch lists, find to-dos, search for tags...</p>
          )}

          {filteredFolders.length > 0 && (
            <div className="results-section">
              <h4 className="results-header">Folders</h4>
              <ul>
                {filteredFolders.slice(0, 5).map(folder => (
                  <li key={`folder-${folder.id}`} onClick={() => { onNavigate(folder.id); onClose(); }}>
                    {folder.icon && <span className="result-icon"><FolderIconRenderer iconName={folder.icon} /></span>} 
                    {folder.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {filteredTodos.length > 0 && (
            <div className="results-section">
              <h4 className="results-header">Tasks</h4>
              <ul>
                {filteredTodos.slice(0, 10).map(todo => {
                    const parentFolder = folders.find(f => f.id === todo.folderId);
                    return (
                        <li key={`todo-${todo.id}`} onClick={() => { onNavigate(todo.folderId, todo.id); onClose(); }}>
                            {/* Could add a task-specific icon or use parent folder's icon scaled down */}
                            <span className="result-icon">
                                {parentFolder?.icon ? <FolderIconRenderer iconName={parentFolder.icon} /> : <span className="folder-icon-svg"></span>}
                            </span>
                            <span className="todo-result-text">{todo.text}</span>
                            {parentFolder && <span className="todo-result-folder-name">({parentFolder.name})</span>}
                        </li>
                    );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickFindModal; 