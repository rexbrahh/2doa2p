import React, { useState, ChangeEvent, KeyboardEvent } from 'react';
import './TodoList.css'; // import CSS for TodoList styling

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  isEditing: boolean;
  isExpanded: boolean;
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'buy zyns', completed: false, isEditing: false, isExpanded: false },
    { id: 2, text: 'call gf', completed: false, isEditing: false, isExpanded: false },
    { id: 3, text: 'hit the gym', completed: false, isEditing: false, isExpanded: false },
    { id: 4, text: 'check jira tickets', completed: false, isEditing: false, isExpanded: false },
    { id: 5, text: 'fix bugs', completed: false, isEditing: false, isExpanded: false },
  ]);
  
  // Combine searchTerm and newTodoText into one state
  const [inputText, setInputText] = useState<string>('');

  // Filter todos based on search term
  const filteredTodos = todos.filter(todo =>
    todo.text.toLowerCase().includes(inputText.toLowerCase())
  );

  // Toggle completed state of a todo
  const toggleComplete = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Toggle editing mode for a todo
  const toggleEdit = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, isEditing: !todo.isEditing } : todo
      )
    );
  };

  // Update todo text when editing
  const updateTodoText = (id: number, text: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, text } : todo
      )
    );
  };

  // Handle input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  // Add new todo item
  const addTodo = () => {
    const trimmedText = inputText.trim();
    if (trimmedText === '') return;
    
    const newTodo: Todo = {
      id: Date.now(),
      text: trimmedText,
      completed: false,
      isEditing: false,
      isExpanded: false,
    };
    setTodos(prev => [...prev, newTodo]);
    setInputText(''); // Clear input after adding
  };

  // Search functionality
  const handleSearch = () => {
    // The filtering is already happening through filteredTodos
    // Just keep the input text to maintain the filter
  };

  // Handle enter key
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  // Delete todo item
  const deleteTodo = (id: number) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  // Toggle expanded state
  const toggleExpanded = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id 
          ? { ...todo, isExpanded: !todo.isExpanded } 
          : { ...todo, isExpanded: false }  // Close other items
      )
    );
  };

  return (
    <div className="todo-list-container">
      <div className="add-todo-section">
        <input
          type="text"
          placeholder="Add new or search"
          value={inputText}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          className="new-todo-input"
          aria-label="Add new or search todos"
        />
        <button onClick={addTodo} className="action-button add-button">
          Add
        </button>
        <button onClick={handleSearch} className="action-button search-button">
          Search
        </button>
      </div>
      <ul className="todo-list">
        {filteredTodos.map(todo => (
          <li 
            key={todo.id} 
            className={`todo-item ${todo.isExpanded ? 'expanded' : ''}`}
            onDoubleClick={() => toggleExpanded(todo.id)}
          >
            <div className="todo-content">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleComplete(todo.id)}
                  aria-label={`Toggle completion for ${todo.text}`}
                />
                <span className="checkmark" />
              </label>
              {todo.isEditing ? (
                <input
                  type="text"
                  value={todo.text}
                  onChange={(e) => updateTodoText(todo.id, e.target.value)}
                  onBlur={() => toggleEdit(todo.id)}
                  onKeyPress={(e) => handleKeyPress(e)}
                  className="todo-input-edit"
                  autoFocus
                  aria-label="Edit todo text"
                />
              ) : (
                <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                  {todo.text}
                </span>
              )}
            </div>
            {todo.isExpanded && (
              <div className="expanded-actions">
                <button onClick={() => toggleEdit(todo.id)} className="edit-button">
                  {todo.isEditing ? 'Save' : 'Edit'}
                </button>
                <button onClick={() => deleteTodo(todo.id)} className="delete-button">
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList; 