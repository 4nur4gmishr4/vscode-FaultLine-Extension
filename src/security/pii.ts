/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/**
 * PII (Personally Identifiable Information) detection and sanitization utilities.
 * Detects and redacts sensitive data from error messages and logs.
 */

/**
 * PII patterns for detection and redaction.
 */
const PII_PATTERNS = [
    // API Keys
    { pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: '[API_KEY]' },
    { pattern: /sk-or-v1-[a-zA-Z0-9_-]{20,}/g, replacement: '[OPENROUTER_KEY]' },
    { pattern: /gsk_[a-zA-Z0-9]{40,}/g, replacement: '[GROQ_KEY]' },
    { pattern: /AIza[a-zA-Z0-9_-]{35}/g, replacement: '[GOOGLE_KEY]' },
    { pattern: /hf_[a-zA-Z0-9]{30,}/g, replacement: '[HUGGINGFACE_KEY]' },
    { pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/g, replacement: '[ANTHROPIC_KEY]' },
    
    // Email addresses
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
    
    // IP addresses
    { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP_ADDRESS]' },
    
    // URLs with potential sensitive data
    { pattern: /https?:\/\/[^\s]+/g, replacement: '[URL]' },
    
    // Passwords in common patterns
    { pattern: /password["']?\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'password="[PASSWORD]"' },
    { pattern: /passwd["']?\s*[:=]\s*["']?[^"'\s]+["']?/gi, replacement: 'passwd="[PASSWORD]"' },
    
    // Tokens and secrets
    { pattern: /token["']?\s*[:=]\s*["']?[^"'\s]{20,}["']?/gi, replacement: 'token="[TOKEN]"' },
    { pattern: /secret["']?\s*[:=]\s*["']?[^"'\s]{20,}["']?/gi, replacement: 'secret="[SECRET]"' },
    
    // AWS keys
    { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[AWS_KEY]' },
    
    // Base64 encoded strings (likely sensitive)
    { pattern: /[A-Za-z0-9+/]{40,}={0,2}/g, replacement: '[BASE64]' }
];

/**
 * Detect if a string contains PII.
 * @param text - The text to check
 * @returns True if PII is detected, false otherwise
 */
export function containsPII(text: string): boolean {
    for (const { pattern } of PII_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
            pattern.lastIndex = 0;
            return true;
        }
        pattern.lastIndex = 0;
    }
    return false;
}

/**
 * Sanitize a string by redacting PII.
 * @param text - The text to sanitize
 * @returns The sanitized text with PII redacted
 */
export function sanitizePII(text: string): string {
    let sanitized = text;
    for (const { pattern, replacement } of PII_PATTERNS) {
        pattern.lastIndex = 0;
        sanitized = sanitized.replace(pattern, replacement);
        pattern.lastIndex = 0;
    }
    return sanitized;
}

/**
 * Get a summary of detected PII types in text.
 * @param text - The text to analyze
 * @returns Array of detected PII type names
 */
export function getDetectedPIITypes(text: string): string[] {
    const detected: string[] = [];
    for (const { pattern } of PII_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
            detected.push(pattern.toString());
        }
        pattern.lastIndex = 0;
    }
    return detected;
}
