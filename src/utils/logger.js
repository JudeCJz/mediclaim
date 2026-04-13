import api from '../api';

/**
 * Logs an action to the backend for audit purposes.
 * @param {string} action - Descriptive name of the action (e.g., 'FY_ARCHIVED').
 * @param {Object} details - Additional metadata about the action.
 * @param {Object} actor - The user object performing the action { uid, email, role }.
 */
export const logAction = async (action, details, actor) => {
    try {
        await api.post('/logs', {
            action,
            details,
            actor: {
                uid: actor.uid || actor._id,
                email: actor.email,
                role: actor.role,
                name: actor.name || 'Unknown'
            },
            userAgent: navigator.userAgent
        });
    } catch (err) {
        console.error("Failed to log audit action:", err);
    }
};
