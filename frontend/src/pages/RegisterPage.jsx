import React, { useState } from 'react';
import './RegisterPage.css';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Check } from 'lucide-react';

// Google 'G' Logo SVG
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

// Apple Logo SVG
const AppleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
);

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 1500);
    };

    // Password strength indicator
    const getPasswordStrength = (password) => {
        if (!password) return { level: 0, text: '', color: '' };
        if (password.length < 6) return { level: 1, text: 'Too short', color: '#ef4444' };
        if (password.length < 8) return { level: 2, text: 'Weak', color: '#f59e0b' };
        if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
            return { level: 4, text: 'Strong', color: '#22c55e' };
        }
        return { level: 3, text: 'Good', color: '#3b82f6' };
    };

    const strength = getPasswordStrength(formData.password);

    return (
        <div className="auth-container">
            {/* Decorative background elements */}
            <div className="auth-bg-decoration">
                <div className="bg-orb bg-orb-1"></div>
                <div className="bg-orb bg-orb-2"></div>
                <div className="bg-orb bg-orb-3"></div>
            </div>

            <div className="auth-card">
                <div className="auth-header">
                    <div className="notion-logo">
                        <span>N</span>
                    </div>
                    <h1>Create your account</h1>
                    <p className="auth-subtitle">Start your journey with Notion</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* Name Field */}
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <div className="input-wrapper">
                            <User className="input-icon" size={18} />
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="Enter your full name..."
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={18} />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Enter your email address..."
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={18} />
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a strong password..."
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Password Strength Indicator */}
                        {formData.password && (
                            <div className="password-strength">
                                <div className="strength-bars">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className={`strength-bar ${strength.level >= level ? 'active' : ''}`}
                                            style={{ backgroundColor: strength.level >= level ? strength.color : undefined }}
                                        />
                                    ))}
                                </div>
                                <span className="strength-text" style={{ color: strength.color }}>
                                    {strength.text}
                                </span>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="auth-btn primary-btn" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="btn-icon spinning" size={18} />
                                <span>Creating account...</span>
                            </>
                        ) : (
                            <>
                                <span>Sign up with Email</span>
                                <ArrowRight className="btn-icon-right" size={18} />
                            </>
                        )}
                    </button>

                    <div className="auth-divider">
                        <span>OR</span>
                    </div>

                    <div className="social-login">
                        <button type="button" className="social-btn google-btn">
                            <GoogleIcon />
                            <span>Sign up with Google</span>
                        </button>
                        <button type="button" className="social-btn apple-btn">
                            <AppleIcon />
                            <span>Sign up with Apple</span>
                        </button>
                    </div>
                </form>

                <div className="auth-footer">
                    <p>Already have an account? <Link to="/login" className="auth-link">Log in</Link></p>
                </div>

                {/* Terms text */}
                <p className="terms-text">
                    By signing up, you agree to our <a href="#" className="terms-link">Terms of Service</a> and <a href="#" className="terms-link">Privacy Policy</a>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
