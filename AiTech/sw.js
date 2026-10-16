/**
 * IREME Service Worker
 * Provides offline caching and fallback for the education platform.
 */
var CACHE_VERSION = 'ireme-v1';

var STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/css/style.css',
    '/css/bootstrap.min.css',
    '/js/main.js',
    '/js/config.js',
    '/js/api-client.js',
    '/js/auth.js',
    '/js/components.js',
    '/js/i18n.js',
    '/js/offline-sync.js',
    '/img/ireme-icon.png',
    '/img/hero-img.png',
    '/img/about-img.jpg',
    '/lib/animate/animate.min.css',
    '/lib/animate/animate.css',
    '/lib/wow/wow.min.js',
    '/lib/easing/easing.min.js',
    '/lib/waypoints/waypoints.min.js'
];

var API_CACHE_PREFIX = '/api/';

/* Install: pre-cache static assets */
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(function (cache) {
            return cache.addAll(STATIC_ASSETS);
        }).catch(function (err) {
            console.error('sw install error:', err);
        })
    );
    self.skipWaiting();
});

/* Activate: clean old caches, claim clients immediately */
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names.filter(function (name) {
                    return name !== CACHE_VERSION;
                }).map(function (name) {
                    return caches.delete(name);
                })
            );
        }).catch(function (err) {
            console.error('sw activate error:', err);
        })
    );
    self.clients.claim();
});

/* Fetch: route-based strategy selection */
self.addEventListener('fetch', function (event) {
    var request = event.request;

    /* Only handle GET requests */
    if (request.method !== 'GET') {
        return;
    }

    var url;
    try {
        url = new URL(request.url);
    } catch (e) {
        return;
    }

    /* API requests: network-first with cache fallback */
    if (url.pathname.indexOf(API_CACHE_PREFIX) === 0) {
        event.respondWith(networkFirstWithCache(request));
        return;
    }

    /* Static assets: cache-first with network fallback then offline page */
    event.respondWith(cacheFirstWithOffline(request));
});

/**
 * Network-first strategy for API calls.
 * Tries the network, falls back to cache if offline or network fails.
 */
function networkFirstWithCache(request) {
    return fetch(request).then(function (response) {
        /* Only cache successful responses */
        if (response && response.status === 200) {
            var copy = response.clone();
            caches.open(CACHE_VERSION).then(function (cache) {
                cache.put(request, copy);
            });
        }
        return response;
    }).catch(function () {
        return caches.match(request).then(function (cached) {
            if (cached) {
                return cached;
            }
            /* Return a minimal JSON error for API calls with no cache */
            return new Response(
                JSON.stringify({ error: 'offline', message: 'You are offline and no cached data is available.' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        });
    });
}

/**
 * Cache-first strategy for static assets.
 * Serves from cache if available, otherwise fetches from network.
 * Falls back to offline page for navigation requests.
 */
function cacheFirstWithOffline(request) {
    return caches.match(request).then(function (cached) {
        if (cached) {
            return cached;
        }
        return fetch(request).catch(function () {
            /* For navigation requests, serve the offline page */
            if (request.mode === 'navigate') {
                return caches.match('/offline.html');
            }
            /* For other assets (images, etc.) return empty response */
            return new Response('', { status: 404, statusText: 'Not Found' });
        });
    });
}
