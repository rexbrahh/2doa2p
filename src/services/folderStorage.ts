import { Folder } from '../types/folder';

const FOLDER_STORAGE_KEY = 'folders';

const getDefaultFolders = (): Folder[] => [
  { id: 'inbox', name: 'Inbox', icon: 'InboxArrowDownIcon' },
  { id: 'today', name: 'Today', icon: 'StarIcon' },
  { id: 'upcoming', name: 'Upcoming', icon: 'CalendarDaysIcon' },
  { id: 'anytime', name: 'Anytime', icon: 'Squares2X2Icon' }, 
  { id: 'someday', name: 'Someday', icon: 'ArchiveBoxIcon' },
  { id: 'logbook', name: 'Logbook', icon: 'ClipboardDocumentCheckIcon' },
  { id: 'life', name: 'Life', icon: 'HomeIcon' },
  { id: 'school', name: 'school', icon: 'AcademicCapIcon' }, // Assuming consistent casing in icon names
  { id: 'work', name: 'work', icon: 'BriefcaseIcon' },
];

export const folderStorage = {
  getFolders: (): Folder[] => {
    try {
      const foldersJson = localStorage.getItem(FOLDER_STORAGE_KEY);
      if (foldersJson) {
        // Basic migration: if stored folders use emojis, map to new string identifiers
        // This is a simple check; a more robust migration might be needed for complex cases
        const parsedFolders = JSON.parse(foldersJson);
        if (parsedFolders.length > 0 && typeof parsedFolders[0].icon !== 'string') { // Simple check for old format
            console.log('Migrating folder icons to new string format...');
            const defaultMap = new Map(getDefaultFolders().map(f => [f.name, f.icon]));
            const migrated = parsedFolders.map((pf: any) => ({
                ...pf,
                icon: defaultMap.get(pf.name) || undefined // Fallback to undefined if no match
            }));
            localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(migrated));
            return migrated;
        }
        return parsedFolders;
      } else {
        const defaultFolders = getDefaultFolders();
        localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(defaultFolders));
        return defaultFolders;
      }
    } catch (error) {
      console.error('Error reading folders from storage:', error);
      return getDefaultFolders(); 
    }
  },

  saveFolders: (folders: Folder[]): void => {
    try {
      localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(folders));
    } catch (error) {
      console.error('Error saving folders to storage:', error);
      throw new Error('Failed to save folders'); 
    }
  },

  addFolder: (newFolderData: { name: string, icon?: string }): Folder[] => {
    const folders = folderStorage.getFolders();
    const newFolder: Folder = {
        id: newFolderData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(), // More robust ID
        name: newFolderData.name,
        icon: newFolderData.icon // Allow new folders to specify an icon string
    };
    if (folders.some(f => f.name === newFolder.name)) { // Check name collision
        console.warn(`Folder with name '${newFolder.name}' already exists.`);
        // Potentially prompt user or append a number instead of failing silently
        return folders; 
    }
    const updatedFolders = [...folders, newFolder];
    folderStorage.saveFolders(updatedFolders);
    return updatedFolders;
  },

  // We might need updateFolder and deleteFolder later
}; 