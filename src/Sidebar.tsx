import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Folder } from '../types/folder';
// import { folderStorage } from '../services/folderStorage'; // No longer needed here
import './Sidebar.css';
import {
  MagnifyingGlassIcon,
  InboxArrowDownIcon,
  StarIcon,
  CalendarDaysIcon,
  Squares2X2Icon, // For Anytime
  ArchiveBoxIcon, // For Someday
  ClipboardDocumentCheckIcon, // For Logbook
  HomeIcon, // For Life
  AcademicCapIcon, // For school
  BriefcaseIcon, // For work
  FolderIcon as DefaultFolderIcon, // Fallback icon
  TrashIcon, // Import TrashIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  folders: Folder[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onAddNewList: () => void;
  width: number; // New prop for dynamic width
  searchTerm: string; // New prop for controlled component
  onSearchTermChange: (term: string) => void; // New prop for callback
}

// Constants for folder magnetic effect
const FOLDER_PROXIMITY_RADIUS = 60; // Slightly smaller than input's
const FOLDER_MAX_OFFSET = 4;      // Subtle movement
const FOLDER_PULL_FACTOR = 0.08;   

// Slide effect constants
const DELETE_BUTTON_WIDTH = 75; // Approx width of the delete action panel in pixels
const SWIPE_THRESHOLD = DELETE_BUTTON_WIDTH / 2;

const PERMANENT_FOLDER_IDS = new Set([
  'inbox', 'today', 'upcoming', 'anytime', 'someday', 'logbook'
]);

// NEW Constants for Search Input magnetic effect
const SEARCH_PROXIMITY_RADIUS = 75;
const SEARCH_MAX_OFFSET = 6;
const SEARCH_PULL_FACTOR = 0.1;

// Icon mapping component/helper
export const FolderIconRenderer: React.FC<{ iconName?: string }> = ({ iconName }) => {
  const iconProps = { className: "folder-icon-svg" }; // Apply common class for sizing via CSS

  switch (iconName) {
    case 'InboxArrowDownIcon': return <InboxArrowDownIcon {...iconProps} />;
    case 'StarIcon': return <StarIcon {...iconProps} />;
    case 'CalendarDaysIcon': return <CalendarDaysIcon {...iconProps} />;
    case 'Squares2X2Icon': return <Squares2X2Icon {...iconProps} />;
    case 'ArchiveBoxIcon': return <ArchiveBoxIcon {...iconProps} />;
    case 'ClipboardDocumentCheckIcon': return <ClipboardDocumentCheckIcon {...iconProps} />;
    case 'HomeIcon': return <HomeIcon {...iconProps} />;
    case 'AcademicCapIcon': return <AcademicCapIcon {...iconProps} />;
    case 'BriefcaseIcon': return <BriefcaseIcon {...iconProps} />;
    default: return <DefaultFolderIcon {...iconProps} />;
  }
};

const Sidebar: React.FC<SidebarProps> = ({ folders, selectedFolderId, onSelectFolder, onAddNewList, width, searchTerm, onSearchTermChange }) => {
  // Magnetic effect refs and state
  const folderItemButtonRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const [magneticallyActiveFolderId, setMagneticallyActiveFolderId] = useState<string | null>(null);
  const folderMagneticAnimationRef = useRef<number | null>(null);

  // Slide effect refs and state
  const folderContentRefs = useRef(new Map<string, HTMLDivElement | null>());
  const [swipedFolderId, setSwipedFolderId] = useState<string | null>(null);
  const dragStartX = useRef<number | null>(null);
  const currentTranslateX = useRef(new Map<string, number>());
  const isDraggingFolder = useRef(false);
  const dragTargetFolderId = useRef<string | null>(null);

  // NEW Refs and state for Search Input magnetic effect
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchMagneticActive, setIsSearchMagneticActive] = useState(false);
  const searchAnimationRef = useRef<number | null>(null);

  const handleFolderMouseEnter = useCallback((folderId: string) => {
    if (PERMANENT_FOLDER_IDS.has(folderId) && magneticallyActiveFolderId === folderId) {
      // Allow magnetic still, but maybe less aggressive?
    } else if (magneticallyActiveFolderId === folderId) setMagneticallyActiveFolderId(null);
    const buttonEl = folderItemButtonRefs.current.get(folderId);
    if (buttonEl && buttonEl.style.transform !== 'translate(0px, 0px)') {
      buttonEl.style.transform = 'translate(0px, 0px)';
    }
  }, [magneticallyActiveFolderId]);

  const handleFolderMouseLeave = useCallback((folderId: string) => {
    if (!PERMANENT_FOLDER_IDS.has(folderId)) setMagneticallyActiveFolderId(folderId);
    else setMagneticallyActiveFolderId(folderId);
    // Keep magnetic for now
  }, []);

  useEffect(() => {
    // Capture refs and state for cleanup
    const capturedFolderItemRefs = folderItemButtonRefs.current;
    const capturedActiveFolderId = magneticallyActiveFolderId; // Capture the ID at the time of effect setup
    const capturedFolderAnimationRef = folderMagneticAnimationRef; // Ref itself is stable, .current is mutable

    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (capturedActiveFolderId === null) return; // Use captured ID

      const activeItemButtonEl = capturedFolderItemRefs.get(capturedActiveFolderId);
      if (!activeItemButtonEl) {
        // No need to set state here as this an event handler that might be stale if ID changed rapidly
        // The effect will re-run if magneticallyActiveFolderId changes.
        return;
      }

      if (capturedFolderAnimationRef.current) cancelAnimationFrame(capturedFolderAnimationRef.current);

      capturedFolderAnimationRef.current = requestAnimationFrame(() => {
        // Re-check with captured refs and ID inside rAF
        if (!capturedFolderItemRefs.has(capturedActiveFolderId)) return;
        const currentButtonEl = capturedFolderItemRefs.get(capturedActiveFolderId);
        if (!currentButtonEl) { return; }

        const rect = currentButtonEl.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const itemCenterY = rect.top + rect.height / 2;
        const mouseX = event.clientX, mouseY = event.clientY;

        const isMouseOverButton =
          mouseX >= rect.left && mouseX <= rect.right &&
          mouseY >= rect.top && mouseY <= rect.bottom;

        if (isMouseOverButton) {
          // Let onMouseEnter handle setting magneticallyActiveFolderId to null
          // Just ensure transform is reset if mouse is directly over.
          if (currentButtonEl.style.transform !== 'translate(0px, 0px)') currentButtonEl.style.transform = 'translate(0px, 0px)';
          // setMagneticallyActiveFolderId(null); // Avoid direct state update in rAF from mousemove
          return;
        }

        const dxToEdge = Math.max(0, rect.left - mouseX, mouseX - rect.right);
        const dyToEdge = Math.max(0, rect.top - mouseY, mouseY - rect.bottom);
        const distanceFromEdge = Math.sqrt(dxToEdge * dxToEdge + dyToEdge * dyToEdge);

        if (distanceFromEdge < FOLDER_PROXIMITY_RADIUS) {
          const deltaX = mouseX - itemCenterX, deltaY = mouseY - itemCenterY;
          const distanceToCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          if (distanceToCenter === 0) return;

          const normX = deltaX / distanceToCenter, normY = deltaY / distanceToCenter;
          const intensity = (FOLDER_PROXIMITY_RADIUS - distanceFromEdge) / FOLDER_PROXIMITY_RADIUS;
          
          let rawOffsetX = normX * FOLDER_MAX_OFFSET * intensity * FOLDER_PULL_FACTOR * 15; 
          let rawOffsetY = normY * FOLDER_MAX_OFFSET * intensity * FOLDER_PULL_FACTOR * 15;
          
          const currentMagnitude = Math.sqrt(rawOffsetX * rawOffsetX + rawOffsetY * rawOffsetY);
          let finalOffsetX = rawOffsetX, finalOffsetY = rawOffsetY;
          if (currentMagnitude > FOLDER_MAX_OFFSET) { const sf = FOLDER_MAX_OFFSET / currentMagnitude; finalOffsetX = rawOffsetX * sf; finalOffsetY = rawOffsetY * sf;}
          
          currentButtonEl.style.transform = `translate(${finalOffsetX}px, ${finalOffsetY}px)`;
        } else {
          if (currentButtonEl.style.transform !== 'translate(0px, 0px)') currentButtonEl.style.transform = 'translate(0px, 0px)';
        }
      });
    };
    
    // Only add listener if there's an active ID to prevent unnecessary global listeners
    if (capturedActiveFolderId !== null) {
        document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      if (capturedActiveFolderId !== null) { // Only remove if it was added
        document.removeEventListener('mousemove', handleGlobalMouseMove);
      }
      if (capturedFolderAnimationRef.current) {
        cancelAnimationFrame(capturedFolderAnimationRef.current);
      }
      // Use captured values in cleanup
      if(capturedActiveFolderId) {
        const el = capturedFolderItemRefs.get(capturedActiveFolderId);
        if(el && el.style.transform !== 'translate(0px, 0px)') el.style.transform = 'translate(0px, 0px)';
      }
    };
  }, [magneticallyActiveFolderId]); // Dependency is correct

  // Slide effect handlers
  const handleFolderContentMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, folderId: string) => {
    if (swipedFolderId && swipedFolderId !== folderId) {
      const prevSwipedContent = folderContentRefs.current.get(swipedFolderId);
      if (prevSwipedContent) prevSwipedContent.style.transform = 'translateX(0px)';
      currentTranslateX.current.set(swipedFolderId, 0);
    }
    isDraggingFolder.current = true;
    dragTargetFolderId.current = folderId;
    dragStartX.current = event.clientX;
    if (!currentTranslateX.current.has(folderId)) {
        currentTranslateX.current.set(folderId, 0); 
    }
    document.addEventListener('mousemove', handleFolderDragMove);
    document.addEventListener('mouseup', handleFolderDragEnd);
    event.preventDefault();
  }, [swipedFolderId, handleFolderDragMove, handleFolderDragEnd]);

  const handleFolderDragMove = useCallback((event: MouseEvent) => {
    if (!isDraggingFolder.current || !dragTargetFolderId.current || dragStartX.current === null) return;
    const folderId = dragTargetFolderId.current;
    const contentEl = folderContentRefs.current.get(folderId);
    if (!contentEl) return;
    const initialTranslateX = currentTranslateX.current.get(folderId) || 0;
    let deltaX = event.clientX - dragStartX.current;
    let newTranslateX = initialTranslateX + deltaX;
    newTranslateX = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, newTranslateX));
    contentEl.style.transform = `translateX(${newTranslateX}px)`;
  }, []);

  const handleFolderDragEnd = useCallback(() => {
    if (!isDraggingFolder.current || !dragTargetFolderId.current) return;
    const folderId = dragTargetFolderId.current;
    const contentEl = folderContentRefs.current.get(folderId);
    if (contentEl) {
      const currentTransform = parseFloat(contentEl.style.transform.replace('translateX(', '').replace('px)', '')) || 0;
      if (currentTransform < -SWIPE_THRESHOLD) {
        contentEl.style.transform = `translateX(${-DELETE_BUTTON_WIDTH}px)`;
        setSwipedFolderId(folderId); 
        currentTranslateX.current.set(folderId, -DELETE_BUTTON_WIDTH);
      } else {
        contentEl.style.transform = 'translateX(0px)';
        if (swipedFolderId === folderId) setSwipedFolderId(null);
        currentTranslateX.current.set(folderId, 0);
      }
    }
    isDraggingFolder.current = false;
    dragTargetFolderId.current = null;
    dragStartX.current = null;
    document.removeEventListener('mousemove', handleFolderDragMove);
    document.removeEventListener('mouseup', handleFolderDragEnd);
  }, [swipedFolderId, handleFolderDragMove]);

  // Effect to close swiped item if clicking outside or selecting another folder
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (swipedFolderId) {
        const swipedItemContent = folderContentRefs.current.get(swipedFolderId);
        // Check if click is outside the swiped item's button (parent of content and actions)
        const swipedItemButton = folderItemButtonRefs.current.get(swipedFolderId);
        if (swipedItemButton && !swipedItemButton.contains(event.target as Node)) {
          if (swipedItemContent) swipedItemContent.style.transform = 'translateX(0px)';
          currentTranslateX.current.set(swipedFolderId, 0);
          setSwipedFolderId(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside, true); // Use capture phase
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [swipedFolderId]);

  // NEW Handlers for Search Input Magnetic Effect
  const handleSearchInputMouseEnter = useCallback(() => {
    setIsSearchMagneticActive(false);
    if (searchInputRef.current) {
      searchInputRef.current.style.transform = 'translate(0px, 0px)';
    }
  }, []);

  const handleSearchInputMouseLeave = useCallback(() => {
    setIsSearchMagneticActive(true);
  }, []);

  // NEW useEffect for Search Input Magnetic Effect
  useEffect(() => {
    const inputEl = searchInputRef.current;
    if (!inputEl) return;

    const handleSearchMouseMove = (event: MouseEvent) => {
      if (!isSearchMagneticActive || !searchInputRef.current) {
        if (searchInputRef.current && searchInputRef.current.style.transform !== 'translate(0px, 0px)') {
          searchInputRef.current.style.transform = 'translate(0px, 0px)';
        }
        return;
      }
      if (searchAnimationRef.current) cancelAnimationFrame(searchAnimationRef.current);
      searchAnimationRef.current = requestAnimationFrame(() => {
        if (!searchInputRef.current) return;
        const rect = searchInputRef.current.getBoundingClientRect();
        const inputCenterX = rect.left + rect.width / 2, inputCenterY = rect.top + rect.height / 2;
        const mouseX = event.clientX, mouseY = event.clientY;
        const isMouseOverInput = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
        if (isMouseOverInput) {
          setIsSearchMagneticActive(false);
          if (searchInputRef.current.style.transform !== 'translate(0px, 0px)') searchInputRef.current.style.transform = 'translate(0px, 0px)';
          return;
        }
        const dxToEdge = Math.max(0, rect.left - mouseX, mouseX - rect.right), dyToEdge = Math.max(0, rect.top - mouseY, mouseY - rect.bottom);
        const distanceFromEdge = Math.sqrt(dxToEdge*dxToEdge + dyToEdge*dyToEdge);
        if (distanceFromEdge < SEARCH_PROXIMITY_RADIUS) {
          const deltaX = mouseX - inputCenterX, deltaY = mouseY - inputCenterY;
          const distanceToCenter = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
          if (distanceToCenter === 0) return;
          const normX = deltaX/distanceToCenter, normY = deltaY/distanceToCenter;
          const intensity = (SEARCH_PROXIMITY_RADIUS - distanceFromEdge) / SEARCH_PROXIMITY_RADIUS;
          let rawOffsetX = normX * SEARCH_MAX_OFFSET * intensity * SEARCH_PULL_FACTOR * 18; // Same multiplier as old input effect
          let rawOffsetY = normY * SEARCH_MAX_OFFSET * intensity * SEARCH_PULL_FACTOR * 18;
          const currentMagnitude = Math.sqrt(rawOffsetX*rawOffsetX + rawOffsetY*rawOffsetY);
          let finalOffsetX = rawOffsetX, finalOffsetY = rawOffsetY;
          if (currentMagnitude > SEARCH_MAX_OFFSET) { const sf = SEARCH_MAX_OFFSET / currentMagnitude; finalOffsetX = rawOffsetX*sf; finalOffsetY = rawOffsetY*sf; }
          searchInputRef.current.style.transform = `translate(${finalOffsetX}px, ${finalOffsetY}px)`;
        } else {
          if (searchInputRef.current.style.transform !== 'translate(0px, 0px)') searchInputRef.current.style.transform = 'translate(0px, 0px)';
        }
      });
    };
    inputEl.addEventListener('mouseenter', handleSearchInputMouseEnter);
    inputEl.addEventListener('mouseleave', handleSearchInputMouseLeave);
    document.addEventListener('mousemove', handleSearchMouseMove);
    return () => {
      inputEl.removeEventListener('mouseenter', handleSearchInputMouseEnter);
      inputEl.removeEventListener('mouseleave', handleSearchInputMouseLeave);
      document.removeEventListener('mousemove', handleSearchMouseMove);
      if (searchAnimationRef.current) cancelAnimationFrame(searchAnimationRef.current);
      if (searchInputRef.current && searchInputRef.current.style.transform !== 'translate(0px,0px)') searchInputRef.current.style.transform = 'translate(0px,0px)'; // Reset on cleanup
    };
  }, [isSearchMagneticActive, handleSearchInputMouseEnter, handleSearchInputMouseLeave]); // No isLoading needed as input is always rendered if Sidebar is

  // const [folders, setFolders] = useState<Folder[]>([]); // State now managed by App.tsx
  // const [error, setError] = useState<string | null>(null); // Error handling can be simplified or passed down if needed

  // useEffect(() => { // Folders are now passed as props
  //   try {
  //     const loadedFolders = folderStorage.getFolders();
  //     setFolders(loadedFolders);
  //   } catch (err) {
  //     console.error('Error loading folders:', err);
  //     setError('Failed to load folders.');
  //   }
  // }, []);

  // if (error) { // Basic error display, or rely on App.tsx for global error handling
  //   return <div className="sidebar-error">Error loading folders.</div>;
  // }

  if (!folders) {
    return (
      // Fallback for when folders might be null briefly during init or error
      <div className="sidebar" style={{ width: `${width}px` }}>
        <div className="sidebar-nav">
            <p>Loading folders...</p>
        </div>
        <div className="sidebar-footer">
          <button className="new-list-button" onClick={onAddNewList} disabled>
            + New List
          </button>
        </div>
      </div>
    );
  }
  
  if (folders.length === 0) {
    return (
      <div className="sidebar" style={{ width: `${width}px` }}>
        <div className="sidebar-nav">
            <p>No folders available.</p>
        </div>
        <div className="sidebar-footer">
          <button className="new-list-button" onClick={onAddNewList}>
            + New List
          </button>
        </div>
      </div>
    );
  }

  // Split folders into main and project/area sections for styling (optional, based on image)
  const mainFolders = folders.filter(f => ['inbox', 'today', 'upcoming', 'anytime', 'someday'].includes(f.id));
  const projectFolders = folders.filter(f => ['logbook', 'life', 'school', 'work'].includes(f.id));
  const otherFolders = folders.filter(f => 
    !['inbox', 'today', 'upcoming', 'anytime', 'someday', 'logbook', 'life', 'school', 'work'].includes(f.id)
  );

  const handleDeleteFolderContents = (folderId: string, folderName: string) => {
    // Placeholder for actual deletion logic (Phase 3)
    console.log(`Delete button clicked for folder: ${folderName} (ID: ${folderId})`);
    if (window.confirm(`Are you sure you want to delete all tasks in "${folderName}"? This cannot be undone.`)) {
        console.log("Deletion confirmed for", folderName);
        // Call actual deletion function here: e.g., props.onDeleteFolderTasks(folderId);
    }
  };

  const renderFolderItem = (folder: Folder) => {
    const isPermanent = PERMANENT_FOLDER_IDS.has(folder.id);
    // For magnetic effect, we might still want it, but ensure it doesn't conflict with disabled swipe
    // The refs for magnetic effect (folderItemButtonRefs) are still attached to the button.

    return (
      <li key={folder.id} className={`${folder.id === selectedFolderId ? 'active' : ''} ${swipedFolderId === folder.id ? 'item-swiped-open' : ''} ${isPermanent ? 'permanent-folder' : ''}`}>
        <button 
          ref={el => folderItemButtonRefs.current.set(folder.id, el)}
          onMouseEnter={() => handleFolderMouseEnter(folder.id)} 
          onMouseLeave={() => handleFolderMouseLeave(folder.id)}
          title={folder.name}
          // The main button no longer handles click for selection or mousedown for swipe
          // It's just a container for magnetic effect and styling hook (.active)
        >
          <div 
              className="folder-item-content"
              ref={el => folderContentRefs.current.set(folder.id, el)}
              onMouseDown={!isPermanent ? (e) => handleFolderContentMouseDown(e, folder.id) : undefined}
              onClick={(e) => {
                  if (isPermanent || swipedFolderId !== folder.id) { // Allow click if permanent or not currently swiped by another action
                    const currentTransform = parseFloat(e.currentTarget.style.transform.replace('translateX(','').replace('px)','')) || 0;
                    if (currentTransform === 0 ) { // Only select if not partially swiped or during a swipe action
                        onSelectFolder(folder.id);
                        if (swipedFolderId && swipedFolderId !== folder.id) { // close other swiped items
                            const prevSwiped = folderContentRefs.current.get(swipedFolderId);
                            if(prevSwiped) prevSwiped.style.transform = 'translateX(0px)';
                            currentTranslateX.current.set(swipedFolderId, 0);
                            setSwipedFolderId(null);
                        }
                    }
                  } 
              }}
              style={{ cursor: isPermanent ? 'pointer' : 'grab' }} // Change cursor for non-permanent
          >
              <span className="folder-icon"><FolderIconRenderer iconName={folder.icon} /></span>
              <span className="folder-name">{folder.name}</span>
          </div>
          {!isPermanent && (
            <div className="folder-actions-panel">
              <button className="folder-delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteFolderContents(folder.id, folder.name);}} aria-label={`Delete all tasks in ${folder.name}`}><TrashIcon /></button>
            </div>
          )}
        </button>
      </li>
    );
  };

  return (
    <div className="sidebar" style={{ width: `${width}px` }}>
      <div className="sidebar-search-section">
        <MagnifyingGlassIcon className="sidebar-search-icon" aria-hidden="true" />
        <input 
          ref={searchInputRef} // Attach ref
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="sidebar-search-input"
          aria-label="Search all tasks"
        />
      </div>
      <nav className="sidebar-nav">
        {mainFolders.length > 0 && (
          <ul>{mainFolders.map(renderFolderItem)}</ul>
        )}
        
        {(projectFolders.length > 0 || otherFolders.length > 0) && mainFolders.length > 0 && <hr className="sidebar-separator" />}

        {projectFolders.length > 0 && (
          <ul>{projectFolders.map(renderFolderItem)}</ul>
        )}
        
        {otherFolders.length > 0 && (projectFolders.length > 0 || mainFolders.length > 0) && <hr className="sidebar-separator" />}

        {otherFolders.length > 0 && (
          <ul>{otherFolders.map(renderFolderItem)}</ul>
        )}
      </nav>
      <div className="sidebar-footer">
        <button className="new-list-button" onClick={onAddNewList}>
          + New List
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 