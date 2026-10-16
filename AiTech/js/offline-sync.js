/**
 * IREME Offline Sync Queue
 * Stores pending actions in localStorage and replays them when online.
 * Exposes a global IremeSync object.
 */
var IremeSync = (function () {
    var STORAGE_KEY = 'ireme_sync_queue';
    var MAX_RETRIES = 3;
    var SYNC_INTERVAL_MS = 30000;

    var _statusIndicator = null;
    var _syncTimer = null;

    /* ---- Storage helpers ---- */

    function _readQueue() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.error('sync read error:', err);
            return [];
        }
    }

    function _writeQueue(queue) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        } catch (err) {
            console.error('sync write error:', err);
        }
    }

    function _generateId() {
        return 'sq_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    }

    /* ---- Status indicator ---- */

    function _updateIndicator() {
        if (!_statusIndicator) {
            _statusIndicator = document.getElementById('sync-indicator');
        }
        if (!_statusIndicator) {
            return;
        }
        var pending = _readQueue().filter(function (item) {
            return item.status === 'pending';
        });
        var count = pending.length;

        if (count === 0) {
            _statusIndicator.style.display = 'none';
        } else {
            _statusIndicator.style.display = 'inline-flex';
            var badge = _statusIndicator.querySelector('.sync-count');
            if (badge) {
                badge.textContent = count;
            }
        }
    }

    /* ---- API replay ---- */

    function _replayAction(item) {
        var url = '';
        var method = 'POST';
        var headers = { 'Content-Type': 'application/json' };

        switch (item.type) {
            case 'assessment_submit':
                url = '/api/assessments/submit';
                break;
            case 'progress_update':
                url = '/api/progress/update';
                method = 'PUT';
                break;
            case 'ai_message':
                url = '/api/ai/messages';
                break;
            case 'game_result':
                url = '/api/games/result';
                break;
            default:
                url = '/api/sync/generic';
                break;
        }

        return fetch(url, {
            method: method,
            credentials: 'include',
            headers: headers,
            body: JSON.stringify(item.payload)
        }).then(function (response) {
            if (!response.ok) {
                var error = new Error('Sync failed: ' + response.status);
                error.status = response.status;
                throw error;
            }
            return response.json().catch(function () { return {}; });
        });
    }

    /* ---- Public API ---- */

    /**
     * Add an action to the sync queue.
     * @param {string} type - Action type (assessment_submit, progress_update, ai_message, game_result)
     * @param {object} payload - Data to send when synced
     * @returns {string} The id of the queued entry
     */
    function enqueue(type, payload) {
        var queue = _readQueue();
        var entry = {
            id: _generateId(),
            type: type,
            payload: payload,
            timestamp: Date.now(),
            retryCount: 0,
            status: 'pending'
        };
        queue.push(entry);
        _writeQueue(queue);
        _updateIndicator();

        /* Attempt immediate sync if online */
        if (navigator.onLine) {
            _drain();
        }
        return entry.id;
    }

    /**
     * Return all pending items in the queue.
     * @returns {Array}
     */
    function getPending() {
        return _readQueue().filter(function (item) {
            return item.status === 'pending';
        });
    }

    /**
     * Return current sync status summary.
     * @returns {object} { pending, syncing, failed, total }
     */
    function getStatus() {
        var queue = _readQueue();
        var pending = 0;
        var syncing = 0;
        var failed = 0;
        for (var i = 0; i < queue.length; i++) {
            if (queue[i].status === 'pending') pending++;
            else if (queue[i].status === 'syncing') syncing++;
            else if (queue[i].status === 'failed') failed++;
        }
        return {
            pending: pending,
            syncing: syncing,
            failed: failed,
            total: queue.length
        };
    }

    /**
     * Drain the queue: replay all pending actions against the API.
     * @returns {Promise}
     */
    function sync() {
        return _drain();
    }

    function _drain() {
        var queue = _readQueue();
        var pending = queue.filter(function (item) {
            return item.status === 'pending';
        });

        if (pending.length === 0) {
            _updateIndicator();
            return Promise.resolve();
        }

        /* Mark all pending as syncing */
        pending.forEach(function (item) {
            item.status = 'syncing';
        });
        _writeQueue(queue);
        _updateIndicator();

        var promises = pending.map(function (item) {
            return _replayAction(item).then(function () {
                /* Success: remove from queue */
                return { id: item.id, success: true };
            }).catch(function (err) {
                console.error('sync replay error:', err);
                return { id: item.id, success: false, error: err };
            });
        });

        return Promise.all(promises).then(function (results) {
            var currentQueue = _readQueue();
            var successIds = {};
            var retryIds = {};

            results.forEach(function (result) {
                if (result.success) {
                    successIds[result.id] = true;
                } else {
                    retryIds[result.id] = true;
                }
            });

            var newQueue = currentQueue.filter(function (item) {
                /* Remove successful items */
                if (successIds[item.id]) {
                    return false;
                }
                /* Handle failed items */
                if (retryIds[item.id]) {
                    item.retryCount = (item.retryCount || 0) + 1;
                    if (item.retryCount >= MAX_RETRIES) {
                        item.status = 'failed';
                        console.error('sync max retries reached for:', item.id);
                    } else {
                        item.status = 'pending';
                    }
                }
                return true;
            });

            _writeQueue(newQueue);
            _updateIndicator();
        });
    }

    /* ---- Event listeners ---- */

    window.addEventListener('online', function () {
        _drain();
    });

    /* Periodic sync attempt */
    _syncTimer = setInterval(function () {
        if (navigator.onLine) {
            _drain();
        }
    }, SYNC_INTERVAL_MS);

    /* Update indicator on load */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _updateIndicator);
    } else {
        _updateIndicator();
    }

    return {
        enqueue: enqueue,
        getPending: getPending,
        sync: sync,
        getStatus: getStatus
    };
})();
