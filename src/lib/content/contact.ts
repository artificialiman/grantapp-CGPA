/**
 * Section 3 (cgpa-state-of-play.md): every CGPA WhatsApp-routing
 * trigger (Premium, Customer Service, Upload Course Material,
 * Quiz-UI user-generated-content submission, vendor/Department/
 * Lecturer material intake) points at the SAME single WhatsApp group
 * — no per-trigger split, no auto-tagging on the app side, Tinggy
 * sorts submissions manually once they land.
 *
 * PLACEHOLDER: reusing grantapp-shell's UTME group URL pending
 * confirmation this is the correct CGPA-specific group Tinggy
 * provides — Section 3 doesn't say explicitly whether CGPA shares
 * UTME's group or gets its own. Flagged here rather than assumed
 * silently; swap this one constant once confirmed, nothing else
 * needs to change.
 */
export const WHATSAPP_URL = 'https://wa.me/message/6PR7WXZDM2YTKI';
