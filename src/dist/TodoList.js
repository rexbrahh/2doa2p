"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var react_1 = require("react");
require("./TodoList.css"); // import CSS for TodoList styling
var TodoList = function () {
    var _a = react_1.useState([
        { id: 1, text: 'buy zyns', completed: false, isEditing: false, isExpanded: false },
        { id: 2, text: 'call gf', completed: false, isEditing: false, isExpanded: false },
        { id: 3, text: 'hit the gym', completed: false, isEditing: false, isExpanded: false },
        { id: 4, text: 'check jira tickets', completed: false, isEditing: false, isExpanded: false },
        { id: 5, text: 'fix bugs', completed: false, isEditing: false, isExpanded: false },
    ]), todos = _a[0], setTodos = _a[1];
    // Combine searchTerm and newTodoText into one state
    var _b = react_1.useState(''), inputText = _b[0], setInputText = _b[1];
    // Filter todos based on search term
    var filteredTodos = todos.filter(function (todo) {
        return todo.text.toLowerCase().includes(inputText.toLowerCase());
    });
    // Toggle completed state of a todo
    var toggleComplete = function (id) {
        setTodos(function (prev) {
            return prev.map(function (todo) {
                return todo.id === id ? __assign(__assign({}, todo), { completed: !todo.completed }) : todo;
            });
        });
    };
    // Toggle editing mode for a todo
    var toggleEdit = function (id) {
        setTodos(function (prev) {
            return prev.map(function (todo) {
                return todo.id === id ? __assign(__assign({}, todo), { isEditing: !todo.isEditing }) : todo;
            });
        });
    };
    // Update todo text when editing
    var updateTodoText = function (id, text) {
        setTodos(function (prev) {
            return prev.map(function (todo) {
                return todo.id === id ? __assign(__assign({}, todo), { text: text }) : todo;
            });
        });
    };
    // Handle input change
    var handleInputChange = function (e) {
        setInputText(e.target.value);
    };
    // Add new todo item
    var addTodo = function () {
        var trimmedText = inputText.trim();
        if (trimmedText === '')
            return;
        var newTodo = {
            id: Date.now(),
            text: trimmedText,
            completed: false,
            isEditing: false,
            isExpanded: false
        };
        setTodos(function (prev) { return __spreadArrays(prev, [newTodo]); });
        setInputText(''); // Clear input after adding
    };
    // Search functionality
    var handleSearch = function () {
        // The filtering is already happening through filteredTodos
        // Just keep the input text to maintain the filter
    };
    // Handle enter key
    var handleKeyPress = function (e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    };
    // Delete todo item
    var deleteTodo = function (id) {
        setTodos(function (prev) { return prev.filter(function (todo) { return todo.id !== id; }); });
    };
    // Toggle expanded state
    var toggleExpanded = function (id) {
        setTodos(function (prev) {
            return prev.map(function (todo) {
                return todo.id === id
                    ? __assign(__assign({}, todo), { isExpanded: !todo.isExpanded }) : __assign(__assign({}, todo), { isExpanded: false });
            } // Close other items
            );
        });
    };
    return (react_1["default"].createElement("div", { className: "todo-list-container" },
        react_1["default"].createElement("div", { className: "add-todo-section" },
            react_1["default"].createElement("input", { type: "text", placeholder: "Add new or search", value: inputText, onChange: handleInputChange, onKeyPress: handleKeyPress, className: "new-todo-input", "aria-label": "Add new or search todos" }),
            react_1["default"].createElement("button", { onClick: addTodo, className: "action-button add-button" }, "Add"),
            react_1["default"].createElement("button", { onClick: handleSearch, className: "action-button search-button" }, "Search")),
        react_1["default"].createElement("ul", { className: "todo-list" }, filteredTodos.map(function (todo) { return (react_1["default"].createElement("li", { key: todo.id, className: "todo-item " + (todo.isExpanded ? 'expanded' : ''), onDoubleClick: function () { return toggleExpanded(todo.id); } },
            react_1["default"].createElement("div", { className: "todo-content" },
                react_1["default"].createElement("label", { className: "checkbox-container" },
                    react_1["default"].createElement("input", { type: "checkbox", checked: todo.completed, onChange: function () { return toggleComplete(todo.id); }, "aria-label": "Toggle completion for " + todo.text }),
                    react_1["default"].createElement("span", { className: "checkmark" })),
                todo.isEditing ? (react_1["default"].createElement("input", { type: "text", value: todo.text, onChange: function (e) { return updateTodoText(todo.id, e.target.value); }, onBlur: function () { return toggleEdit(todo.id); }, onKeyPress: function (e) { return handleKeyPress(e); }, className: "todo-input-edit", autoFocus: true, "aria-label": "Edit todo text" })) : (react_1["default"].createElement("span", { className: "todo-text " + (todo.completed ? 'completed' : '') }, todo.text))),
            todo.isExpanded && (react_1["default"].createElement("div", { className: "expanded-actions" },
                react_1["default"].createElement("button", { onClick: function () { return toggleEdit(todo.id); }, className: "edit-button" }, todo.isEditing ? 'Save' : 'Edit'),
                react_1["default"].createElement("button", { onClick: function () { return deleteTodo(todo.id); }, className: "delete-button" }, "Delete"))))); }))));
};
exports["default"] = TodoList;
