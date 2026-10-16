/**
 * IremeLocation — Cascading Rwanda location selector component.
 *
 * Usage:
 *   IremeLocation.init('container-id', { required: true, onChange: fn });
 *   var sel = IremeLocation.getSelection('container-id');
 *   IremeLocation.setSelection('container-id', { provinceId: '...', ... });
 *   var valid = IremeLocation.validate('container-id');
 */
var IremeLocation = (function () {
  var BASE_URL = (typeof window !== 'undefined' && window.IREME_API_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL) || '';

  var instances = {};

  /* ------------------------------------------------------------------ */
  /*  HTTP helper                                                        */
  /* ------------------------------------------------------------------ */
  function apiGet(path) {
    return fetch(BASE_URL + path, { credentials: 'include' })
      .then(function (r) { return r.json(); });
  }

  /* ------------------------------------------------------------------ */
  /*  Build a single searchable dropdown                                 */
  /* ------------------------------------------------------------------ */
  function createDropdown(instanceId, level, label, placeholder) {
    var wrap = document.createElement('div');
    wrap.className = 'location-dropdown';
    wrap.setAttribute('data-level', level);
    wrap.innerHTML =
      '<label class="form-label fw-bold small">' + label + '</label>' +
      '<div class="location-dropdown-inner position-relative">' +
        '<input type="text" class="form-control location-search" placeholder="' + placeholder + '" autocomplete="off" />' +
        '<input type="hidden" class="location-value" data-level="' + level + '" />' +
        '<span class="location-spinner position-absolute d-none" style="right:12px;top:50%;transform:translateY(-50%);">' +
          '<span class="spinner-border spinner-border-sm text-primary" role="status"></span>' +
        '</span>' +
        '<ul class="location-options list-group position-absolute w-100 d-none" style="z-index:1050;max-height:220px;overflow-y:auto;"></ul>' +
      '</div>';
    return wrap;
  }

  /* ------------------------------------------------------------------ */
  /*  Populate options list for a dropdown                               */
  /* ------------------------------------------------------------------ */
  function populateOptions(dd, items) {
    var ul = dd.querySelector('.location-options');
    ul.innerHTML = '';
    if (!items || items.length === 0) {
      ul.innerHTML = '<li class="location-option list-group-item text-muted small px-3 py-2">No options</li>';
      ul.classList.remove('d-none');
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'location-option list-group-item px-3 py-2';
      li.setAttribute('data-id', item.id);
      li.setAttribute('data-name', item.nameEn || item.name);
      li.textContent = item.nameEn || item.name;
      li.addEventListener('click', function () {
        selectOption(dd, item);
      });
      ul.appendChild(li);
    });
    ul.classList.remove('d-none');
  }

  function selectOption(dd, item) {
    var input = dd.querySelector('.location-search');
    var hidden = dd.querySelector('.location-value');
    input.value = item.nameEn || item.name;
    hidden.value = item.id;
    dd.querySelector('.location-options').classList.add('d-none');

    // Mark selected
    var opts = dd.querySelectorAll('.location-option');
    opts.forEach(function (o) { o.classList.remove('selected'); });
    var clicked = dd.querySelector('.location-option[data-id="' + item.id + '"]');
    if (clicked) clicked.classList.add('selected');

    // Dispatch change event on the container
    var container = dd.closest('.location-group');
    if (container) {
      var evt = new CustomEvent('location-change', { detail: { level: dd.getAttribute('data-level'), id: item.id, name: item.nameEn || item.name } });
      container.dispatchEvent(evt);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Filter options as user types                                       */
  /* ------------------------------------------------------------------ */
  function attachSearch(dd) {
    var input = dd.querySelector('.location-search');
    var ul = dd.querySelector('.location-options');
    var allItems = [];

    dd._setItems = function (items) {
      allItems = items || [];
      dd._allItems = allItems;
      populateOptions(dd, allItems);
    };

    input.addEventListener('focus', function () {
      if (allItems.length > 0 || ul.children.length > 0) {
        ul.classList.remove('d-none');
      }
    });

    input.addEventListener('input', function () {
      var q = this.value.toLowerCase().trim();
      var hidden = dd.querySelector('.location-value');
      hidden.value = '';
      if (!q) {
        populateOptions(dd, allItems);
        return;
      }
      var filtered = allItems.filter(function (item) {
        return (item.nameEn || item.name || '').toLowerCase().indexOf(q) !== -1;
      });
      populateOptions(dd, filtered);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) {
        ul.classList.add('d-none');
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Show / hide spinner                                                */
  /* ------------------------------------------------------------------ */
  function showSpinner(dd) {
    var sp = dd.querySelector('.location-spinner');
    if (sp) sp.classList.remove('d-none');
  }
  function hideSpinner(dd) {
    var sp = dd.querySelector('.location-spinner');
    if (sp) sp.classList.add('d-none');
  }

  /* ------------------------------------------------------------------ */
  /*  Clear a dropdown and all dependents                                */
  /* ------------------------------------------------------------------ */
  function clearDropdown(dd) {
    var input = dd.querySelector('.location-search');
    var hidden = dd.querySelector('.location-value');
    input.value = '';
    hidden.value = '';
    dd._setItems([]);
    dd.querySelector('.location-options').classList.add('d-none');
  }

  /* ------------------------------------------------------------------ */
  /*  Cascade logic                                                      */
  /* ------------------------------------------------------------------ */
  var levelOrder = ['province', 'district', 'sector', 'cell', 'village'];
  var levelLabels = {
    province: 'Province',
    district: 'District',
    sector: 'Sector',
    cell: 'Cell',
    village: 'Village'
  };
  var levelPlaceholders = {
    province: 'Search province...',
    district: 'Search district...',
    sector: 'Search sector...',
    cell: 'Search cell...',
    village: 'Search village...'
  };
  var levelEndpoints = {
    province: '/api/locations/provinces',
    district: '/api/locations/districts',
    sector: '/api/locations/sectors',
    cell: '/api/locations/cells',
    village: '/api/locations/villages'
  };
  var levelParentParam = {
    province: null,
    district: 'provinceId',
    sector: 'districtId',
    cell: 'sectorId',
    village: 'cellId'
  };

  function loadOptions(inst, level) {
    var dd = inst.dropdowns[level];
    var parentParam = levelParentParam[level];
    var url = levelEndpoints[level];

    if (parentParam) {
      var parentLevel = levelOrder[levelOrder.indexOf(level) - 1];
      var parentDd = inst.dropdowns[parentLevel];
      var parentId = parentDd.querySelector('.location-value').value;
      if (!parentId) {
        clearDropdown(dd);
        return Promise.resolve();
      }
      url += '?' + parentParam + '=' + encodeURIComponent(parentId);
    }

    showSpinner(dd);
    return apiGet(url).then(function (data) {
      hideSpinner(dd);
      dd._setItems(data.items || []);
    }).catch(function () {
      hideSpinner(dd);
      dd._setItems([]);
    });
  }

  function onLevelChange(inst, level) {
    var idx = levelOrder.indexOf(level);
    // Clear all dependent levels
    for (var i = idx + 1; i < levelOrder.length; i++) {
      clearDropdown(inst.dropdowns[levelOrder[i]]);
    }
    // Load next level
    if (idx + 1 < levelOrder.length) {
      loadOptions(inst, levelOrder[idx + 1]);
    }
    // Fire onChange callback
    if (inst.options.onChange) {
      inst.options.onChange(getSelection(inst.containerId));
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */
  function init(containerId, options) {
    options = options || {};
    var container = document.getElementById(containerId);
    if (!container) {
      console.error('IremeLocation: container not found:', containerId);
      return;
    }

    container.innerHTML = '';
    container.className = 'location-group';

    var inst = {
      containerId: containerId,
      options: options,
      dropdowns: {}
    };

    levelOrder.forEach(function (level) {
      var dd = createDropdown(containerId, level, levelLabels[level], levelPlaceholders[level]);
      container.appendChild(dd);
      attachSearch(dd);
      inst.dropdowns[level] = dd;
    });

    // Listen for cascade changes
    container.addEventListener('location-change', function (e) {
      onLevelChange(inst, e.detail.level);
    });

    instances[containerId] = inst;

    // Load provinces initially
    loadOptions(inst, 'province');

    // If initial values provided, set them after a tick
    if (options.initial) {
      setTimeout(function () {
        setSelection(containerId, options.initial);
      }, 100);
    }
  }

  function getSelection(containerId) {
    var inst = instances[containerId];
    if (!inst) return {};
    var sel = {};
    levelOrder.forEach(function (level) {
      var dd = inst.dropdowns[level];
      sel[level + 'Id'] = dd.querySelector('.location-value').value || null;
      sel[level + 'Name'] = dd.querySelector('.location-search').value || null;
    });
    return sel;
  }

  function setSelection(containerId, ids) {
    var inst = instances[containerId];
    if (!inst) return;

    // We need to cascade-load each level sequentially
    function loadAndSelect(idx) {
      if (idx >= levelOrder.length) return;
      var level = levelOrder[idx];
      var idKey = level + 'Id';
      var targetId = ids[idKey];

      loadOptions(inst, level).then(function () {
        if (targetId) {
          var dd = inst.dropdowns[level];
          var items = dd._allItems || [];
          // Find the item in the loaded data
          var ul = dd.querySelector('.location-options');
          var li = ul.querySelector('[data-id="' + targetId + '"]');
          if (li) {
            var item = { id: targetId, nameEn: li.getAttribute('data-name') };
            selectOption(dd, item);
          }
        }
        loadAndSelect(idx + 1);
      });
    }

    loadAndSelect(0);
  }

  function validate(containerId) {
    var inst = instances[containerId];
    if (!inst) return false;
    if (!inst.options.required) return true;

    var valid = true;
    levelOrder.forEach(function (level) {
      var dd = inst.dropdowns[level];
      var hidden = dd.querySelector('.location-value');
      var wrap = dd.querySelector('.location-dropdown-inner');
      if (!hidden.value) {
        valid = false;
        wrap.classList.add('is-invalid');
      } else {
        wrap.classList.remove('is-invalid');
      }
    });
    return valid;
  }

  return {
    init: init,
    getSelection: getSelection,
    setSelection: setSelection,
    validate: validate
  };
})();
