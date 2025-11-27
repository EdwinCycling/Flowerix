
/**
 * Security Service
 * Centralized handling for Input Validation, Rate Limiting, and Sanitization.
 */

// --- Constants ---
const MAX_TEXT_LENGTH = 2000;
const MAX_TITLE_LENGTH = 100;

// Rate Limit Store (in-memory)
const rateLimits: Record<string, { count: number; firstAttempt: number }> = {};

/**
 * Sanitize text input to prevent XSS and control character injection.
 * Removes HTML tags and limits length.
 */
export const sanitizeInput = (input: string, maxLength: number = MAX_TEXT_LENGTH): string => {
    if (!input) return "";
    // 1. Trim
    let clean = input.trim();
    
    // 2. Remove HTML tags (Basic XSS)
    clean = clean.replace(/<\/?[^>]+(>|$)/g, "");
    
    // 3. Encode dangerous chars if needed (for display, React does this automatically, but good for raw handling)
    // keeping it simple: remove null bytes
    clean = clean.replace(/\0/g, "");

    // 4. Enforce Length
    return clean.substring(0, maxLength);
};

/**
 * Validate Title Input
 */
export const validateTitle = (title: string): string => {
    return sanitizeInput(title, MAX_TITLE_LENGTH);
};

/**
 * Client-Side Rate Limiter
 * @param key Unique key for the action (e.g., 'login_attempt', 'ai_request')
 * @param maxAttempts Maximum allowed attempts
 * @param windowSeconds Time window in seconds
 * @returns true if allowed, false if blocked
 */
export const checkRateLimit = (key: string, maxAttempts: number, windowSeconds: number): boolean => {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    if (!rateLimits[key]) {
        rateLimits[key] = { count: 1, firstAttempt: now };
        return true;
    }

    const record = rateLimits[key];

    if (now - record.firstAttempt > windowMs) {
        // Window expired, reset
        rateLimits[key] = { count: 1, firstAttempt: now };
        return true;
    }

    if (record.count >= maxAttempts) {
        return false; // Blocked
    }

    record.count++;
    return true;
};

/**
 * Reset a specific rate limit key (e.g., on successful login)
 */
export const resetRateLimit = (key: string) => {
    delete rateLimits[key];
};

/**
 * CSV Injection Protection
 * Prevents spreadsheet formulas from executing if exported data contains =, +, -, or @
 */
export const sanitizeForCSV = (value: string | number | undefined): string => {
    if (value === undefined || value === null) return "";
    const str = String(value);
    if (/^[=+\-@]/.test(str)) {
        return "'" + str; // Prefix with single quote to force text mode in Excel
    }
    return str;
};
