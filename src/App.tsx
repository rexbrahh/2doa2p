import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import TodoList from './TodoList.tsx'; // Corrected import path
import Sidebar from './Sidebar.tsx';    // Corrected import path
import QuickFindModal from './QuickFindModal.tsx'; // Import the new modal
import { Folder } from './types/folder.ts';
import { Todo } from './types/todo.ts'; // IMPORT Todo type
import { folderStorage } from './services/folderStorage.ts'; // Corrected import path
import { todoStorage } from './services/todoStorage.ts';
import { PlusIcon, XMarkIcon, FolderPlusIcon, MagnifyingGlassIcon as SearchIconForFab } from '@heroicons/react/24/solid';

const ABSOLUTE_MIN_SIDEBAR_WIDTH = 180; // Renamed and can be adjusted
const DEFAULT_SIDEBAR_WIDTH = 260;
const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebarWidth';

// Constants for FAB magnetic effect
const FAB_PROXIMITY_RADIUS = 100; 
const FAB_MAX_OFFSET = 12; 
const FAB_PULL_FACTOR = 0.1;

// NEW Constants for FAB Action Items magnetic effect
const ACTION_ITEM_PROXIMITY_RADIUS = 60;
const ACTION_ITEM_MAX_OFFSET = 5;
const ACTION_ITEM_PULL_FACTOR = 0.08;

// Constants for the X button can be same as FAB_ or new if desired
const TOGGLE_ICON_PROXIMITY_RADIUS = 70;
const TOGGLE_ICON_MAX_OFFSET = 8;
const TOGGLE_ICON_PULL_FACTOR = 0.1;

// Placeholder component for mobile view - can be moved to its own file later
const MobilePlaceholder: React.FC = () => {
  return (
    <div className="mobile-placeholder-container">
      <h2>Mobile Version UI Under Construction</h2>
      <p>Please use the desktop version for now</p>
    </div>
  );
};

const MOBILE_BREAKPOINT = 768; // pixels

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

  const fabContainerRef = useRef<HTMLDivElement>(null); // RENAMED fabRef for clarity, now targets the container
  const [isFabContainerMagneticActive, setIsFabContainerMagneticActive] = useState(false); // Renamed for clarity
  const fabContainerAnimationRef = useRef<number | null>(null); // Renamed for clarity

  // NEW State and Refs for Action Items Magnetic Effect
  const actionItemRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const [magneticallyActiveActionItemId, setMagneticallyActiveActionItemId] = useState<string | null>(null);
  const actionItemAnimationRef = useRef<number | null>(null);

  // FAB Toggle Icon (the X button when menu is open)
  const fabToggleIconRef = useRef<HTMLDivElement>(null);
  const [isToggleIconMagneticActive, setIsToggleIconMagneticActive] = useState(false);
  const toggleIconAnimationRef = useRef<number | null>(null);

  const [isMobileView, setIsMobileView] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false); // New state for FAB menu

  const [isQuickFindOpen, setIsQuickFindOpen] = useState(false); // State for Quick Find Modal

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
    setIsFabMenuOpen(false); // Close FAB menu on folder select
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
    setIsFabMenuOpen(false); // Close menu after action
  };

  const getMaxSidebarWidth = useCallback(() => {
    return appRef.current ? appRef.current.offsetWidth / 3 : DEFAULT_SIDEBAR_WIDTH * 1.5;
  }, []);

  const getDynamicMinSidebarWidth = useCallback(() => {
    return appRef.current ? appRef.current.offsetWidth / 9 : ABSOLUTE_MIN_SIDEBAR_WIDTH;
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

        setIsMobileView(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    // Call once initially to set correct size based on current window dimensions
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarWidth, getMaxSidebarWidth, getDynamicMinSidebarWidth]); // Added dependencies

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

  // FAB Magnetic Effect Handlers (should be correct)
  const handleFabContainerMouseEnter = useCallback(() => { 
    setIsFabContainerMagneticActive(false);
    if (fabContainerRef.current) {
      fabContainerRef.current.style.transform = 'translate(0px, 0px)'; // Reset, CSS hover handles scale
    }
  }, []);
  const handleFabContainerMouseLeave = useCallback(() => { 
    setIsFabContainerMagneticActive(true);
    // Don't reset scale here, mousemove will handle it or CSS if mouse far away
  }, []);

  // RE-IMPLEMENTING FULL useEffect for FAB Container Magnetic Effect
  useEffect(() => {
    if (isFabMenuOpen) { // If menu is open, this effect should not run / should clean up
      if (fabContainerRef.current && fabContainerRef.current.style.transform !== 'translate(0px, 0px)') {
        fabContainerRef.current.style.transform = 'translate(0px, 0px)'; // Reset if it was moving
      }
      return; // Don't attach listeners if menu is open
    }
    const fabElement = fabContainerRef.current;
    const capturedFabRefCurrent = fabContainerRef.current; 
    const capturedFabAnimationRef = fabContainerAnimationRef; 

    if (!fabElement) return;

    const handleFabContainerMouseMove = (event: MouseEvent) => { // Specific handler name
      if (!isFabContainerMagneticActive || !capturedFabRefCurrent) { 
        // If not magnetic or ref is lost, ensure transform is reset (respecting CSS hover scale)
        if (capturedFabRefCurrent) {
            // No easy way to check CSS hover from JS reliably for scale reset here,
            // so just reset to no translate. CSS :hover will apply scale if mouse is over.
            capturedFabRefCurrent.style.transform = 'translate(0px, 0px)'; 
        }
        return;
      }

      if (capturedFabAnimationRef.current) {
        cancelAnimationFrame(capturedFabAnimationRef.current);
      }

      capturedFabAnimationRef.current = requestAnimationFrame(() => {
        if (!capturedFabRefCurrent) return; 
        const rect = capturedFabRefCurrent.getBoundingClientRect();
        const fabCenterX = rect.left + rect.width / 2;
        const fabCenterY = rect.top + rect.height / 2;
        const mouseX = event.clientX, mouseY = event.clientY;

        const isMouseOverFab = 
          mouseX >= rect.left && mouseX <= rect.right && 
          mouseY >= rect.top && mouseY <= rect.bottom;

        if (isMouseOverFab) { 
          // Mouse has re-entered the FAB. Defer to handleFabContainerMouseEnter.
          // Call it directly to ensure state and transform are correctly set.
          handleFabContainerMouseEnter(); 
          return; 
        }
        
        const dxToEdge = Math.max(0, rect.left - mouseX, mouseX - rect.right);
        const dyToEdge = Math.max(0, rect.top - mouseY, mouseY - rect.bottom);
        const distanceFromEdge = Math.sqrt(dxToEdge * dxToEdge + dyToEdge * dyToEdge);

        if (distanceFromEdge < FAB_PROXIMITY_RADIUS) {
          const deltaX = mouseX - fabCenterX, deltaY = mouseY - fabCenterY;
          const distanceToCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          if (distanceToCenter === 0) return;

          const normX = deltaX / distanceToCenter, normY = deltaY / distanceToCenter;
          const intensity = (FAB_PROXIMITY_RADIUS - distanceFromEdge) / FAB_PROXIMITY_RADIUS;
          let rawOffsetX = normX * FAB_MAX_OFFSET * intensity * FAB_PULL_FACTOR * 25; // Using the multiplier we found dramatic
          let rawOffsetY = normY * FAB_MAX_OFFSET * intensity * FAB_PULL_FACTOR * 25;
          
          const currentMagnitude = Math.sqrt(rawOffsetX*rawOffsetX + rawOffsetY*rawOffsetY);
          let finalOffsetX = rawOffsetX, finalOffsetY = rawOffsetY;
          if (currentMagnitude > FAB_MAX_OFFSET) { 
            const sf = FAB_MAX_OFFSET / currentMagnitude; 
            finalOffsetX = rawOffsetX*sf; 
            finalOffsetY = rawOffsetY*sf; 
          }
          
          capturedFabRefCurrent.style.transform = `translate(${finalOffsetX}px, ${finalOffsetY}px)`;
        } else { 
          // Mouse is far away, reset transform (CSS hover for scale will apply if mouse is still technically over)
          capturedFabRefCurrent.style.transform = 'translate(0px, 0px)';
        }
      });
    };
    
    fabElement.addEventListener('mouseenter', handleFabContainerMouseEnter);
    fabElement.addEventListener('mouseleave', handleFabContainerMouseLeave);
    document.addEventListener('mousemove', handleFabContainerMouseMove); 

    return () => { 
      fabElement.removeEventListener('mouseenter', handleFabContainerMouseEnter); 
      fabElement.removeEventListener('mouseleave', handleFabContainerMouseLeave); 
      document.removeEventListener('mousemove', handleFabContainerMouseMove); 
      if (capturedFabAnimationRef.current) { 
        cancelAnimationFrame(capturedFabAnimationRef.current); 
      }
      if (capturedFabRefCurrent) {
        capturedFabRefCurrent.style.transform = 'translate(0px, 0px)'; // Ensure reset on cleanup
      }
    };
  }, [isFabMenuOpen, isFabContainerMagneticActive, handleFabContainerMouseEnter, handleFabContainerMouseLeave]); // Added isFabMenuOpen

  // FAB Toggle Icon (X button) Magnetic Effect (Only when menu is OPEN)
  const handleToggleIconMouseEnter = useCallback(() => {
    setIsToggleIconMagneticActive(false);
    if (fabToggleIconRef.current) fabToggleIconRef.current.style.transform = 'translate(0px, 0px)';
  }, []);
  const handleToggleIconMouseLeave = useCallback(() => {
    setIsToggleIconMagneticActive(true);
  }, []);

  useEffect(() => {
    if (!isFabMenuOpen) { // Only run this effect if menu is open
      if (fabToggleIconRef.current && fabToggleIconRef.current.style.transform !== 'translate(0px, 0px)') {
        fabToggleIconRef.current.style.transform = 'translate(0px, 0px)'; // Reset if it was moving
      }
      return; // Don't attach listeners if menu is closed or effect not active
    }

    const toggleIconEl = fabToggleIconRef.current;
    const capturedToggleIconRef = fabToggleIconRef.current; // For use in rAF and cleanup
    const capturedToggleAnimRef = toggleIconAnimationRef; // For use in rAF and cleanup

    if (!toggleIconEl) return;
    
    const handleToggleIconMouseMove = (event: MouseEvent) => { 
      if(!isToggleIconMagneticActive || !capturedToggleIconRef){ // Check active state and captured ref
        if(capturedToggleIconRef && capturedToggleIconRef.style.transform !== 'translate(0px,0px)') { 
            capturedToggleIconRef.style.transform = 'translate(0px,0px)'; 
        }
        return;
      }

      if(capturedToggleAnimRef.current) cancelAnimationFrame(capturedToggleAnimRef.current);

      capturedToggleAnimRef.current = requestAnimationFrame(() => { 
        if(!capturedToggleIconRef) return; 
        
        const r = capturedToggleIconRef.getBoundingClientRect(); 
        const cX = r.left + r.width/2;
        const cY = r.top + r.height/2; 
        const mouseX = event.clientX; // Corrected declaration
        const mouseY = event.clientY; // Corrected declaration
        
        const isMouseOverToggleIcon = mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom; 
        if(isMouseOverToggleIcon){ 
          handleToggleIconMouseEnter(); // Call handler to deactivate and reset transform
          return; 
        } 
        
        const dxToEdge = Math.max(0, r.left - mouseX, mouseX - r.right); // Used mouseX
        const dyToEdge = Math.max(0, r.top - mouseY, mouseY - r.bottom); // Used mouseY
        const distanceFromEdge = Math.sqrt(dxToEdge*dxToEdge + dyToEdge*dyToEdge); 
        
        if(distanceFromEdge < TOGGLE_ICON_PROXIMITY_RADIUS){
          const deltaX = mouseX - cX; // Used mouseX, cX
          const deltaY = mouseY - cY; // Used mouseY, cY
          const distanceToCenter = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
          if(distanceToCenter === 0) return;
          
          const normX = deltaX/distanceToCenter;
          const normY = deltaY/distanceToCenter;
          const intensity = (TOGGLE_ICON_PROXIMITY_RADIUS - distanceFromEdge) / TOGGLE_ICON_PROXIMITY_RADIUS;
          
          let rawOffsetX = normX * TOGGLE_ICON_MAX_OFFSET * intensity * TOGGLE_ICON_PULL_FACTOR * 18;
          let rawOffsetY = normY * TOGGLE_ICON_MAX_OFFSET * intensity * TOGGLE_ICON_PULL_FACTOR * 18;
          const currentMagnitude = Math.sqrt(rawOffsetX*rawOffsetX + rawOffsetY*rawOffsetY);
          let finalOffsetX = rawOffsetX;
          let finalOffsetY = rawOffsetY;

          if(currentMagnitude > TOGGLE_ICON_MAX_OFFSET){
            const scaleFactor = TOGGLE_ICON_MAX_OFFSET / currentMagnitude; // Corrected: consts to const scaleFactor
            finalOffsetX = rawOffsetX * scaleFactor; // Corrected: s to scaleFactor
            finalOffsetY = rawOffsetY * scaleFactor; // Corrected: s to scaleFactor
          } 
          capturedToggleIconRef.style.transform = `translate(${finalOffsetX}px,${finalOffsetY}px)`;
        } else {
          if (capturedToggleIconRef.style.transform !== 'translate(0px,0px)'){
            capturedToggleIconRef.style.transform = 'translate(0px,0px)';
          }
        }
      });
    }; 

    toggleIconEl.addEventListener('mouseenter', handleToggleIconMouseEnter);
    toggleIconEl.addEventListener('mouseleave', handleToggleIconMouseLeave);
    document.addEventListener('mousemove', handleToggleIconMouseMove); 

    return () => {
      toggleIconEl.removeEventListener('mouseenter', handleToggleIconMouseEnter);
      toggleIconEl.removeEventListener('mouseleave', handleToggleIconMouseLeave);
      document.removeEventListener('mousemove', handleToggleIconMouseMove);
      if(capturedToggleAnimRef.current) cancelAnimationFrame(capturedToggleAnimRef.current);
      if(capturedToggleIconRef && capturedToggleIconRef.style.transform !== 'translate(0px,0px)') {
        capturedToggleIconRef.style.transform = 'translate(0px,0px)';
      }
    }; 
  }, [isFabMenuOpen, isToggleIconMagneticActive, handleToggleIconMouseEnter, handleToggleIconMouseLeave]);

  // NEW Handlers for Action Item Magnetic Effect
  const handleActionItemMouseEnter = useCallback((itemId: string) => {
    if (magneticallyActiveActionItemId === itemId) {
      setMagneticallyActiveActionItemId(null); // Deactivate if mouse re-enters
    }
    // Reset transform applied by JS; CSS transform for fanned out position should take over
    const itemEl = actionItemRefs.current.get(itemId);
    if (itemEl) {
      itemEl.style.transform = ''; // Let CSS handle its base fanned-out position
    }
  }, [magneticallyActiveActionItemId]);

  const handleActionItemMouseLeave = useCallback((itemId: string) => {
    setMagneticallyActiveActionItemId(itemId);
  }, []);

  // useEffect for Action Items Magnetic MouseMove
  useEffect(() => {
    if (!isFabMenuOpen) { // Only run if menu is open
        actionItemRefs.current.forEach(itemEl => { if (itemEl && itemEl.style.transform !== '') itemEl.style.transform = ''; });
        if(magneticallyActiveActionItemId) setMagneticallyActiveActionItemId(null); // Clear active item if menu closes
        return () => {};
    }
    const capturedActionItemRefs = actionItemRefs.current; // Capture for use in cleanup & handlers
    const capturedAnimationRef = actionItemAnimationRef; // Capture for use in cleanup & handlers

    if (magneticallyActiveActionItemId === null) {
        // Ensure any lingering JS transform is cleared if no item is active
        // This might be redundant if handleActionItemMouseEnter clears it, but good for safety.
        capturedActionItemRefs.forEach(itemEl => {
            if (itemEl && itemEl.style.transform !== '') {
                itemEl.style.transform = ''; // Reset to let CSS take over
            }
        });
        return () => {}; // No listener needed if no item is active
    }

    const activeItemId = magneticallyActiveActionItemId;
    // console.log(`Action Item Magnetic Effect: Active for ${activeItemId}`);

    const handleActionItemMouseMove = (event: MouseEvent) => {
      const itemEl = capturedActionItemRefs.get(activeItemId);
      if (!itemEl) {
        // If ref is lost, or item unmounted while magnetically active (should be rare)
        // The main state `magneticallyActiveActionItemId` changing would trigger effect cleanup.
        return;
      }

      if (capturedAnimationRef.current) {
        cancelAnimationFrame(capturedAnimationRef.current);
      }

      capturedAnimationRef.current = requestAnimationFrame(() => {
        const currentItemEl = capturedActionItemRefs.get(activeItemId); // Re-get in case of changes
        if (!currentItemEl) return;

        const rect = currentItemEl.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const itemCenterY = rect.top + rect.height / 2;
        const mouseX = event.clientX, mouseY = event.clientY;

        // Check if mouse is directly over this specific action item
        const isMouseOverItem =
          mouseX >= rect.left && mouseX <= rect.right &&
          mouseY >= rect.top && mouseY <= rect.bottom;

        if (isMouseOverItem) {
          // Mouse has re-entered the item. Defer to handleActionItemMouseEnter to clear active state and JS transform.
          // Calling it directly might cause issues if state update isn't immediate.
          // For now, just stop applying JS transform if mouse is back on it.
          if (currentItemEl.style.transform !== '') {
            currentItemEl.style.transform = ''; // Let CSS take over
          }
          // Potentially call handleActionItemMouseEnter(activeItemId) if direct deactivation is needed here
          return;
        }

        const dxToEdge = Math.max(0, rect.left - mouseX, mouseX - rect.right);
        const dyToEdge = Math.max(0, rect.top - mouseY, mouseY - rect.bottom);
        const distanceFromEdge = Math.sqrt(dxToEdge*dxToEdge + dyToEdge*dyToEdge);

        if (distanceFromEdge < ACTION_ITEM_PROXIMITY_RADIUS) {
          const deltaX = mouseX - itemCenterX, deltaY = mouseY - itemCenterY;
          const distanceToCenter = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
          if (distanceToCenter === 0) return;

          const normX = deltaX/distanceToCenter, normY = deltaY/distanceToCenter;
          const intensity = (ACTION_ITEM_PROXIMITY_RADIUS - distanceFromEdge) / ACTION_ITEM_PROXIMITY_RADIUS;
          
          let rawOffsetX = normX * ACTION_ITEM_MAX_OFFSET * intensity * ACTION_ITEM_PULL_FACTOR * 15; // Adjusted multiplier
          let rawOffsetY = normY * ACTION_ITEM_MAX_OFFSET * intensity * ACTION_ITEM_PULL_FACTOR * 15;
          
          const currentMagnitude = Math.sqrt(rawOffsetX*rawOffsetX + rawOffsetY*rawOffsetY);
          let finalOffsetX = rawOffsetX, finalOffsetY = rawOffsetY;
          if (currentMagnitude > ACTION_ITEM_MAX_OFFSET) { 
            const sf = ACTION_ITEM_MAX_OFFSET / currentMagnitude; 
            finalOffsetX = rawOffsetX*sf; 
            finalOffsetY = rawOffsetY*sf; 
          }
          
          currentItemEl.style.transform = `translate(${finalOffsetX}px, ${finalOffsetY}px)`;
        } else {
          if (currentItemEl.style.transform !== '') {
            currentItemEl.style.transform = ''; // Reset to let CSS take over
          }
        }
      });
    };

    document.addEventListener('mousemove', handleActionItemMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleActionItemMouseMove);
      if (capturedAnimationRef.current) {
        cancelAnimationFrame(capturedAnimationRef.current);
      }
      // On cleanup, ensure the specific item's JS transform is cleared
      const itemEl = capturedActionItemRefs.get(activeItemId); 
      if (itemEl && itemEl.style.transform !== '') {
        itemEl.style.transform = '';
      }
    };
  }, [isFabMenuOpen, magneticallyActiveActionItemId, handleActionItemMouseEnter]); // Added handleActionItemMouseEnter to deps

  const selectedFolderObject = folders.find(f => f.id === selectedFolderId);

  const toggleFabMenu = () => {
    setIsFabMenuOpen(prevIsOpen => {
      const newIsOpen = !prevIsOpen;
      if (!newIsOpen) { // If menu is NOW closing
        if (isAddingTask) {
            setIsAddingTask(false); // Close add task input if open
        }
        // Reset all magnetic effect states
        setIsFabContainerMagneticActive(false);
        if (fabContainerRef.current) fabContainerRef.current.style.transform = 'translate(0px, 0px)';
        setIsToggleIconMagneticActive(false);
        if (fabToggleIconRef.current) fabToggleIconRef.current.style.transform = 'translate(0px, 0px)';
        setMagneticallyActiveActionItemId(null); 
        actionItemRefs.current.forEach(itemEl => {
            if (itemEl && itemEl.style.transform !== '') itemEl.style.transform = '';
        });
      }
      return newIsOpen;
    });
  };

  const triggerAddTaskMode = () => {
    setIsAddingTask(true);
    setIsFabMenuOpen(false); // Ensure menu closes
  };
  
  const handleAddNewListFromFab = () => { // Renamed to avoid conflict if another handleAddNewList exists
    handleAddNewList(); // Calls the existing App-level folder add logic
    setIsFabMenuOpen(false); // Ensure menu closes
  };

  const triggerQuickFindFromFab = () => { // Renamed
    triggerQuickFind(); // Calls the existing App-level quick find logic
    setIsFabMenuOpen(false); // Ensure menu closes
  };

  const triggerQuickFind = () => {
    setIsQuickFindOpen(true);
    setIsFabMenuOpen(false); // Close FAB menu
  };

  const handleNavigateFromQuickFind = (folderId: string, todoId?: number) => {
    setSelectedFolderId(folderId);
    // Later: if todoId, potentially scroll/highlight that todo in TodoList
    console.log(`Navigating to folder: ${folderId}` + (todoId ? ` and todo: ${todoId}` : ''));
    setIsQuickFindOpen(false);
    setGlobalSearchTerm(''); // Clear global search after navigation
  };

  if (error && folders.length === 0 && !isTodosLoaded.current) { return <div className="app-error">Error initializing. Please refresh.</div>; }

  if (isMobileView) {
    return <MobilePlaceholder />;
  }

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
      <main className="main-content" /* onClick={() => { if(isFabMenuOpen) setIsFabMenuOpen(false); }} REMOVED FOR NOW */ >
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
      <div 
        ref={fabContainerRef} 
        className={`fab-menu-container ${isFabMenuOpen ? 'fab-menu-open' : ''}`}
        onClick={(e) => { // Click on container: if open, it's a backdrop click to close.
          if (isFabMenuOpen && e.target === e.currentTarget) {
            toggleFabMenu();
          }
          // If closed, click is handled by fab-toggle-icon to open.
        }}
        onMouseEnter={handleFabContainerMouseEnter} 
        onMouseLeave={handleFabContainerMouseLeave} 
        aria-expanded={isFabMenuOpen}
      >
        {isFabMenuOpen && (
            <>
                <button 
                    className="fab-action-item fab-quick-find" 
                    ref={el => { if (el) actionItemRefs.current.set('quick-find', el); else actionItemRefs.current.delete('quick-find'); }}
                    onMouseEnter={() => handleActionItemMouseEnter('quick-find')}
                    onMouseLeave={() => handleActionItemMouseLeave('quick-find')}
                    onClick={(e)=>{e.stopPropagation(); triggerQuickFindFromFab();}} 
                    aria-label="Quick Find"
                >
                    <SearchIconForFab />
                </button>
                <button 
                    className="fab-action-item fab-add-folder" 
                    ref={el => { if (el) actionItemRefs.current.set('add-folder', el); else actionItemRefs.current.delete('add-folder'); }}
                    onMouseEnter={() => handleActionItemMouseEnter('add-folder')}
                    onMouseLeave={() => handleActionItemMouseLeave('add-folder')}
                    onClick={(e)=>{e.stopPropagation(); handleAddNewListFromFab();}} 
                    aria-label="Add Folder"
                >
                    <FolderPlusIcon />
                </button>
                <button 
                    className="fab-action-item fab-add-tasks-actual" 
                    ref={el => { if (el) actionItemRefs.current.set('add-task', el); else actionItemRefs.current.delete('add-task'); }}
                    onMouseEnter={() => handleActionItemMouseEnter('add-task')}
                    onMouseLeave={() => handleActionItemMouseLeave('add-task')}
                    onClick={(e)=>{e.stopPropagation(); triggerAddTaskMode();}} 
                    aria-label="Add Task"
                >
                    <PlusIcon /> 
                </button>
            </>
        )}
        {/* Main FAB icon - this is the primary toggle button */}
        <div 
            ref={fabToggleIconRef} 
            className="fab-toggle-icon" 
            onClick={(e) => { 
                e.stopPropagation(); // IMPORTANT: Prevent click from reaching container when this is clicked
                toggleFabMenu(); 
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFabMenu(); } }}
            aria-label={isFabMenuOpen ? "Close menu" : "Open actions menu"}
        >
            {isFabMenuOpen ? <XMarkIcon /> : <PlusIcon />}
        </div>
      </div>

      <QuickFindModal 
        isOpen={isQuickFindOpen}
        onClose={() => setIsQuickFindOpen(false)}
        folders={folders}
        allTodos={todos} // Pass all todos for comprehensive search later
        onNavigate={handleNavigateFromQuickFind}
      />
    </div>
  );
};

export default App; 