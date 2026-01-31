import React from 'react';
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
    Pencil,
    Filter,
    Check,
    MoreHorizontal,
    Github,
    Chrome
} from 'lucide-react';
import './Sidebar.css';

// ============================================
// CONSTANTS - Data-Driven UI
// ============================================

const MAIN_NAV_ITEMS = [
    { icon: Search, label: 'Search' },
    { icon: Home, label: 'Home' },
    { icon: Users, label: 'Meetings' },
    { icon: Sparkles, label: 'Notion AI' },
    { icon: Inbox, label: 'Inbox' },
];

const NOTION_APPS = [
    { icon: Mail, label: 'Notion Mail' },
    { icon: Calendar, label: 'Notion Calendar' },
];

const BOTTOM_NAV_ITEMS = [
    { icon: Settings, label: 'Settings' },
    { icon: Store, label: 'Marketplace' },
    { icon: Trash2, label: 'Trash' },
];

// ============================================
// SMALL COMPONENTS - Single Responsibility
// ============================================

/** User Avatar Component - Hiển thị avatar với chữ cái đầu */
const UserAvatar = ({ initial, className = '' }) => (
    <div className={`user-avatar ${className}`}>
        {initial}
    </div>
);

/** Navigation Item Component - Một mục trong menu */
const NavItem = ({ icon: Icon, label, onClick, isActive = false }) => (
    <button
        type="button"
        onClick={onClick}
        className={`nav-item ${isActive ? 'active' : ''}`}
    >
        <Icon size={16} className="nav-icon" />
        <span className="nav-label">{label}</span>
    </button>
);

/** Page Item Component - Một trang trong danh sách */
const PageItem = ({ page, onClick, isActive, onDelete, onRename }) => {
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [renameVal, setRenameVal] = React.useState(page.label);

    const handleSaveRename = (e) => {
        e.stopPropagation();
        if (onRename && renameVal.trim() !== page.label) {
            onRename(page.id, renameVal);
        }
        setIsRenaming(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSaveRename(e);
        if (e.key === 'Escape') {
            setRenameVal(page.label);
            setIsRenaming(false);
        }
    };

    return (
        <button
            type="button"
            className={`page-item ${isActive ? 'active' : ''} ${page.indent ? 'nested' : ''}`}
            onClick={() => onClick(page.id)}
        >
            <span className="page-icon">
                {page.icon}
            </span>

            {isRenaming ? (
                <input
                    autoFocus
                    className="page-rename-input"
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={handleSaveRename}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <>
                    <span className="page-title">{page.label}</span>
                    <div className="page-actions" onClick={(e) => e.stopPropagation()}>
                        {onRename && (
                            <div
                                className="action-btn"
                                title="Rename"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRenaming(true);
                                }}
                            >
                                <Pencil size={12} />
                            </div>
                        )}
                        {onDelete && (
                            <div
                                className="action-btn delete"
                                title="Delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(page.id);
                                }}
                            >
                                <Trash2 size={12} />
                            </div>
                        )}
                    </div>
                </>
            )}
        </button>
    );
};

/** Section Header Component - Tiêu đề của một section */
const SectionHeader = ({ title, onAdd }) => (
    <div className="section-header">
        <span>{title}</span>
        {onAdd && (
            <button type="button" className="add-btn" onClick={onAdd} title={`Add new ${title.toLowerCase()}`}>
                <Plus size={14} />
            </button>
        )}
    </div>
);

/** Invite Panel Component - Panel mời thành viên */
const InvitePanel = ({ onClose }) => (
    <div className="invite-panel">
        <div className="invite-header">
            <Users size={16} />
            <span>Invite members</span>
            <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>
        <p className="invite-description">Collaborate with your team.</p>
    </div>
);

// ============================================
// INBOX PANEL DATA & COMPONENT
// ============================================

const NOTIFICATIONS = [
    {
        id: 1,
        source: 'google',
        sender: 'Google Security',
        subject: 'Security alert',
        preview: 'New sign-in to your Google Account on a Windows device.',
        time: '1h',
        unread: true,
        icon: Chrome,
        color: '#ea4335'
    },
    {
        id: 2,
        source: 'github',
        sender: 'GitHub',
        subject: 'Personal access token',
        preview: 'A personal access token has been added to your account.',
        time: '2h',
        unread: true,
        icon: Github,
        color: '#d4d4d4'
    },
    {
        id: 3,
        source: 'mail',
        sender: 'Linear',
        subject: 'Cycle 12 Summary',
        preview: 'The cycle has ended. View the summary of completed issues.',
        time: '1d',
        unread: false,
        icon: Mail,
        color: '#5e6ad2'
    }
];

const InboxPanel = ({ isOpen, onClose }) => {
    const [filter, setFilter] = React.useState('all');

    return (
        <>
            <div className={`inbox-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
            <div className={`inbox-panel ${isOpen ? 'open' : ''}`}>
                <header className="inbox-header">
                    <div className="inbox-title">
                        <Inbox size={16} />
                        Inbox
                    </div>
                    <div className="inbox-actions">
                        <button className="inbox-action-btn" title="Filter"><Filter size={14} /></button>
                        <button className="inbox-action-btn" title="Mark all read"><Check size={14} /></button>
                        <button className="inbox-action-btn" title="More"><MoreHorizontal size={14} /></button>
                    </div>
                </header>

                <div className="inbox-tabs">
                    {['all', 'unread', 'archived'].map(f => (
                        <button
                            key={f}
                            className={`inbox-tab ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="inbox-list">
                    {NOTIFICATIONS.map(notif => (
                        <div key={notif.id} className={`notification-item ${notif.unread ? 'unread' : ''}`}>
                            <div className="notif-icon-wrapper">
                                <notif.icon size={16} style={{ color: notif.color }} />
                            </div>
                            <div className="notif-content">
                                <div className="notif-header">
                                    <span className="notif-sender">{notif.sender}</span>
                                    <span className="notif-time">{notif.time}</span>
                                </div>
                                <div className="notif-subject">{notif.subject}</div>
                                <div className="notif-preview">{notif.preview}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const Sidebar = ({ pages, onAddNewList, activePage, onPageClick, onDeletePage, onRenamePage }) => {
    // State for Inbox Panel
    const [showInbox, setShowInbox] = React.useState(false);

    // Filter pages by type - tách logic ra ngoài return
    const privatePages = pages.filter(p => p.type === 'private');

    return (
        <>
            <aside className="sidebar">
                {/* User Profile Section */}
                <button type="button" className="sidebar-user">
                    <UserAvatar initial="T" />
                    <span className="user-name">Thành Luân Nguy...</span>
                    <ChevronDown size={14} className="dropdown-icon" />
                </button>

                {/* Main Navigation */}
                <nav className="nav-section main-nav">
                    {MAIN_NAV_ITEMS.map(item => (
                        <NavItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            isActive={item.label === 'Inbox' && showInbox}
                            onClick={() => {
                                if (item.label === 'Inbox') {
                                    setShowInbox(!showInbox);
                                } else if (item.label === 'Home') {
                                    window.location.href = '/app';
                                }
                            }}
                        />
                    ))}
                </nav>

                {/* Private Pages Section */}
                <section className="nav-section private-section">
                    <SectionHeader title="Private" onAdd={onAddNewList} />

                    {privatePages.map(page => (
                        <PageItem
                            key={page.id}
                            page={page}
                            onClick={onPageClick}
                            isActive={page.id === activePage}
                            onDelete={onDeletePage}
                            onRename={onRenamePage}
                        />
                    ))}

                    {privatePages.length === 0 && (
                        <p className="empty-state">No pages inside</p>
                    )}
                </section>

                {/* Shared Section */}
                <section className="nav-section shared-section">
                    <SectionHeader title="Shared" />
                    <NavItem icon={Plus} label="Start collaborating" />
                </section>

                {/* Notion Apps Section */}
                <section className="nav-section apps-section">
                    <SectionHeader title="Notion apps" />
                    {NOTION_APPS.map(item => (
                        <NavItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            onClick={() => {
                                if (item.label === 'Notion Mail') {
                                    window.location.href = '/mail';
                                }
                            }}
                        />
                    ))}
                </section>

                {/* Bottom Navigation */}
                <nav className="nav-section bottom-nav">
                    {BOTTOM_NAV_ITEMS.map(item => (
                        <NavItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                        />
                    ))}
                </nav>

                {/* Invite Members Panel */}
                <InvitePanel onClose={() => { }} />
            </aside>

            {/* Sliding Inbox Panel */}
            <InboxPanel isOpen={showInbox} onClose={() => setShowInbox(false)} />
        </>
    );
};

export default Sidebar;
