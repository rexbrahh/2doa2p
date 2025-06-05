export interface Folder {
  id: string; // Using string for IDs for more flexibility, e.g., 'inbox', 'today'
  name: string;
  icon?: string; // Optional: for future icon display
} 