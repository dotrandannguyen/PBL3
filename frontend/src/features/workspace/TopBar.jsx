import React from 'react';
import { Star, MoreHorizontal } from 'lucide-react';
import './TopBar.css';

// ============================================
// SMALL COMPONENTS
// ============================================

/** Icon Button - Nút với icon */
const IconButton = ({ icon: Icon, label, className = '' }) => (
    <button type="button" className={`icon-btn ${className}`} aria-label={label}>
        <Icon size={16} />
    </button>
);

// ============================================
// MAIN COMPONENT
// ============================================

const TopBar = ({ title, icon, isPrivate = true, editedDate = 'Jan 10' }) => {
    return (
        <header className="top-bar">
            {/* Breadcrumb Navigation */}
            <nav className="breadcrumbs">
                <span className="page-icon">{icon}</span>
                <span className="page-title">{title}</span>
                {/* Private badge removed */}
            </nav>

            {/* Action Buttons */}
            <div className="top-bar-actions">
                <span className="last-edited">Edited {editedDate}</span>
                <button type="button" className="share-btn">Share</button>
                <IconButton icon={Star} label="Add to favorites" className="star-btn" />
                <IconButton icon={MoreHorizontal} label="More options" className="more-btn" />
            </div>
        </header>
    );
};

export default TopBar;
