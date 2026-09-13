/**
 * Shared contact link. Per cgpa-state-of-play.md Section 3: "All CGPA
 * WhatsApp-routing triggers... route to the SAME SINGLE WhatsApp
 * group [as UTME] — no per-trigger group split." Not a separate
 * CGPA-specific group.
 *
 * Real group invite link, received directly (not sourced from
 * grantapp-shell's own contact.ts, which as of this file's last
 * update still held the placeholder 1:1 DM link) — this is the swap
 * both repos' TODO comments were waiting on. grantapp-shell's own
 * src/lib/content/contact.ts needs the same update; not done from
 * this repo since the two are separate codebases/deployments, but
 * flagged here so it isn't missed — the two are meant to point at the
 * identical destination, not just have started out copied.
 */
export const WHATSAPP_URL = 'https://chat.whatsapp.com/EGSE3SrFC0w3OuVZ7zJXeU';
