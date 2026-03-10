import React, { useState } from 'react';
import { FileText, BookOpen, Rocket, CheckSquare } from 'lucide-react';
import AppLayout from '../../../layouts/AppLayout';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import TaskList from '../components/TaskList';

// Sidebar pages data
const SIDEBAR_PAGES = [
    { id: 'welcome1', icon: <Rocket size={14} />, label: 'Getting Started', type: 'private' },
    { id: 'welcome2', icon: <BookOpen size={14} />, label: 'Quick Guide', type: 'private' },
    { id: 'todo', icon: <CheckSquare size={14} />, label: 'To Do List', type: 'private', active: true },
    { id: 'todolist1', icon: <FileText size={14} />, label: 'Todo List', type: 'private', indent: true },
    { id: 'todolist2', icon: <FileText size={14} />, label: 'To Do List', type: 'private', indent: true },
];

const WorkspacePage = () => {
    const [pages, setPages] = useState(SIDEBAR_PAGES);
    const [activePage, setActivePage] = useState('todo');

    const handleAddNewList = () => {
        const newPage = {
            id: `list-${Date.now()}`,
            icon: <FileText size={14} />,
            label: 'New List',
            type: 'private'
        };
        setPages([...pages, newPage]);
        setActivePage(newPage.id);
    };

    const handleDeletePage = (id) => {
        const newPages = pages.filter(p => p.id !== id);
        setPages(newPages);
        if (activePage === id && newPages.length > 0) {
            setActivePage(newPages[0].id);
        }
    };

    const handleRenamePage = (id, newLabel) => {
        setPages(pages.map(p => p.id === id ? { ...p, label: newLabel } : p));
    };

    const activePageData = pages.find(p => p.id === activePage) || pages[0] || { label: 'No pages' };

    return (
        <AppLayout
            sidebar={
                <Sidebar
                    pages={pages}
                    activePage={activePage}
                    onAddNewList={handleAddNewList}
                    onPageClick={setActivePage}
                    onDeletePage={handleDeletePage}
                    onRenamePage={handleRenamePage}
                />
            }
        >
            <TopBar
                title={activePageData.label}
                icon={activePageData.icon}
                isPrivate={true}
                editedDate="Just now"
            />
            <TaskList
                key={activePageData.id}
                title={activePageData.label}
            />
        </AppLayout>
    );
};

export default WorkspacePage;
