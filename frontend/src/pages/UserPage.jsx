import React, { useState } from 'react';
import './UserPage.css';
import {
  Search,
  Home,
  Users,
  Sparkles,
  Inbox,
  ChevronDown,
  Plus,
  Settings,
  Store,
  Trash2,
  Calendar,
  Mail,
  MoreHorizontal,
  Star,
  Clock,
  Filter,
  ArrowUpDown,
  Maximize2,
  ListFilter
} from 'lucide-react';

// Checkmark Logo Component (like Notion's green checkmarks)
const CheckmarkLogo = () => (
  <svg width="78" height="78" viewBox="0 0 78 78" fill="none">
    <path d="M15 42L30 57L63 24" stroke="#00C853" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 30L30 45L50 25" stroke="#00C853" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
  </svg>
);

// Format date
const formatDate = (date) => {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
};

// Default tasks
const DEFAULT_TASKS = [
  { id: 1, text: 'Check the box to mark items as done', done: true, date: '2026-01-10' },
  { id: 2, text: 'Click the due date to change it', done: true, date: '2026-01-10' },
  { id: 3, text: 'Click me to see even more detail', done: true, date: '2026-01-10' },
  { id: 4, text: 'Click the blue New button to add a task', done: true, date: '2026-01-10' },
  { id: 5, text: 'Click me to learn how to hide checked items', done: false, date: '2026-01-10' },
  { id: 6, text: 'See finished items in the "Done" view', done: false, date: '2026-01-10' },
  { id: 7, text: 'Click me to learn how to see your content your way', done: false, date: '2026-01-11' },
];

// Sidebar pages
const SIDEBAR_PAGES = [
  { id: 'welcome1', icon: '👋', label: 'Welcome to Notion!', type: 'private' },
  { id: 'welcome2', icon: '👋', label: 'Welcome to Notion!', type: 'private' },
  { id: 'todo', icon: '✅', label: 'To Do List', type: 'private', active: true },
  { id: 'todolist1', icon: '📋', label: 'Todo List', type: 'private', indent: true },
  { id: 'todolist2', icon: '📋', label: 'To Do List', type: 'private', indent: true },
];

const UserPage = () => {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [activeTab, setActiveTab] = useState('todo'); // 'todo' or 'done'
  const [newTaskText, setNewTaskText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [pages, setPages] = useState(SIDEBAR_PAGES);
  const [activePage, setActivePage] = useState('todo');

  // Filter tasks based on active tab
  const filteredTasks = activeTab === 'todo'
    ? tasks
    : tasks.filter(t => t.done);

  // Toggle task done status
  const toggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, done: !task.done } : task
    ));
  };

  // Add new task
  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask = {
      id: Date.now(),
      text: newTaskText,
      done: false,
      date: new Date().toISOString().split('T')[0]
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  // Add blank task (for New button)
  const addBlankTask = () => {
    const newTask = {
      id: Date.now(),
      text: 'New task',
      done: false,
      date: new Date().toISOString().split('T')[0]
    };
    setTasks([...tasks, newTask]);
    // Start editing the new task immediately
    setTimeout(() => {
      setEditingId(newTask.id);
      setEditText('New task');
    }, 50);
  };

  // Add new todo list (page)
  const addNewList = () => {
    const newPage = {
      id: `list-${Date.now()}`,
      icon: '📋',
      label: 'New List',
      type: 'private'
    };
    setPages([...pages, newPage]);
  };

  // Delete task
  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Start editing
  const startEdit = (task) => {
    setEditingId(task.id);
    setEditText(task.text);
  };

  // Save edit
  const saveEdit = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, text: editText } : task
    ));
    setEditingId(null);
    setEditText('');
  };

  // Handle key press in edit mode
  const handleEditKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      saveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditText('');
    }
  };

  // Handle new task key press
  const handleNewTaskKeyDown = (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* User section */}
        <div className="sidebar-user">
          <div className="user-avatar">T</div>
          <span className="user-name">Thành Luân Nguy...</span>
          <ChevronDown size={14} className="user-chevron" />
        </div>

        {/* Main nav items */}
        <div className="sidebar-nav">
          <div className="nav-item"><Search size={16} /><span>Search</span></div>
          <div className="nav-item"><Home size={16} /><span>Home</span></div>
          <div className="nav-item"><Users size={16} /><span>Meetings</span></div>
          <div className="nav-item"><Sparkles size={16} /><span>Notion AI</span></div>
          <div className="nav-item"><Inbox size={16} /><span>Inbox</span></div>
        </div>

        {/* Private section */}
        <div className="sidebar-section">
          <div className="section-header">
            Private
            <button className="section-add-btn" onClick={addNewList} title="Add new list">
              <Plus size={14} />
            </button>
          </div>
          {pages.filter(p => p.type === 'private').map(page => (
            <div
              key={page.id}
              className={`nav-item page-item ${page.active ? 'active' : ''} ${page.indent ? 'indent' : ''}`}
              onClick={() => setActivePage(page.id)}
            >
              <span className="page-icon">{page.icon}</span>
              <span>{page.label}</span>
            </div>
          ))}
          <div className="nav-item muted">No pages inside</div>
        </div>

        {/* Shared section */}
        <div className="sidebar-section">
          <div className="section-header">Shared</div>
          <div className="nav-item"><Plus size={16} /><span>Start collaborating</span></div>
        </div>

        {/* Notion apps */}
        <div className="sidebar-section">
          <div className="section-header">Notion apps</div>
          <div className="nav-item"><Mail size={16} /><span>Notion Mail</span></div>
          <div className="nav-item"><Calendar size={16} /><span>Notion Calendar</span></div>
        </div>

        {/* Bottom nav */}
        <div className="sidebar-bottom">
          <div className="nav-item"><Settings size={16} /><span>Settings</span></div>
          <div className="nav-item"><Store size={16} /><span>Marketplace</span></div>
          <div className="nav-item"><Trash2 size={16} /><span>Trash</span></div>
        </div>

        {/* Invite members */}
        <div className="invite-panel">
          <div className="invite-header">
            <Users size={16} />
            <span>Invite members</span>
            <button className="invite-close">×</button>
          </div>
          <p className="invite-text">Collaborate with your team.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top bar */}
        <div className="top-bar">
          <div className="breadcrumbs">
            <span className="breadcrumb-icon">✅</span>
            <span>To Do List</span>
            <span className="breadcrumb-private">🔒 Private</span>
          </div>
          <div className="top-actions">
            <span className="edited-text">Edited Jan 10</span>
            <button className="share-btn">Share</button>
            <button className="icon-btn"><Star size={16} /></button>
            <button className="icon-btn"><MoreHorizontal size={16} /></button>
          </div>
        </div>

        {/* Page content */}
        <div className="page-content">
          <div className="page-container">
            {/* Page header */}
            <div className="page-header">
              <CheckmarkLogo />
              <h1 className="page-title">To Do List</h1>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
              <div className="tab-group">
                <button
                  className={`tab ${activeTab === 'todo' ? 'active' : ''}`}
                  onClick={() => setActiveTab('todo')}
                >
                  <ListFilter size={14} />
                  <span>To Do</span>
                </button>
                <button
                  className={`tab ${activeTab === 'done' ? 'active' : ''}`}
                  onClick={() => setActiveTab('done')}
                >
                  <span>✓</span>
                  <span>Done</span>
                </button>
              </div>
              <div className="toolbar-actions">
                <button className="toolbar-btn"><Filter size={14} /></button>
                <button className="toolbar-btn"><ArrowUpDown size={14} /></button>
                <button className="toolbar-btn"><Search size={14} /></button>
                <button className="toolbar-btn"><Maximize2 size={14} /></button>
                <button className="toolbar-btn"><MoreHorizontal size={14} /></button>
                <button className="new-btn" onClick={addBlankTask}>
                  New
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>

            {/* Task list */}
            <div className="task-list">
              {filteredTasks.map(task => (
                <div key={task.id} className="task-row">
                  <div
                    className={`task-checkbox ${task.done ? 'checked' : ''}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.done && <span>✓</span>}
                  </div>

                  {editingId === task.id ? (
                    <input
                      className="task-edit-input"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, task.id)}
                      onBlur={() => saveEdit(task.id)}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`task-text ${task.done ? 'completed' : ''}`}
                      onClick={() => startEdit(task)}
                    >
                      {task.text}
                    </span>
                  )}

                  <span className="task-date">{formatDate(task.date)}</span>

                  <button
                    className="task-delete"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {/* New task row */}
              <div className="new-task-row">
                <Plus size={14} className="new-task-icon" />
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
        </div>
      </main>
    </div>
  );
};

export default UserPage;
