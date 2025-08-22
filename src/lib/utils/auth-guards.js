import { get } from 'svelte/store';
import { user, isSubscribed, isAdmin } from '../stores/auth.js';
import { redirect } from '@sveltejs/kit';

/**
 * Check if user is authenticated
 */
export function requireAuth() {
    const currentUser = get(user);
    if (!currentUser) {
        throw redirect(302, '/login');
    }
    return currentUser;
}

/**
 * Check if user is authenticated and subscribed
 */
export function requireSubscription() {
    const currentUser = requireAuth();
    const subscribed = get(isSubscribed);
    
    if (!subscribed) {
        throw redirect(302, '/dashboard?error=subscription_required');
    }
    
    return currentUser;
}

/**
 * Check if user is admin
 */
export function requireAdmin() {
    const currentUser = requireAuth();
    const admin = get(isAdmin);
    
    if (!admin) {
        throw redirect(302, '/dashboard?error=admin_required');
    }
    
    return currentUser;
}

/**
 * Check if user owns a resource
 */
export function requireOwnership(resourceOwnerId) {
    const currentUser = requireAuth();
    
    if (currentUser.uid !== resourceOwnerId) {
        throw redirect(302, '/dashboard?error=access_denied');
    }
    
    return currentUser;
}

/**
 * Check if user can access TV (must be owner and subscribed)
 */
export function requireTVAccess(tvOwnerId) {
    const currentUser = requireSubscription();
    
    if (currentUser.uid !== tvOwnerId) {
        throw redirect(302, '/dashboard?error=tv_access_denied');
    }
    
    return currentUser;
}

/**
 * Client-side auth check for components
 */
export function checkClientAuth() {
    const currentUser = get(user);
    const subscribed = get(isSubscribed);
    const admin = get(isAdmin);
    
    return {
        isAuthenticated: !!currentUser,
        isSubscribed: subscribed,
        isAdmin: admin,
        user: currentUser
    };
}

/**
 * Get error message for auth errors
 */
export function getAuthErrorMessage(errorCode) {
    const messages = {
        subscription_required: 'You need an active subscription to access this feature.',
        admin_required: 'You need admin privileges to access this page.',
        access_denied: 'You don\'t have permission to access this resource.',
        tv_access_denied: 'You can only access TVs that you own.',
        auth_required: 'You must be logged in to access this page.'
    };
    
    return messages[errorCode] || 'Access denied.';
}

/**
 * Middleware for protecting routes
 */
export const authMiddleware = {
    /**
     * Protect route - requires authentication
     */
    protected: (event) => {
        return requireAuth();
    },
    
    /**
     * Subscriber only route - requires authentication and subscription
     */
    subscriber: (event) => {
        return requireSubscription();
    },
    
    /**
     * Admin only route - requires authentication and admin privileges
     */
    admin: (event) => {
        return requireAdmin();
    },
    
    /**
     * Owner only route - requires authentication and ownership
     */
    owner: (event, resourceOwnerId) => {
        return requireOwnership(resourceOwnerId);
    },
    
    /**
     * TV access route - requires authentication, subscription, and ownership
     */
    tvAccess: (event, tvOwnerId) => {
        return requireTVAccess(tvOwnerId);
    }
};

/**
 * Rate limiting for sensitive operations
 */
class RateLimiter {
    constructor() {
        this.attempts = new Map();
    }
    
    checkLimit(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        const now = Date.now();
        const userAttempts = this.attempts.get(key) || [];
        
        // Remove old attempts outside the window
        const recentAttempts = userAttempts.filter(time => now - time < windowMs);
        
        if (recentAttempts.length >= maxAttempts) {
            return false; // Rate limited
        }
        
        // Add current attempt
        recentAttempts.push(now);
        this.attempts.set(key, recentAttempts);
        
        return true; // Allowed
    }
    
    reset(key) {
        this.attempts.delete(key);
    }
}

export const rateLimiter = new RateLimiter();

/**
 * Security headers for sensitive routes
 */
export function getSecurityHeaders() {
    return {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') {
        return '';
    }
    
    // Basic sanitization
    let sanitized = input.trim();
    
    switch (type) {
        case 'email':
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(sanitized) ? sanitized.toLowerCase() : '';
            
        case 'slug':
            // URL slug sanitization
            return sanitized
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
                
        case 'filename':
            // Filename sanitization
            return sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
            
        case 'html':
            // Basic HTML escaping
            return sanitized
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
                
        default:
            // Default text sanitization
            return sanitized.replace(/[<>]/g, '');
    }
}

/**
 * Log security events
 */
export function logSecurityEvent(event, details = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        details,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
    };
    
    // In production, send to logging service
    console.warn('Security Event:', logEntry);
}

/**
 * Content Security Policy for video content
 */
export function getVideoCSP() {
    return {
        'Content-Security-Policy': [
            "default-src 'self'",
            "media-src 'self' https://firebasestorage.googleapis.com",
            "img-src 'self' data: https://firebasestorage.googleapis.com",
            "script-src 'self' 'unsafe-inline' https://www.gstatic.com",
            "style-src 'self' 'unsafe-inline'",
            "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com",
            "frame-ancestors 'none'"
        ].join('; ')
    };
}
