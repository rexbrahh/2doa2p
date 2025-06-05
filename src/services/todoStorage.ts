import { Todo } from '../types/todo';

const STORAGE_KEY = 'todos';
const DEFAULT_FOLDER_ID = 'inbox'; // Default folder for migration

export const todoStorage = {
  // Get all todos from storage
  getTodos: (): Todo[] => {
    try {
      const todosJson = localStorage.getItem(STORAGE_KEY);
      const storedTodos = todosJson ? JSON.parse(todosJson) : [];
      // Migrate existing todos to have a folderId if they don't
      return storedTodos.map((todo: any) => ({
        ...todo,
        folderId: todo.folderId || DEFAULT_FOLDER_ID,
        // Ensure other fields have sensible defaults if migrating from an older structure
        isEditing: todo.isEditing || false,
        isExpanded: todo.isExpanded || false,
        tags: todo.tags || [],
      }));
    } catch (error) {
      console.error('Error reading todos from storage:', error);
      return [];
    }
  },

  // Save todos to storage
  saveTodos: (todos: Todo[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
      console.error('Error saving todos to storage:', error);
      throw new Error('Failed to save todos');
    }
  },

  // Add a new todo (will be further refined when folder selection is implemented)
  addTodo: (todo: Omit<Todo, 'id' | 'completed' | 'isEditing' | 'isExpanded' | 'tags'> & { text: string, folderId: string }): Todo => {
    const todos = todoStorage.getTodos();
    const newTodo: Todo = {
      id: Date.now(),
      text: todo.text,
      completed: false,
      isEditing: false,
      isExpanded: false,
      tags: [],
      folderId: todo.folderId || DEFAULT_FOLDER_ID,
    };
    const updatedTodos = [...todos, newTodo];
    todoStorage.saveTodos(updatedTodos);
    return newTodo; // Return the created todo
  },

  // Update a todo
  updateTodo: (updatedTodo: Todo): void => {
    const todos = todoStorage.getTodos();
    const index = todos.findIndex(todo => todo.id === updatedTodo.id);
    if (index !== -1) {
      todos[index] = updatedTodo;
      todoStorage.saveTodos(todos);
    }
  },

  // Delete a todo
  deleteTodo: (id: number): void => {
    const todos = todoStorage.getTodos();
    const filteredTodos = todos.filter(todo => todo.id !== id);
    todoStorage.saveTodos(filteredTodos);
  }
}; 