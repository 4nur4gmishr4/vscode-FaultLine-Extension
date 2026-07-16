/**
 * PII (Personally Identifiable Information) detection and sanitization utilities.
 * Detects and redacts sensitive data from error messages and logs.
 */

/** Upper bound on input length we will scan, to bound regex work on pathological input. */
const MAX_SCAN_LENGTH = 100_000;

interface PiiPattern {
    /** Human-readable type name reported by {@link getDetectedPIITypes}. */
    readonly name: string;
    readonly pattern: RegExp;
    readonly replacement: string | ((match: string) => string);
}

/**
 * Heuristic: a long token is "base64-ish" only if it mixes character classes the way
 * real base64 does. A 40-char commit SHA (all-hex, single case) or a UUID therefore does
 * NOT match, which avoids redacting benign identifiers out of error logs.
 */
function looksLikeBase64Secret(value: string): boolean {
    if (/[+/=]/.test(value)) {
        return true;
    }
    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasDigit = /[0-9]/.test(value);
    return hasLower && hasUpper && hasDigit;
}

/**
 * PII patterns for detection and redaction. Ordered most-specific first so that, e.g.,
 * a vendor-prefixed key is tagged as that key rather than caught by the generic base64 rule.
 */
const PII_PATTERNS: readonly PiiPattern[] = [
    // API keys (vendor-prefixed).
    { name: 'OPENROUTER_KEY', pattern: /sk-or-v1-[a-zA-Z0-9_-]{20,}/g, replacement: '[OPENROUTER_KEY]' },
    { name: 'ANTHROPIC_KEY', pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/g, replacement: '[ANTHROPIC_KEY]' },
    { name: 'OPENAI_KEY', pattern: /sk-[a-zA-Z0-9]{20,}/g, replacement: '[API_KEY]' },
    { name: 'GROQ_KEY', pattern: /gsk_[a-zA-Z0-9]{40,}/g, replacement: '[GROQ_KEY]' },
    { name: 'GOOGLE_KEY', pattern: /AIza[a-zA-Z0-9_-]{35}/g, replacement: '[GOOGLE_KEY]' },
    { name: 'HUGGINGFACE_KEY', pattern: /hf_[a-zA-Z0-9]{30,}/g, replacement: '[HUGGINGFACE_KEY]' },
    { name: 'AWS_KEY', pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[AWS_KEY]' },
    // GitHub PATs / OAuth tokens (ghp_, gho_, ghu_, ghs_, ghr_).
    { name: 'GITHUB_TOKEN', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, replacement: '[GITHUB_TOKEN]' },
    // Azure storage / SAS style secrets.
    {
        name: 'AZURE_KEY',
        pattern: /(?:AccountKey|SharedAccessKey|SharedAccessSignature)=([A-Za-z0-9+/%&=_-]{16,})/gi,
        replacement: (match: string): string => {
            const eq = match.indexOf('=');
            return eq >= 0 ? `${match.slice(0, eq + 1)}[AZURE_KEY]` : '[AZURE_KEY]';
        }
    },
    // JWT (header.payload.signature), often appears without a key= prefix.
    {
        name: 'JWT',
        pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
        replacement: '[JWT]'
    },
    // PEM private keys (multiline).
    {
        name: 'PEM_PRIVATE_KEY',
        pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g,
        replacement: '[PEM_PRIVATE_KEY]'
    },

    // Credentials embedded in a URL (user:pass@host) — redact only the credentials,
    // preserving the rest of the URL so documentation links stay useful.
    { name: 'URL_CREDENTIALS', pattern: /(https?:\/\/)[^/\s:@]+:[^/\s:@]+@/gi, replacement: '$1[REDACTED]@' },

    // Passwords / tokens / secrets in `key: value` or `key=value` form.
    { name: 'PASSWORD', pattern: /(password|passwd|pwd)(["']?\s*[:=]\s*["']?)[^"'\s]+/gi, replacement: '$1$2[REDACTED]' },
    { name: 'TOKEN', pattern: /(token|secret|api[_-]?key|authorization|bearer)(["']?\s*[:=]\s*["']?)[^"'\s]{8,}/gi, replacement: '$1$2[REDACTED]' },

    // Email addresses.
    { name: 'EMAIL', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: '[EMAIL]' },

    // Generic base64-encoded secrets (validated to avoid eating SHAs/UUIDs/hex hashes).
    {
        name: 'BASE64',
        pattern: /[A-Za-z0-9+/]{40,}={0,2}/g,
        replacement: (match: string): string => (looksLikeBase64Secret(match) ? '[BASE64]' : match)
    }
];

/**
 * Detect if a string contains PII.
 * @param text - The text to check
 * @returns True if PII is detected, false otherwise
 */
export function containsPII(text: string): boolean {
    return getDetectedPIITypes(text).length > 0;
}

/**
 * Sanitize a string by redacting PII.
 * @param text - The text to sanitize
 * @returns The sanitized text with PII redacted
 */
export function sanitizePII(text: string): string {
    let sanitized = text.length > MAX_SCAN_LENGTH ? text.slice(0, MAX_SCAN_LENGTH) : text;
    for (const { pattern, replacement } of PII_PATTERNS) {
        pattern.lastIndex = 0;
        sanitized = typeof replacement === 'function'
            ? sanitized.replace(pattern, (m) => replacement(m))
            : sanitized.replace(pattern, replacement);
    }
    return sanitized;
}

/**
 * Get a summary of detected PII types in text.
 * @param text - The text to analyze
 * @returns Array of detected PII type names (e.g. `["OPENAI_KEY", "EMAIL"]`)
 */
export function getDetectedPIITypes(text: string): string[] {
    const scan = text.length > MAX_SCAN_LENGTH ? text.slice(0, MAX_SCAN_LENGTH) : text;
    const detected: string[] = [];
    for (const { name, pattern, replacement } of PII_PATTERNS) {
        pattern.lastIndex = 0;
        // For the validated base64 rule, a raw regex hit isn't enough — confirm the
        // replacement actually redacts, so we don't report benign hex identifiers.
        if (typeof replacement === 'function') {
            let m: RegExpExecArray | null;
            let hit = false;
            while ((m = pattern.exec(scan)) !== null) {
                if (replacement(m[0]) !== m[0]) {
                    hit = true;
                    break;
                }
            }
            pattern.lastIndex = 0;
            if (hit) {
                detected.push(name);
            }
        } else if (pattern.test(scan)) {
            pattern.lastIndex = 0;
            detected.push(name);
        }
    }
    return detected;
}
