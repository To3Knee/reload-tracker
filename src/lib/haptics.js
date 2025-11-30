//===============================================================
//Script Name: haptics.js
//Script Location: src/lib/haptics.js
//Date: 11/30/2025
//Created By: T03KNEE
//Version: 1.0.0
//About: Safe wrapper for the Web Vibration API.
//===============================================================

/**
 * Triggers a short vibration on supported devices (Android).
 * Safely ignored on iOS/Desktop.
 * @param {number} ms - Duration in milliseconds (default 15ms for a "click" feel)
 */
export function vibrate(ms = 15) {
  // Check if browser supports vibration
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms)
    } catch (e) {
      // Ignore errors on unsupported devices
    }
  }
}

/**
 * Patterns for specific actions
 */
export const HAPTIC = {
  soft: () => vibrate(10),    // Navigation tap
  click: () => vibrate(20),   // Button press
  success: () => vibrate([50, 30, 50]), // Double bump for save
  error: () => vibrate([50, 100, 50, 100, 50]) // Long buzz for delete/error
}