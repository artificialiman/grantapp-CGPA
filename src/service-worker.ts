/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

/**
 * Offline strategy (this is an offline-heavy app):
 *
 *  - PRECACHE: every built JS/CSS chunk and static file, plus /offline,
 *    at install time. Once installed, the app shell never needs the
 *    network to start.
 *  - NAVIGATIONS and SvelteKit's client-navigation data
 *    (/…/__data.json): network-first, and every successful response is
 *    kept in a runtime cache. Offline, a page the student has already
 *    opened is served from that copy; a page they never opened falls
 *    back to /offline. Freshness wins whenever there is a connection.
 *  - /api/*: never touched here. Live data (questions, submissions,
 *    status) is the app's job to handle explicitly — a service worker
 *    silently replaying or caching a graded submission would be wrong.
 *
 * Privacy: the runtime cache holds signed-in pages. The app posts
 * {type: 'clear-runtime'} on sign-out so a shared device doesn't keep
 * the previous student's dashboard.
 */

const SHELL_CACHE = `shell-${version}`;
const RUNTIME_CACHE = 'runtime-v1';
const OFFLINE_URL = '/offline';

const SHELL_ASSETS = [...build, ...files, OFFLINE_URL];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(SHELL_CACHE)
			.then((cache) => cache.addAll(SHELL_ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
						.map((k) => caches.delete(k))
				)
			)
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('message', (event) => {
	if (event.data?.type === 'clear-runtime') {
		event.waitUntil(caches.delete(RUNTIME_CACHE));
	}
});

async function networkFirst(request: Request, fallbackToOfflinePage: boolean): Promise<Response> {
	const cache = await caches.open(RUNTIME_CACHE);
	try {
		const response = await fetch(request);
		// Only keep clean successes — never cache a redirect to /login or an error page.
		if (response.ok && response.status === 200 && !response.redirected) {
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		const cached = await cache.match(request);
		if (cached) return cached;
		if (fallbackToOfflinePage) {
			const offline = await caches.match(OFFLINE_URL);
			if (offline) return offline;
		}
		return new Response('Offline', { status: 503, statusText: 'Offline' });
	}
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;
	if (url.pathname.startsWith('/api/')) return;

	if (SHELL_ASSETS.includes(url.pathname) && url.pathname !== OFFLINE_URL) {
		event.respondWith(
			caches.match(request).then((hit) => hit ?? fetch(request))
		);
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(networkFirst(request, true));
		return;
	}

	if (url.pathname.endsWith('/__data.json')) {
		event.respondWith(networkFirst(request, false));
	}
});
