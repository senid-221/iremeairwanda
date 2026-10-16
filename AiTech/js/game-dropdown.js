/**
 * IremeDropdown — Searchable scrolling dropdown component
 * Usage: IremeDropdown.create(containerEl, options)
 * options: { placeholder, searchPlaceholder, items:[{value,label,sublabel,icon}], onChange(value,item), maxHeight, emptyText, loadingText }
 */
var IremeDropdown = {
    instances: {},
    counter: 0,

    create: function(container, opts) {
        if (!container) return null;
        var id = 'idd_' + (++this.counter);
        opts = opts || {};
        var placeholder = opts.placeholder || 'Select...';
        var searchPlaceholder = opts.searchPlaceholder || 'Search...';
        var maxHeight = opts.maxHeight || '220px';
        var emptyText = opts.emptyText || 'No items found';
        var loadingText = opts.loadingText || 'Loading...';
        var items = opts.items || [];
        var onChange = opts.onChange || function() {};
        var multiSelect = opts.multiSelect || false;

        container.classList.add('ireme-dropdown');
        container.innerHTML =
            '<div class="idd-trigger" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">' +
                '<span class="idd-value">' + placeholder + '</span>' +
                '<i class="idd-arrow fa fa-chevron-down"></i>' +
            '</div>' +
            '<div class="idd-panel" style="max-height:' + maxHeight + '">' +
                '<div class="idd-search-wrap">' +
                    '<i class="fa fa-search idd-search-icon"></i>' +
                    '<input type="text" class="idd-search" placeholder="' + searchPlaceholder + '" autocomplete="off" />' +
                    '<button class="idd-clear" type="button" style="display:none"><i class="fa fa-times"></i></button>' +
                '</div>' +
                '<ul class="idd-list" role="listbox"></ul>' +
                '<div class="idd-empty" style="display:none">' + emptyText + '</div>' +
                '<div class="idd-loading" style="display:none"><i class="fa fa-spinner fa-spin"></i> ' + loadingText + '</div>' +
            '</div>';

        var trigger = container.querySelector('.idd-trigger');
        var panel = container.querySelector('.idd-panel');
        var list = container.querySelector('.idd-list');
        var searchInput = container.querySelector('.idd-search');
        var clearBtn = container.querySelector('.idd-clear');
        var emptyEl = container.querySelector('.idd-empty');
        var loadingEl = container.querySelector('.idd-loading');
        var valueEl = container.querySelector('.idd-value');
        var arrowEl = container.querySelector('.idd-arrow');

        var instance = {
            id: id, container: container, trigger: trigger, panel: panel, list: list,
            searchInput: searchInput, clearBtn: clearBtn, emptyEl: emptyEl, loadingEl: loadingEl,
            valueEl: valueEl, arrowEl: arrowEl, items: items, selectedValue: null,
            placeholder: placeholder, onChange: onChange, opts: opts
        };

        this.instances[id] = instance;
        this._renderList(instance);
        this._bindEvents(instance);
        return instance;
    },

    setItems: function(instance, items) {
        instance.items = items;
        instance.searchInput.value = '';
        instance.clearBtn.style.display = 'none';
        this._renderList(instance);
        if (instance.selectedValue) {
            var found = items.find(function(it) { return it.value === instance.selectedValue; });
            if (!found) {
                instance.selectedValue = null;
                instance.valueEl.textContent = instance.placeholder;
                instance.valueEl.classList.remove('idd-has-value');
            }
        }
    },

    setLoading: function(instance, loading) {
        instance.list.style.display = loading ? 'none' : '';
        instance.emptyEl.style.display = 'none';
        instance.loadingEl.style.display = loading ? '' : 'none';
    },

    setValue: function(instance, value) {
        var item = instance.items.find(function(it) { return it.value === value; });
        if (item) this._selectItem(instance, item);
    },

    getValue: function(instance) {
        return instance.selectedValue;
    },

    close: function(instance) {
        instance.panel.classList.remove('idd-open');
        instance.trigger.setAttribute('aria-expanded', 'false');
        instance.arrowEl.classList.remove('idd-rotated');
    },

    open: function(instance) {
        this._closeAll(instance);
        instance.panel.classList.add('idd-open');
        instance.trigger.setAttribute('aria-expanded', 'true');
        instance.arrowEl.classList.add('idd-rotated');
        setTimeout(function() { instance.searchInput.focus(); }, 50);
    },

    _closeAll: function(except) {
        var self = this;
        Object.keys(this.instances).forEach(function(k) {
            var inst = self.instances[k];
            if (inst !== except) self.close(inst);
        });
    },

    _selectItem: function(instance, item) {
        instance.selectedValue = item.value;
        instance.valueEl.textContent = item.label;
        instance.valueEl.classList.add('idd-has-value');
        var lis = instance.list.querySelectorAll('li');
        lis.forEach(function(li) { li.classList.toggle('idd-selected', li.dataset.value === String(item.value)); });
        instance.onChange(item.value, item);
        this.close(instance);
    },

    _renderList: function(instance) {
        var items = instance.items;
        var query = (instance.searchInput.value || '').toLowerCase().trim();
        if (query) {
            items = items.filter(function(it) {
                return it.label.toLowerCase().indexOf(query) !== -1 ||
                       (it.sublabel && it.sublabel.toLowerCase().indexOf(query) !== -1) ||
                       (it.searchText && it.searchText.toLowerCase().indexOf(query) !== -1);
            });
        }
        if (items.length === 0) {
            instance.list.style.display = 'none';
            instance.emptyEl.style.display = '';
            return;
        }
        instance.list.style.display = '';
        instance.emptyEl.style.display = 'none';

        var html = '';
        items.forEach(function(item) {
            var sel = instance.selectedValue === item.value ? ' idd-selected' : '';
            html += '<li class="' + sel + '" data-value="' + item.value + '" role="option">' +
                (item.icon ? '<i class="' + item.icon + ' idd-item-icon"></i>' : '') +
                '<span class="idd-item-text"><span class="idd-item-label">' + item.label + '</span>' +
                (item.sublabel ? '<span class="idd-item-sublabel">' + item.sublabel + '</span>' : '') +
                '</span>' +
                (instance.selectedValue === item.value ? '<i class="fa fa-check idd-item-check"></i>' : '') +
                '</li>';
        });
        instance.list.innerHTML = html;

        var self = this;
        instance.list.querySelectorAll('li').forEach(function(li) {
            li.addEventListener('click', function() {
                var val = li.dataset.value;
                var found = instance.items.find(function(it) { return String(it.value) === val; });
                if (found) self._selectItem(instance, found);
            });
        });
    },

    _bindEvents: function(instance) {
        var self = this;

        instance.trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            if (instance.panel.classList.contains('idd-open')) {
                self.close(instance);
            } else {
                self.open(instance);
            }
        });

        instance.trigger.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                instance.trigger.click();
            }
        });

        instance.searchInput.addEventListener('input', function() {
            instance.clearBtn.style.display = instance.searchInput.value ? '' : 'none';
            self._renderList(instance);
        });

        instance.clearBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            instance.searchInput.value = '';
            instance.clearBtn.style.display = 'none';
            self._renderList(instance);
            instance.searchInput.focus();
        });

        instance.list.addEventListener('click', function(e) { e.stopPropagation(); });
        instance.searchInput.addEventListener('click', function(e) { e.stopPropagation(); });

        document.addEventListener('click', function(e) {
            if (!instance.container.contains(e.target)) {
                self.close(instance);
            }
        });
    }
};
