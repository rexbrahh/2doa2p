import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import TodoList from './TodoList.tsx'; // Corrected import path
import Sidebar from './Sidebar.tsx';    // Corrected import path
import { Folder } from './types/folder.ts';
import { Todo } from './types/todo.ts'; // IMPORT Todo type
import { folderStorage } from './services/folderStorage.ts'; // Corrected import path
import { todoStorage } from './services/todoStorage.ts';
import { PlusIcon } from '@heroicons/react/24/solid';

const ABSOLUTE_MIN_SIDEBAR_WIDTH = 180; // Renamed and can be adjusted
const DEFAULT_SIDEBAR_WIDTH = 260;
const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebarWidth';

// Constants for FAB magnetic effect
const FAB_PROXIMITY_RADIUS = 100; 
const FAB_MAX_OFFSET = 12; 
const FAB_PULL_FACTOR = 0.1;

const App: React.FC = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('inbox'); // Default to inbox
  const [folders, setFolders] = useState<Folder[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const storedWidth = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    return storedWidth ? parseInt(storedWidth, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const appRef = useRef<HTMLDivElement>(null); // Ref for the main App container to get total width
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  
  const [isAddingTask, setIsAddingTask] = useState(false); // New state for add task mode
  const [todos, setTodos] = useState<Todo[]>([]); // Lift todos state to App for easier refresh
  const isTodosLoaded = useRef(false); // To prevent multiple loads initially

  // FAB Magnetic Effect State and Ref
  const fabRef = useRef<HTMLButtonElement>(null);
  const [isFabMagneticActive, setIsFabMagneticActive] = useState(false);
  const fabAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isTodosLoaded.current) {
        try {
            const storedTodos = todoStorage.getTodos();
            setTodos(storedTodos);
            isTodosLoaded.current = true;
        } catch (err) {
            setError('Failed to load initial todos');
            console.error('Error loading initial todos:', err);
        }
    }
  }, []);

  useEffect(() => {
    if (isTodosLoaded.current) { // Only save after initial load
        todoStorage.saveTodos(todos);
    }
  }, [todos]);

  useEffect(() => {
    try {
      const loadedFolders = folderStorage.getFolders();
      setFolders(loadedFolders);
    } catch (err) {
      console.error('Failed to load folders for App:', err);
      setError('Could not load folder data.');
      // Initialize with empty array or minimal defaults if crucial
      setFolders([{id: 'inbox', name: 'Inbox'}]); 
    }
  }, []);

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setGlobalSearchTerm('');
    setIsAddingTask(false); // Cancel add mode when changing folder
  };

  const handleAddNewList = () => {
    const newListName = prompt('Enter new list name:');
    if (newListName && newListName.trim() !== '') {
      try {
        const updatedFolders = folderStorage.addFolder({ name: newListName.trim() });
        setFolders(updatedFolders);
        const newFolder = updatedFolders.find(f => f.name === newListName.trim());
        if (newFolder) setSelectedFolderId(newFolder.id);
      } catch (err) {
        console.error('Error adding new list:', err);
        setError('Failed to add new list.');
      }
    }
  };

  const getMaxSidebarWidth = useCallback(() => {
    return appRef.current ? appRef.current.offsetWidth / 3 : DEFAULT_SIDEBAR_WIDTH * 1.5;
  }, []);

  const getDynamicMinSidebarWidth = useCallback(() => {
    return appRef.current ? appRef.current.offsetWidth / 8 : ABSOLUTE_MIN_SIDEBAR_WIDTH;
  }, []);

  const handleMouseDownOnResizer = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !appRef.current) return;
    
    const appLeftBoundary = appRef.current.getBoundingClientRect().left;
    let newWidth = e.clientX - appLeftBoundary; // Calculate width relative to the app container

    const dynamicMinWidth = getDynamicMinSidebarWidth();
    const effectiveMinWidth = Math.max(ABSOLUTE_MIN_SIDEBAR_WIDTH, dynamicMinWidth);
    const maxAllowedWidth = getMaxSidebarWidth();

    if (newWidth < effectiveMinWidth) {
      newWidth = effectiveMinWidth;
    } else if (newWidth > maxAllowedWidth) {
      newWidth = maxAllowedWidth;
    }
    setSidebarWidth(newWidth);
  }, [isResizing, getMaxSidebarWidth, getDynamicMinSidebarWidth]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, sidebarWidth.toString());
    }
  }, [isResizing, sidebarWidth]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  // Adjust max width on window resize
  useEffect(() => {
    const handleResize = () => {
        if (!appRef.current) return;
        const dynamicMinWidth = getDynamicMinSidebarWidth();
        const effectiveMinWidth = Math.max(ABSOLUTE_MIN_SIDEBAR_WIDTH, dynamicMinWidth);
        const maxAllowedWidth = getMaxSidebarWidth();

        let currentStoredWidth = sidebarWidth; 
        let newConstrainedWidth = currentStoredWidth;

        if (currentStoredWidth < effectiveMinWidth) {
            newConstrainedWidth = effectiveMinWidth;
        } else if (currentStoredWidth > maxAllowedWidth) {
            newConstrainedWidth = maxAllowedWidth;
        }

        if (newConstrainedWidth !== currentStoredWidth) {
            setSidebarWidth(newConstrainedWidth);
            localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, newConstrainedWidth.toString());
        }
    };
    window.addEventListener('resize', handleResize);
    // Call once initially to set correct size based on current window dimensions
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarWidth, getMaxSidebarWidth, getDynamicMinSidebarWidth]); // Added dependencies

  const handleFabClick = () => {
    setIsAddingTask(true);
  };

  const handleConfirmAddTask = (taskText: string) => {
    if (!selectedFolderId) {
        console.error("No folder selected to add task to.");
        setError("Please select a folder first."); // Show error to user
        setIsAddingTask(false);
        return;
    }
    const trimmedText = taskText.trim();
    if (trimmedText === '') {
        setIsAddingTask(false); // Or show validation in the input component
        return;
    }
    const newTodo = todoStorage.addTodo({ text: trimmedText, folderId: selectedFolderId });
    setTodos(prevTodos => [...prevTodos, newTodo]); // Update global todos state
    setIsAddingTask(false);
  };

  const handleCancelAddTask = () => {
    setIsAddingTask(false);
  };

  // FAB Magnetic Effect Handlers
  const handleFabMouseEnter = useCallback(() => {
    setIsFabMagneticActive(false);
    if (fabRef.current) {
      fabRef.current.style.transform = 'translate(0px, 0px) scale(1.05)'; // Keep hover scale
    }
  }, []);

  const handleFabMouseLeave = useCallback(() => {
    setIsFabMagneticActive(true);
    if (fabRef.current) {
      fabRef.current.style.transform = 'translate(0px, 0px) scale(1)'; // Reset scale if not hovered
    }
  }, []);

  // FAB Magnetic Effect useEffect
  useEffect(() => {
    const fabElement = fabRef.current;
    const capturedFabRefCurrent = fabRef.current; 
    const capturedFabAnimationRef = fabAnimationRef; 
    if (!fabElement) return;

    const handleFabMouseMove = (event: MouseEvent) => {
      if (!isFabMagneticActive || !capturedFabRefCurrent) { 
        if (capturedFabRefCurrent && !capturedFabRefCurrent.matches(':hover')) capturedFabRefCurrent.style.transform = 'translate(0px, 0px) scale(1)';
        else if (capturedFabRefCurrent && capturedFabRefCurrent.matches(':hover')) capturedFabRefCurrent.style.transform = 'translate(0px, 0px) scale(1.05)';
        return;
      }

      if (capturedFabAnimationRef.current) cancelAnimationFrame(capturedFabAnimationRef.current);

      capturedFabAnimationRef.current = requestAnimationFrame(() => {
        if (!capturedFabRefCurrent) return; 
        const rect = capturedFabRefCurrent.getBoundingClientRect();
        const fabCenterX = rect.left + rect.width / 2;
        const fabCenterY = rect.top + rect.height / 2;
        const mouseX = event.clientX, mouseY = event.clientY;
        const isMouseOverFab = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
        if (isMouseOverFab) { handleFabMouseEnter(); return; }
        
        const dxToEdge = Math.max(0, rect.left - mouseX, mouseX - rect.right);
        const dyToEdge = Math.max(0, rect.top - mouseY, mouseY - rect.bottom);
        const distanceFromEdge = Math.sqrt(dxToEdge * dxToEdge + dyToEdge * dyToEdge);

        if (distanceFromEdge < FAB_PROXIMITY_RADIUS) {
          const deltaX = mouseX - fabCenterX, deltaY = mouseY - fabCenterY;
          const distanceToCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          if (distanceToCenter === 0) return;

          const normX = deltaX / distanceToCenter, normY = deltaY / distanceToCenter;
          const intensity = (FAB_PROXIMITY_RADIUS - distanceFromEdge) / FAB_PROXIMITY_RADIUS;
          
          let rawOffsetX = normX * FAB_MAX_OFFSET * intensity * FAB_PULL_FACTOR * 25; 
          let rawOffsetY = normY * FAB_MAX_OFFSET * intensity * FAB_PULL_FACTOR * 25;
          
          const currentMagnitude = Math.sqrt(rawOffsetX*rawOffsetX + rawOffsetY*rawOffsetY);
          let finalOffsetX = rawOffsetX, finalOffsetY = rawOffsetY;
          if (currentMagnitude > FAB_MAX_OFFSET) { const sf = FAB_MAX_OFFSET / currentMagnitude; finalOffsetX = rawOffsetX*sf; finalOffsetY = rawOffsetY*sf; }
          
          capturedFabRefCurrent.style.transform = `translate(${finalOffsetX}px, ${finalOffsetY}px) scale(1)`;
        } else {
          if (!capturedFabRefCurrent.matches(':hover')) capturedFabRefCurrent.style.transform = 'translate(0px, 0px) scale(1)';
          else capturedFabRefCurrent.style.transform = 'translate(0px, 0px) scale(1.05)';
        }
      });
    };
    
    fabElement.addEventListener('mouseenter', handleFabMouseEnter);
    fabElement.addEventListener('mouseleave', handleFabMouseLeave);
    document.addEventListener('mousemove', handleFabMouseMove);

    return () => {
      fabElement.removeEventListener('mouseenter', handleFabMouseEnter);
      fabElement.removeEventListener('mouseleave', handleFabMouseLeave);
      document.removeEventListener('mousemove', handleFabMouseMove);
      if (capturedFabAnimationRef.current) { cancelAnimationFrame(capturedFabAnimationRef.current); }
      if (capturedFabRefCurrent) {
        if (!capturedFabRefCurrent.matches(':hover')) capturedFabRefCurrent.style.transform = 'translate(0px, 0px) scale(1)';
        else capturedFabRefCurrent.style.transform = 'translate(0px, 0px) scale(1.05)';
      }
    };
  }, [isFabMagneticActive, handleFabMouseEnter, handleFabMouseLeave]);

  const selectedFolderObject = folders.find(f => f.id === selectedFolderId);

  if (error && folders.length === 0 && !isTodosLoaded.current) { return <div className="app-error">Error initializing. Please refresh.</div>; }

  return (
    <div className="App" ref={appRef}>
      <Sidebar 
        folders={folders} // Pass all folders to Sidebar
        selectedFolderId={selectedFolderId} 
        onSelectFolder={handleSelectFolder} 
        onAddNewList={handleAddNewList} 
        width={sidebarWidth}
        searchTerm={globalSearchTerm}
        onSearchTermChange={setGlobalSearchTerm}
      />
      <div 
        className="resizer"
        onMouseDown={handleMouseDownOnResizer}
        role="separator"
        aria-label="Resize sidebar"
      />
      <main className="main-content">
        {selectedFolderObject ? (
          <TodoList 
            key={selectedFolderId} // Add key to force re-mount on folder change if needed for specific effects
            selectedFolder={selectedFolderObject} 
            globalSearchTerm={globalSearchTerm}
            allTodos={todos} // Pass all todos down
            setTodos={setTodos} // Pass setter down for direct manipulation if needed (e.g. toggleComplete)
            isAddingTask={isAddingTask} // Pass add mode state
            onConfirmAddTask={handleConfirmAddTask} // Pass confirm handler
            onCancelAddTask={handleCancelAddTask} // Pass cancel handler
          />
        ) : (
          <div className="no-folder-selected">Select or create a folder to see your todos.</div>
        )}
      </main>
      <button 
        ref={fabRef} // Attach ref to FAB
        className="fab-add-task"
        onClick={handleFabClick}
        aria-label="Add new task"
      >
        <PlusIcon />
      </button>
    </div>
  );
};

export default App; 