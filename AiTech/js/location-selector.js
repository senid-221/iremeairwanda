/**
 * IremeLocation — Cascading Rwanda location selector component.
 * Uses static data from IremeRwandaAdmin (rwanda-admin.js).
 *
 * Usage:
 *   IremeLocation.init('container-id', { required: true, onChange: fn });
 *   var sel = IremeLocation.getSelection('container-id');
 *   IremeLocation.setSelection('container-id', { province: 'Kigali City', district: 'Gasabo', ... });
 *   var valid = IremeLocation.validate('container-id');
 */
var IremeLocation = (function () {
  var instances = {};
  var levelOrder = ['province', 'district', 'sector', 'cell', 'village'];
  var levelLabels = {
    province: 'Province',
    district: 'District',
    sector: 'Sector (Umurenge)',
    cell: 'Cell (Akagari)',
    village: 'Village (Umudugudu)'
  };
  var levelPlaceholders = {
    province: 'Search province...',
    district: 'Search district...',
    sector: 'Search sector...',
    cell: 'Search cell...',
    village: 'Search village...'
  };

  function getStaticData() {
    return typeof IremeRwandaAdmin !== 'undefined' ? IremeRwandaAdmin : null;
  }

  function getItems(level, context) {
    var data = getStaticData();
    if (!data) return [];
    switch (level) {
      case 'province':
        return data.provinces.map(function (n) { return { name: n }; });
      case 'district':
        return data.getDistricts(context.province).map(function (n) { return { name: n }; });
      case 'sector':
        return data.getSectors(context.province, context.district).map(function (n) { return { name: n }; });
      case 'cell':
        return data.getCells(context.province, context.district, context.sector).map(function (n) { return { name: n }; });
      case 'village':
        return data.getVillages(context.province, context.district, context.sector, context.cell).map(function (n) { return { name: n }; });
      default:
        return [];
    }
  }

  function createContext(inst, upToLevel) {
    var ctx = {};
    for (var i = 0; i < levelOrder.length; i++) {
      var lv = levelOrder[i];
      if (lv === upToLevel) break;
      var dd = inst.dropdowns[lv];
      ctx[lv] = dd.querySelector('.location-search').value || '';
    }
    return ctx;
  }

  function createDropdown(instanceId, level, label, placeholder) {
    var wrap = document.createElement('div');
    wrap.className = 'location-dropdown';
    wrap.setAttribute('data-level', level);
    wrap.innerHTML =
      '<label class="form-label fw-bold small">' + label + '</label>' +
      '<div class="location-dropdown-inner position-relative">' +
        '<input type="text" class="form-control location-search" placeholder="' + placeholder + '" autocomplete="off" />' +
        '<ul class="location-options list-group position-absolute w-100 d-none" style="z-index:1050;max-height:220px;overflow-y:auto;"></ul>' +
      '</div>';
    return wrap;
  }

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
      li.setAttribute('data-name', item.name);
      li.textContent = item.name;
      li.addEventListener('click', function () {
        selectOption(dd, item);
      });
      ul.appendChild(li);
    });
    ul.classList.remove('d-none');
  }

  function selectOption(dd, item) {
    var input = dd.querySelector('.location-search');
    input.value = item.name;
    dd.querySelector('.location-options').classList.add('d-none');

    var opts = dd.querySelectorAll('.location-option');
    opts.forEach(function (o) { o.classList.remove('selected'); });
    var clicked = dd.querySelector('.location-option[data-name="' + item.name + '"]');
    if (clicked) clicked.classList.add('selected');

    var container = dd.closest('.location-group');
    if (container) {
      var evt = new CustomEvent('location-change', {
        detail: { level: dd.getAttribute('data-level'), name: item.name }
      });
      container.dispatchEvent(evt);
    }
  }

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
      if (!q) {
        populateOptions(dd, allItems);
        return;
      }
      var filtered = allItems.filter(function (item) {
        return (item.name || '').toLowerCase().indexOf(q) !== -1;
      });
      populateOptions(dd, filtered);
    });

    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) {
        ul.classList.add('d-none');
      }
    });
  }

  function clearDropdown(dd) {
    var input = dd.querySelector('.location-search');
    input.value = '';
    dd._setItems([]);
    dd.querySelector('.location-options').classList.add('d-none');
  }

  function loadOptions(inst, level) {
    var dd = inst.dropdowns[level];
    var idx = levelOrder.indexOf(level);
    if (idx === 0) {
      dd._setItems(getItems(level, {}));
      return;
    }
    var parentLevel = levelOrder[idx - 1];
    var parentDd = inst.dropdowns[parentLevel];
    var parentName = parentDd.querySelector('.location-search').value;
    if (!parentName) {
      clearDropdown(dd);
      return;
    }
    var ctx = createContext(inst, level);
    dd._setItems(getItems(level, ctx));
  }

  function onLevelChange(inst, level) {
    var idx = levelOrder.indexOf(level);
    for (var i = idx + 1; i < levelOrder.length; i++) {
      clearDropdown(inst.dropdowns[levelOrder[i]]);
    }
    if (idx + 1 < levelOrder.length) {
      loadOptions(inst, levelOrder[idx + 1]);
    }
    if (inst.options.onChange) {
      inst.options.onChange(getSelection(inst.containerId));
    }
  }

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

    container.addEventListener('location-change', function (e) {
      onLevelChange(inst, e.detail.level);
    });

    instances[containerId] = inst;
    loadOptions(inst, 'province');

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
      sel[level] = dd.querySelector('.location-search').value || null;
    });
    return sel;
  }

  function setSelection(containerId, values) {
    var inst = instances[containerId];
    if (!inst) return;

    for (var i = 0; i < levelOrder.length; i++) {
      var level = levelOrder[i];
      var val = values[level];
      if (!val) break;
      var dd = inst.dropdowns[level];
      loadOptions(inst, level);
      var items = dd._allItems || [];
      var match = null;
      for (var j = 0; j < items.length; j++) {
        if (items[j].name === val) { match = items[j]; break; }
      }
      if (match) {
        selectOption(dd, match);
      } else {
        break;
      }
    }
  }

  function validate(containerId) {
    var inst = instances[containerId];
    if (!inst) return false;
    if (!inst.options.required) return true;

    var valid = true;
    levelOrder.forEach(function (level) {
      var dd = inst.dropdowns[level];
      var input = dd.querySelector('.location-search');
      var wrap = dd.querySelector('.location-dropdown-inner');
      if (!input.value) {
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
