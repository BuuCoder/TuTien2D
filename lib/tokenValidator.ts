/**
 * Utility để validate token trong localStorage
 * Tự động clear nếu token không hợp lệ
 */

export function validateStoredToken(autoClear: boolean = false): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const userStr = localStorage.getItem('tutien2d_user');
        if (!userStr) {
            return false;
        }

        const user = JSON.parse(userStr);
        if (!user.socketToken) {
            if (autoClear) {
                localStorage.removeItem('tutien2d_user');
            }
            return false;
        }

        // Decode JWT token để check expiry
        const parts = user.socketToken.split('.');
        if (parts.length !== 3) {
            if (autoClear) {
                localStorage.removeItem('tutien2d_user');
            }
            return false;
        }

        const payload = JSON.parse(atob(parts[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const isExpired = Date.now() > payload.exp * 1000;

        if (isExpired) {
            if (autoClear) {
                localStorage.removeItem('tutien2d_user');
                localStorage.removeItem('tutien2d_playerStats');
            }
            return false;
        }

        return true;

    } catch (error) {
        console.error('[TokenValidator] Error validating token:', error);
        if (autoClear) {
            localStorage.removeItem('tutien2d_user');
            localStorage.removeItem('tutien2d_playerStats');
        }
        return false;
    }
}

/**
 * Clear all stored data
 */
export function clearStoredData() {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('tutien2d_user');
    localStorage.removeItem('tutien2d_playerStats');
    localStorage.removeItem('tutien2d_currentMap');
    localStorage.removeItem('tutien2d_playerPosition');
}
