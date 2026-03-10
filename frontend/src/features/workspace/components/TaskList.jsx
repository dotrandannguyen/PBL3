import React, { useState } from 'react';
import {
    Search,
    ChevronDown,
    Plus,
    Trash2,
    Filter,
    ArrowUpDown,
    Maximize2,
    MoreHorizontal,
    ListFilter
} from 'lucide-react';
import './TaskList.css';

// ============================================
// CONSTANTS
// ============================================

const TOOLBAR_ACTIONS = [
    { icon: Filter, name: 'filter' },
    { icon: ArrowUpDown, name: 'sort' },
    { icon: Search, name: 'search' },
    { icon: Maximize2, name: 'expand' },
    { icon: MoreHorizontal, name: 'more' },
];

const INITIAL_TASKS = [
    { id: 1, text: 'Check the box to mark items as done', done: true, date: '2026-01-10' },
    { id: 2, text: 'Click the due date to change it', done: true, date: '2026-01-10' },
    { id: 3, text: 'Click me to see even more detail', done: true, date: '2026-01-10' },
    { id: 4, text: 'Click the blue New button to add a task', done: true, date: '2026-01-10' },
    { id: 5, text: 'Click me to learn how to hide checked items', done: false, date: '2026-01-10' },
    { id: 6, text: 'See finished items in the "Done" view', done: false, date: '2026-01-10' },
    { id: 7, text: 'Click me to learn how to see your content your way', done: false, date: '2026-01-11' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (date) => {
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
};

const createNewTask = (text = 'New task') => ({
    id: Date.now(),
    text,
    done: false,
    date: new Date().toISOString().split('T')[0]
});

// ============================================
// SMALL COMPONENTS
// ============================================

/** Logo Component - Hiển thị logo checkmark */
const CheckmarkLogo = () => (
    <svg className="page-logo" width="78" height="78" viewBox="0 0 78 78" fill="none">
        <path d="M15 42L30 57L63 24" stroke="#00C853" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 30L30 45L50 25" stroke="#00C853" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
);

/** Tab Button Component */
const TabButton = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        type="button"
        className={`tab-btn ${isActive ? 'active' : ''}`}
        onClick={onClick}
    >
        {Icon ? <Icon size={14} /> : <span>✓</span>}
        <span>{label}</span>
    </button>
);

/** Toolbar Button Component */
const ToolbarButton = ({ icon: Icon, name }) => (
    <button type="button" className={`toolbar-btn ${name}-btn`}>
        <Icon size={14} />
    </button>
);

/** Task Checkbox Component */
const TaskCheckbox = ({ checked, onChange }) => (
    <button
        type="button"
        className={`task-checkbox ${checked ? 'checked' : ''}`}
        onClick={onChange}
        aria-label={checked ? 'Mark as incomplete' : 'Mark as complete'}
    >
        {checked && <span>✓</span>}
    </button>
);

/** Task Row Component */
const TaskRow = ({ task, isEditing, editText, onToggle, onEdit, onEditChange, onEditSave, onEditKeyDown, onDelete }) => (
    <div className="task-row">
        <TaskCheckbox checked={task.done} onChange={onToggle} />

        {isEditing ? (
            <input
                className="task-edit-input"
                value={editText}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={onEditKeyDown}
                onBlur={onEditSave}
                autoFocus
            />
        ) : (
            <button
                type="button"
                className={`task-text ${task.done ? 'completed' : ''}`}
                onClick={onEdit}
            >
                {task.text}
            </button>
        )}

        <span className="task-date">{formatDate(task.date)}</span>

        <button type="button" className="delete-btn" onClick={onDelete}>
            <Trash2 size={14} />
        </button>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const TaskList = ({ title = 'To Do List' }) => {
    // State
    const [tasks, setTasks] = useState(INITIAL_TASKS);
    const [activeTab, setActiveTab] = useState('todo');
    const [newTaskText, setNewTaskText] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Derived state
    const filteredTasks = tasks.filter(task => {
        // Filter by tab
        if (activeTab === 'todo' && task.done) return false;
        if (activeTab === 'done' && !task.done) return false;

        // Filter by search
        if (searchQuery && !task.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        return true;
    });

    // Event handlers
    const handleToggleTask = (id) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        setTasks([...tasks, createNewTask(newTaskText)]);
        setNewTaskText('');
    };

    const handleAddBlankTask = () => {
        const newTask = createNewTask();
        setTasks([...tasks, newTask]);
        setTimeout(() => {
            setEditingId(newTask.id);
            setEditText(newTask.text);
        }, 50);
    };

    const handleDeleteTask = (id) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const handleStartEdit = (task) => {
        setEditingId(task.id);
        setEditText(task.text);
    };

    const handleSaveEdit = () => {
        if (editingId) {
            setTasks(tasks.map(t => t.id === editingId ? { ...t, text: editText } : t));
            setEditingId(null);
            setEditText('');
        }
    };

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter') handleSaveEdit();
        else if (e.key === 'Escape') {
            setEditingId(null);
            setEditText('');
        }
    };

    const handleNewTaskKeyDown = (e) => {
        if (e.key === 'Enter') handleAddTask();
    };

    return (
        <main className="task-list-container">
            <div className="task-list-content">
                {/* Page Header */}
                <header className="page-header">
                    <h1 className="page-title">{title}</h1>
                </header>

                {/* Toolbar */}
                <div className="toolbar">
                    <div className="tab-group">
                        <TabButton
                            icon={ListFilter}
                            label="To Do"
                            isActive={activeTab === 'todo'}
                            onClick={() => setActiveTab('todo')}
                        />
                        <TabButton
                            label="Done"
                            isActive={activeTab === 'done'}
                            onClick={() => setActiveTab('done')}
                        />
                    </div>

                    <div className="toolbar-actions">
                        {isSearchOpen ? (
                            <div className="search-box-container" style={{ display: 'flex', alignItems: 'center', background: '#2c2c2c', borderRadius: '4px', padding: '0 8px', marginRight: '8px' }}>
                                <Search size={14} style={{ color: '#9b9b9b' }} />
                                <input
                                    autoFocus
                                    placeholder="Search tasks..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onBlur={() => !searchQuery && setIsSearchOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'white', padding: '6px', fontSize: '13px', width: '150px', outline: 'none' }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                                        style={{ background: 'transparent', border: 'none', color: '#9b9b9b', cursor: 'pointer', padding: '0' }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div onClick={() => setIsSearchOpen(true)}>
                                <ToolbarButton icon={Search} name="search" />
                            </div>
                        )}

                        <ToolbarButton icon={Filter} name="filter" />
                        <ToolbarButton icon={ArrowUpDown} name="sort" />
                        <ToolbarButton icon={Maximize2} name="expand" />
                        <ToolbarButton icon={MoreHorizontal} name="more" />

                        <button type="button" className="new-task-btn" onClick={handleAddBlankTask}>
                            New
                            <ChevronDown size={12} />
                        </button>
                    </div>
                </div>

                {/* Task List */}
                <div className="task-list">
                    {filteredTasks.map(task => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            isEditing={editingId === task.id}
                            editText={editText}
                            onToggle={() => handleToggleTask(task.id)}
                            onEdit={() => handleStartEdit(task)}
                            onEditChange={setEditText}
                            onEditSave={handleSaveEdit}
                            onEditKeyDown={handleEditKeyDown}
                            onDelete={() => handleDeleteTask(task.id)}
                        />
                    ))}

                    {/* Add New Task Input */}
                    <div className="new-task-row">
                        <Plus size={14} />
                        <input
                            className="new-task-input"
                            placeholder="New task"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onKeyDown={handleNewTaskKeyDown}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default TaskList;
