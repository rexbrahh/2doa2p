export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  tags: string[];
  folderId: string;
} 