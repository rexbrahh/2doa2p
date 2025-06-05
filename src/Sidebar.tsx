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

  const handleFolderMouseEnter = useCallback((folderId: string) => {
    if (magneticallyActiveFolderId === folderId) {
      setMagneticallyActiveFolderId(null);
    }
    const buttonEl = folderItemButtonRefs.current.get(folderId);
    if (buttonEl && buttonEl.style.transform !== 'translate(0px, 0px)') {
      buttonEl.style.transform = 'translate(0px, 0px)';
    }
  }, [magneticallyActiveFolderId]);

  const handleFolderMouseLeave = useCallback((folderId: string) => {
    setMagneticallyActiveFolderId(folderId);
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
  const handleFolderContentMouseDown = (event: React.MouseEvent<HTMLDivElement>, folderId: string) => {
    // If another folder is swiped open, close it first
    if (swipedFolderId && swipedFolderId !== folderId) {
      const prevSwipedContent = folderContentRefs.current.get(swipedFolderId);
      if (prevSwipedContent) prevSwipedContent.style.transform = 'translateX(0px)';
      currentTranslateX.current.set(swipedFolderId, 0);
    }

    isDraggingFolder.current = true;
    dragTargetFolderId.current = folderId;
    dragStartX.current = event.clientX;
    if (!currentTranslateX.current.has(folderId)) {
        currentTranslateX.current.set(folderId, 0); // Initialize if not present
    }
    // Add listeners
    document.addEventListener('mousemove', handleFolderDragMove);
    document.addEventListener('mouseup', handleFolderDragEnd);
    event.preventDefault();
  };

  const handleFolderDragMove = useCallback((event: MouseEvent) => {
    if (!isDraggingFolder.current || !dragTargetFolderId.current || dragStartX.current === null) return;

    const folderId = dragTargetFolderId.current;
    const contentEl = folderContentRefs.current.get(folderId);
    if (!contentEl) return;

    const initialTranslateX = currentTranslateX.current.get(folderId) || 0;
    let deltaX = event.clientX - dragStartX.current;
    let newTranslateX = initialTranslateX + deltaX;

    // Clamp translation
    newTranslateX = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, newTranslateX));
    
    contentEl.style.transform = `translateX(${newTranslateX}px)`;
  }, []); // No dependencies, relies on refs

  const handleFolderDragEnd = useCallback(() => {
    if (!isDraggingFolder.current || !dragTargetFolderId.current) return;

    const folderId = dragTargetFolderId.current;
    const contentEl = folderContentRefs.current.get(folderId);
    
    if (contentEl) {
      const currentTransform = parseFloat(contentEl.style.transform.replace('translateX(', '').replace('px)', '')) || 0;
      if (currentTransform < -SWIPE_THRESHOLD) {
        contentEl.style.transform = `translateX(${-DELETE_BUTTON_WIDTH}px)`;
        setSwipedFolderId(folderId); // Keep this one open
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
  }, [swipedFolderId]); // Dependency on swipedFolderId to correctly reset it

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

  const renderFolderItem = (folder: Folder) => (
    <li key={folder.id} className={`${folder.id === selectedFolderId ? 'active' : ''} ${swipedFolderId === folder.id ? 'item-swiped-open' : ''}`}>
      <button 
        ref={el => {
          if (el) folderItemButtonRefs.current.set(folder.id, el);
          else folderItemButtonRefs.current.delete(folder.id);
        }}
        onMouseEnter={() => handleFolderMouseEnter(folder.id)}
        onMouseLeave={() => handleFolderMouseLeave(folder.id)}
        title={folder.name}
      >
        <div 
            className="folder-item-content" 
            ref={el => folderContentRefs.current.set(folder.id, el)}
            onMouseDown={(e) => handleFolderContentMouseDown(e, folder.id)}
            onClick={(e) => {
                // Prevent selecting folder if it was just part of a swipe action that didn't open
                const currentTransform = parseFloat(e.currentTarget.style.transform.replace('translateX(','').replace('px)','')) || 0;
                if (currentTransform === 0 && swipedFolderId !== folder.id) {
                    onSelectFolder(folder.id);
                }
                if (swipedFolderId && swipedFolderId !== folder.id) { // if another is swiped, close it and select
                    const prevSwiped = folderContentRefs.current.get(swipedFolderId);
                    if(prevSwiped) prevSwiped.style.transform = 'translateX(0px)';
                    currentTranslateX.current.set(swipedFolderId, 0);
                    setSwipedFolderId(null);
                    onSelectFolder(folder.id);
                }
            }}
        >
            <span className="folder-icon">
                <FolderIconRenderer iconName={folder.icon} />
            </span>
            <span className="folder-name">{folder.name}</span>
        </div>
        <div className="folder-actions-panel">
          <button 
            className="folder-delete-button"
            onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolderContents(folder.id, folder.name);
            }}
            aria-label={`Delete all tasks in ${folder.name}`}
          >
            <TrashIcon />
          </button>
        </div>
      </button>
    </li>
  );

  return (
    <div className="sidebar" style={{ width: `${width}px` }}>
      <div className="sidebar-search-section">
        <MagnifyingGlassIcon className="sidebar-search-icon" aria-hidden="true" />
        <input 
          type="text"
          placeholder="Search all tasks..."
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