import React from 'react';
import { Mail, Github, Chrome, FileText, BookOpen, Clock, MoreHorizontal, PlayCircle, Book } from 'lucide-react';
import AppLayout from '../layouts/AppLayout';
import Sidebar from '../features/workspace/Sidebar';
import TopBar from '../features/workspace/TopBar';
import './MailReceiver.css';

// Mock Data
const RECENT_EMAILS = [
    {
        id: 1,
        source: 'google',
        sender: 'Google Security',
        subject: 'Security alert',
        time: '3w ago',
        icon: Chrome,
        color: '#ea4335'
    },
    {
        id: 2,
        source: 'github',
        sender: 'GitHub',
        subject: '[GitHub] Personal access token added',
        time: '3w ago',
        icon: Github,
        color: '#24292f'
    },
    {
        id: 3,
        source: 'google',
        sender: 'Youtube Creators',
        subject: 'Your weekly stats are in!',
        time: '3w ago',
        icon: Chrome,
        color: '#ea4335'
    },
    {
        id: 4,
        source: 'github',
        sender: 'Vercel',
        subject: 'Deployment failed',
        time: '3w ago',
        icon: Github,
        color: '#000000'
    },
    {
        id: 5,
        source: 'google',
        sender: 'Google Cloud',
        subject: 'Bill estimate',
        time: '4w ago',
        icon: Chrome,
        color: '#ea4335'
    },
];

const SUGGESTED_ITEMS = [
    {
        id: 1,
        title: 'Connect a new account',
        type: 'watch',
        meta: '2m watch',
        image: '🔗'
    },
    {
        id: 2,
        title: 'Create automation rules',
        type: 'read',
        meta: '5m read',
        image: '⚡'
    },
    {
        id: 3,
        title: 'Customize your inbox',
        type: 'read',
        meta: '9m read',
        image: '🎨'
    }
];

const MailCard = ({ email }) => (
    <div className="mail-card">
        <div className="mail-card-header">
            <email.icon size={24} style={{ color: email.color }} />
        </div>
        <div className="mail-card-content">
            <div className="mail-card-title">{email.subject}</div>
            <div className="mail-card-sender">{email.sender}</div>
        </div>
        <div className="mail-card-footer">
            <div className="sender-avatar" style={{ backgroundColor: email.color }}>
                {email.sender[0]}
            </div>
            <span className="mail-time">{email.time}</span>
        </div>
    </div>
);

const LearnCard = ({ item }) => (
    <div className="learn-card">
        <div className="learn-image-placeholder">
            <span style={{ fontSize: '48px' }}>{item.image}</span>
        </div>
        <div className="learn-content">
            <div className="learn-title">{item.title}</div>
            <div className="learn-meta">
                {item.type === 'watch' ? <PlayCircle size={12} /> : <Book size={12} />}
                {item.meta}
            </div>
        </div>
    </div>
);

const MailReceiverPage = () => {
    return (
        <AppLayout
            sidebar={
                <Sidebar
                    activePage="mail"
                    onPageClick={() => window.location.href = '/app'}
                    pages={[
                        { id: 'todo', icon: <Mail size={14} />, label: 'Back to Workspace', type: 'private' }
                    ]}
                    // Need to ensure click works if sidebar implementation uses internal state
                    onAddNewList={() => { }}
                />
            }
        >
            <div className="mail-container">
                {/* Greeting Header */}
                <div className="mail-content">
                    <h1 className="mail-greeting">Good evening, Thành Luân</h1>

                    {/* Section 1: Recent Emails */}
                    <div className="mail-section">
                        <div className="section-header">
                            <div className="section-title">
                                <Clock size={16} />
                                Recently received
                            </div>
                        </div>
                        <div className="card-grid">
                            {RECENT_EMAILS.map(email => (
                                <MailCard key={email.id} email={email} />
                            ))}
                        </div>
                    </div>

                    {/* Section 2: Suggested */}
                    <div className="mail-section">
                        <div className="section-header">
                            <div className="section-title">
                                <BookOpen size={16} />
                                Suggested for you
                            </div>
                            <MoreHorizontal size={16} className="section-actions" />
                        </div>
                        <div className="card-grid">
                            {SUGGESTED_ITEMS.map(item => (
                                <LearnCard key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default MailReceiverPage;
