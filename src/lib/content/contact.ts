/**
 * Shared contact link. Reused verbatim from grantapp-shell's own
 * src/lib/content/contact.ts, per cgpa-state-of-play.md Section 3:
 * "All CGPA WhatsApp-routing triggers... route to the SAME SINGLE
 * WhatsApp group [as UTME] — no per-trigger group split." Not a
 * separate CGPA-specific group.
 *
 * TODO (carried over from grantapp-shell's own note): this is still
 * the 1:1 DM link, not a group invite link — swap once the real group
 * URL is shared. Update grantapp-shell's contact.ts too when that
 * happens, since the two are meant to stay identical, not just
 * initially copied.
 */
export const WHATSAPP_URL = 'https://wa.me/message/6PR7WXZDM2YTKI';
