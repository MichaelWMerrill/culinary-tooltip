/*
 * Single source of truth for the site's public email addresses.
 *
 * Visible copy and mailto links read from here so an address can only ever be
 * changed in one place. (server/contactHandler.ts keeps its own copy: the
 * Worker bundle does not import from src/.)
 */

/** General questions and the contact page. */
export const CONTACT_EMAIL = 'contact@empiricalbbq.com';

/** Reports of mistakes in the math or the science. */
export const CORRECTIONS_EMAIL = 'corrections@empiricalbbq.com';

/** Privacy policy questions. */
export const PRIVACY_EMAIL = 'privacy@empiricalbbq.com';
