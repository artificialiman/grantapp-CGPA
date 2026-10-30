// RFC 4122 version 4 id from getRandomValues. crypto.randomUUID needs a newer browser
// than the oldest phones this app targets, so it is not used.
export function uuid4(): string {
	const b = new Uint8Array(16);
	crypto.getRandomValues(b);
	b[6] = (b[6] & 0x0f) | 0x40;
	b[8] = (b[8] & 0x3f) | 0x80;
	const h: string[] = [];
	for (let i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
	return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}
