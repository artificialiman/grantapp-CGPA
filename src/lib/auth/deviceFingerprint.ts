/**
 * Doctrine (cgpa-state-of-play.md): "a hashed device fingerprint
 * (user-agent + a locally-generated persistent random ID set on first
 * launch)". The random ID lives in localStorage (not a cookie --
 * nothing here needs to be sent automatically with every request the
 * way an auth cookie does; this is read explicitly at login/signup
 * time only) and persists across sessions on the same browser/device,
 * which is what makes "same device, different login" actually mean
 * something -- a bare user-agent string alone is not unique enough
 * (two students on the same phone model/OS/browser would collide).
 */
const DEVICE_ID_KEY = 'cgpa_device_id';

function generateRandomId(): string {
	// crypto.randomUUID() is broadly supported in modern browsers this
	// app targets; no polyfill needed for a client-only convenience ID
	// that's never used for anything security-critical on its own (it's
	// hashed together with the user-agent before ever reaching the
	// server -- see hashDeviceFingerprint below).
	return crypto.randomUUID();
}

function getOrCreatePersistentDeviceId(): string {
	if (typeof localStorage === 'undefined') return generateRandomId(); // SSR guard -- never actually persisted server-side, caller must only use this client-side
	let id = localStorage.getItem(DEVICE_ID_KEY);
	if (!id) {
		id = generateRandomId();
		localStorage.setItem(DEVICE_ID_KEY, id);
	}
	return id;
}

async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Called client-side at login/signup time (per doctrine: "checked at
 * login/auth time, not per-session" -- this is deliberately not called
 * on every request, only these two entry points). Returns the hash to
 * send to the server; the server never sees the raw user-agent +
 * random-id pair, only this digest, matching the "hashed device
 * fingerprint" wording in the doctrine exactly.
 */
export async function computeDeviceFingerprint(): Promise<string> {
	const persistentId = getOrCreatePersistentDeviceId();
	const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
	return sha256Hex(`${userAgent}::${persistentId}`);
}

/**
 * A best-effort human-readable label for the self-serve device list
 * (doctrine: "a self-serve screen listing existing devices... and a
 * remove this device action"). Deliberately coarse (browser + OS
 * family, not a precise parse) -- this is for a student to recognize
 * "oh that's my phone" at a glance, not a forensic device-identification
 * tool.
 */
export function guessDeviceLabel(): string {
	if (typeof navigator === 'undefined') return 'Unknown device';
	const ua = navigator.userAgent;

	const os = /Android/i.test(ua)
		? 'Android'
		: /iPhone|iPad|iPod/i.test(ua)
			? 'iOS'
			: /Windows/i.test(ua)
				? 'Windows'
				: /Mac OS/i.test(ua)
					? 'Mac'
					: /Linux/i.test(ua)
						? 'Linux'
						: 'Unknown OS';

	const browser = /Chrome/i.test(ua) && !/Edg/i.test(ua)
		? 'Chrome'
		: /Safari/i.test(ua) && !/Chrome/i.test(ua)
			? 'Safari'
			: /Firefox/i.test(ua)
				? 'Firefox'
				: /Edg/i.test(ua)
					? 'Edge'
					: 'Browser';

	return `${browser} on ${os}`;
}
