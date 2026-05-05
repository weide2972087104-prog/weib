(function(){
  'use strict';

  var API = '/api';
  var UPLOADS = '/uploads/';
  var allProducts = [];
  var allTexts = [];
  var editingProductId = null;
  var editingTextId = null;
  var selectedImageFile = null;
  var confirmCallback = null;

  var $ = function(s){return document.querySelector(s)};
  var $$ = function(s){return document.querySelectorAll(s)};

  var dom = {
    statProducts: $('#statProducts'),
    statCategories: $('#statCategories'),
    statTexts: $('#statTexts'),
    productTableBody: $('#productTableBody'),
    textTableBody: $('#textTableBody'),
    productSearch: $('#productSearch'),
    productModal: $('#productModal'),
    productModalTitle: $('#productModalTitle'),
    productName: $('#productName'),
    productCategory: $('#productCategory'),
    productPrice: $('#productPrice'),
    productDesc: $('#productDesc'),
    productImage: $('#productImage'),
    uploadArea: $('#uploadArea'),
    uploadPlaceholder: $('#uploadPlaceholder'),
    uploadPreview: $('#uploadPreview'),
    previewImg: $('#previewImg'),
    uploadRemove: $('#uploadRemove'),
    textModal: $('#textModal'),
    textModalTitle: $('#textModalTitle'),
    textType: $('#textType'),
    textTitle: $('#textTitle'),
    textContent: $('#textContent'),
    confirmModal: $('#confirmModal'),
    confirmMsg: $('#confirmMsg'),
    toast: $('#toast'),
    cursorGlow: $('.cursor-glow')
  };

  function showToast(msg, type){
    dom.toast.textContent = msg;
    dom.toast.className = 'toast show ' + (type || '');
    clearTimeout(dom.toast._t);
    dom.toast._t = setTimeout(function(){dom.toast.classList.remove('show')}, 2500);
  }

  function fetchJSON(url, opts){
    return fetch(url, opts).then(function(r){
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function loadAll(){
    Promise.all([
      fetchJSON(API + '/products'),
      fetchJSON(API + '/texts')
    ]).then(function(results){
      allProducts = results[0] || [];
      allTexts = results[1] || [];
      updateStats();
      renderProductTable();
      renderTextTable();
    }).catch(function(){
      showToast('加载数据失败', 'error');
    });
  }

  function updateStats(){
    dom.statProducts.textContent = allProducts.length;
    var cats = new Set();
    allProducts.forEach(function(p){cats.add(p.category || '未分类')});
    dom.statCategories.textContent = cats.size;
    dom.statTexts.textContent = allTexts.length;

    animateValue(dom.statProducts);
    animateValue(dom.statCategories);
    animateValue(dom.statTexts);
  }

  function animateValue(el){
    var target = parseInt(el.textContent) || 0;
    var current = 0;
    var step = Math.max(1, Math.ceil(target / 20));
    var timer = setInterval(function(){
      current += step;
      if(current >= target){current = target;clearInterval(timer)}
      el.textContent = current;
    }, 30);
  }

  function getFilteredProducts(){
    var query = dom.productSearch.value.trim().toLowerCase();
    if(!query) return allProducts;
    return allProducts.filter(function(p){
      return (p.name || '').toLowerCase().indexOf(query) !== -1 ||
             (p.category || '').toLowerCase().indexOf(query) !== -1;
    });
  }

  function renderProductTable(){
    var filtered = getFilteredProducts();
    if(filtered.length === 0){
      dom.productTableBody.innerHTML = '<tr class="table-empty"><td colspan="5">' +
        '<div class="empty-state"><div class="empty-icon">📭</div><p>暂无产品</p><span>点击"添加产品"开始添加</span></div></td></tr>';
      return;
    }
    dom.productTableBody.innerHTML = filtered.map(function(p){
      var imgHtml;
      if(p.image){
        imgHtml = '<img class="table-img" src="' + UPLOADS + escAttr(p.image) + '" alt="">';
      } else {
        imgHtml = '<div class="table-img-placeholder">📦</div>';
      }
      return '<tr>' +
        '<td>' + imgHtml + '</td>' +
        '<td><strong>' + escHtml(p.name) + '</strong></td>' +
        '<td><span class="table-category">' + escHtml(p.category || '未分类') + '</span></td>' +
        '<td><span class="table-price">¥' + (p.price || 0) + '</span></td>' +
        '<td><div class="table-actions">' +
          '<button class="btn btn-secondary btn-sm btn-edit-product" data-id="' + p.id + '">编辑</button>' +
          '<button class="btn btn-danger btn-sm btn-delete-product" data-id="' + p.id + '">删除</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');

    dom.productTableBody.querySelectorAll('.btn-edit-product').forEach(function(btn){
      btn.addEventListener('click', function(e){e.stopPropagation();openProductModal(parseInt(btn.getAttribute('data-id')))});
    });
    dom.productTableBody.querySelectorAll('.btn-delete-product').forEach(function(btn){
      btn.addEventListener('click', function(e){e.stopPropagation();confirmDeleteProduct(parseInt(btn.getAttribute('data-id')))});
    });
  }

  function renderTextTable(){
    if(allTexts.length === 0){
      dom.textTableBody.innerHTML = '<tr class="table-empty"><td colspan="4">' +
        '<div class="empty-state"><div class="empty-icon">📝</div><p>暂无文本</p><span>点击"添加文本"开始添加</span></div></td></tr>';
      return;
    }
    dom.textTableBody.innerHTML = allTexts.map(function(t){
      return '<tr>' +
        '<td><span class="table-text-type">' + escHtml(t.type || '公告') + '</span></td>' +
        '<td><strong>' + escHtml(t.title || '') + '</strong></td>' +
        '<td><span class="table-text-content">' + escHtml(t.content || '') + '</span></td>' +
        '<td><div class="table-actions">' +
          '<button class="btn btn-secondary btn-sm btn-edit-text" data-id="' + t.id + '">编辑</button>' +
          '<button class="btn btn-danger btn-sm btn-delete-text" data-id="' + t.id + '">删除</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');

    dom.textTableBody.querySelectorAll('.btn-edit-text').forEach(function(btn){
      btn.addEventListener('click', function(e){e.stopPropagation();openTextModal(parseInt(btn.getAttribute('data-id')))});
    });
    dom.textTableBody.querySelectorAll('.btn-delete-text').forEach(function(btn){
      btn.addEventListener('click', function(e){e.stopPropagation();confirmDeleteText(parseInt(btn.getAttribute('data-id')))});
    });
  }

  function openProductModal(id){
    editingProductId = id || null;
    selectedImageFile = null;
    dom.productModalTitle.textContent = id ? '编辑产品' : '添加产品';
    dom.productName.value = '';
    dom.productCategory.value = '';
    dom.productPrice.value = '';
    dom.productDesc.value = '';
    dom.productImage.value = '';
    dom.uploadPlaceholder.style.display = 'flex';
    dom.uploadPreview.style.display = 'none';
    dom.previewImg.src = '';

    if(id){
      var product = allProducts.find(function(p){return p.id === id});
      if(product){
        dom.productName.value = product.name || '';
        dom.productCategory.value = product.category || '';
        dom.productPrice.value = product.price || '';
        dom.productDesc.value = product.description || '';
        if(product.image){
          dom.uploadPlaceholder.style.display = 'none';
          dom.uploadPreview.style.display = 'inline-block';
          dom.previewImg.src = UPLOADS + product.image;
        }
      }
    }
    openModal(dom.productModal);
  }

  function closeProductModal(){
    closeModal(dom.productModal);
    editingProductId = null;
    selectedImageFile = null;
  }

  function saveProduct(){
    var name = dom.productName.value.trim();
    var category = dom.productCategory.value.trim();
    var price = dom.productPrice.value.trim();

    if(!name){showToast('请输入产品名称', 'error');dom.productName.focus();return}
    if(!category){showToast('请输入产品分类', 'error');dom.productCategory.focus();return}
    if(!price){showToast('请输入产品价格', 'error');dom.productPrice.focus();return}

    var formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('description', dom.productDesc.value.trim());
    if(selectedImageFile){formData.append('image', selectedImageFile)}

    var url, method;
    if(editingProductId){
      url = API + '/products/' + editingProductId;
      method = 'PUT';
    } else {
      url = API + '/products';
      method = 'POST';
    }

    fetch(url, {method: method, body: formData}).then(function(r){
      if(!r.ok) throw new Error('保存失败');
      return r.json();
    }).then(function(){
      closeProductModal();
      showToast(editingProductId ? '产品已更新' : '产品已添加', 'success');
      loadAll();
    }).catch(function(){
      showToast('保存失败，请重试', 'error');
    });
  }

  function confirmDeleteProduct(id){
    var product = allProducts.find(function(p){return p.id === id});
    dom.confirmMsg.textContent = '确定要删除产品 "' + (product ? product.name : '') + '" 吗？此操作不可撤销。';
    confirmCallback = function(){
      fetch(API + '/products/' + id, {method: 'DELETE'}).then(function(r){
        if(!r.ok) throw new Error('删除失败');
        return r.json();
      }).then(function(){
        closeModal(dom.confirmModal);
        showToast('产品已删除', 'success');
        loadAll();
      }).catch(function(){
        showToast('删除失败', 'error');
      });
    };
    openModal(dom.confirmModal);
  }

  function openTextModal(id){
    editingTextId = id || null;
    dom.textModalTitle.textContent = id ? '编辑文本' : '添加文本';
    dom.textType.value = '公告';
    dom.textTitle.value = '';
    dom.textContent.value = '';

    if(id){
      var text = allTexts.find(function(t){return t.id === id});
      if(text){
        dom.textType.value = text.type || '公告';
        dom.textTitle.value = text.title || '';
        dom.textContent.value = text.content || '';
      }
    }
    openModal(dom.textModal);
  }

  function closeTextModal(){
    closeModal(dom.textModal);
    editingTextId = null;
  }

  function saveText(){
    var type = dom.textType.value;
    var title = dom.textTitle.value.trim();
    var content = dom.textContent.value.trim();

    if(!title){showToast('请输入文本标题', 'error');dom.textTitle.focus();return}
    if(!content){showToast('请输入文本内容', 'error');dom.textContent.focus();return}

    var body = JSON.stringify({type: type, title: title, content: content});
    var url, method;
    if(editingTextId){
      url = API + '/texts/' + editingTextId;
      method = 'PUT';
    } else {
      url = API + '/texts';
      method = 'POST';
    }

    fetch(url, {method: method, headers: {'Content-Type':'application/json'}, body: body}).then(function(r){
      if(!r.ok) throw new Error('保存失败');
      return r.json();
    }).then(function(){
      closeTextModal();
      showToast(editingTextId ? '文本已更新' : '文本已添加', 'success');
      loadAll();
    }).catch(function(){
      showToast('保存失败，请重试', 'error');
    });
  }

  function confirmDeleteText(id){
    var text = allTexts.find(function(t){return t.id === id});
    dom.confirmMsg.textContent = '确定要删除文本 "' + (text ? text.title : '') + '" 吗？此操作不可撤销。';
    confirmCallback = function(){
      fetch(API + '/texts/' + id, {method: 'DELETE'}).then(function(r){
        if(!r.ok) throw new Error('删除失败');
        return r.json();
      }).then(function(){
        closeModal(dom.confirmModal);
        showToast('文本已删除', 'success');
        loadAll();
      }).catch(function(){
        showToast('删除失败', 'error');
      });
    };
    openModal(dom.confirmModal);
  }

  function openModal(modalEl){modalEl.classList.add('active');document.body.style.overflow='hidden'}
  function closeModal(modalEl){modalEl.classList.remove('active');document.body.style.overflow=''}

  function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function escAttr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  function initEvents(){
    $('#btnAddProduct').addEventListener('click', function(){openProductModal(null)});
    $('#btnAddText').addEventListener('click', function(){openTextModal(null)});

    dom.productSearch.addEventListener('input', function(){renderProductTable()});

    dom.uploadArea.addEventListener('click', function(){dom.productImage.click()});
    dom.productImage.addEventListener('change', function(){
      var file = dom.productImage.files[0];
      if(!file) return;
      selectedImageFile = file;
      var reader = new FileReader();
      reader.onload = function(e){
        dom.uploadPlaceholder.style.display = 'none';
        dom.uploadPreview.style.display = 'inline-block';
        dom.previewImg.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
    dom.uploadRemove.addEventListener('click', function(e){
      e.stopPropagation();
      selectedImageFile = null;
      dom.productImage.value = '';
      dom.uploadPlaceholder.style.display = 'flex';
      dom.uploadPreview.style.display = 'none';
      dom.previewImg.src = '';
    });

    $('#btnSaveProduct').addEventListener('click', saveProduct);
    $('#btnSaveText').addEventListener('click', saveText);

    $('#btnConfirm').addEventListener('click', function(){
      if(confirmCallback) confirmCallback();
    });

    $$('.tab').forEach(function(tab){
      tab.addEventListener('click', function(){
        $$('.tab').forEach(function(t){t.classList.remove('active')});
        tab.classList.add('active');
        var target = tab.getAttribute('data-tab');
        $$('.tab-content').forEach(function(c){c.classList.remove('active')});
        if(target === 'products') $('#tabProducts').classList.add('active');
        if(target === 'texts') $('#tabTexts').classList.add('active');
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(function(overlay){
      overlay.addEventListener('click', function(){
        var modal = overlay.closest('.modal');
        if(modal === dom.productModal) closeProductModal();
        else if(modal === dom.textModal) closeTextModal();
        else if(modal === dom.confirmModal) closeModal(dom.confirmModal);
      });
    });

    document.querySelectorAll('.modal-close-btn, .modal-cancel-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        var modal = btn.closest('.modal');
        if(modal === dom.productModal) closeProductModal();
        else if(modal === dom.textModal) closeTextModal();
        else if(modal === dom.confirmModal) closeModal(dom.confirmModal);
      });
    });

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        if(dom.productModal.classList.contains('active')) closeProductModal();
        else if(dom.textModal.classList.contains('active')) closeTextModal();
        else if(dom.confirmModal.classList.contains('active')) closeModal(dom.confirmModal);
      }
    });

    document.addEventListener('mousemove', function(e){
      dom.cursorGlow.style.left = e.clientX + 'px';
      dom.cursorGlow.style.top = e.clientY + 'px';
      dom.cursorGlow.style.opacity = '1';
    });
    document.addEventListener('mouseleave', function(){dom.cursorGlow.style.opacity = '0'});
  }

  function init(){
    initEvents();
    loadAll();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
