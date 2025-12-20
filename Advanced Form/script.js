// ========== 全局状态 ==========
let formFields = JSON.parse(localStorage.getItem('formFields')) || [];
let records = JSON.parse(localStorage.getItem('records')) || [];
let filterRecordsNum = -1;
let editingIndex = -1;
let showAllFilters = false;

// ========== Tab 切换逻辑 ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const target = btn.dataset.tab;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(target).classList.add('active');

    if (target === 'submit-panel') {
      renderDynamicForm();
    } else if (target === 'records-panel') {
        showAllFilters = false; // 收起搜索栏
        filters = {}; // 清空搜索条件
        renderRecordsTable();
    }
  });
});

// ========== 字段类型切换 ==========
document.getElementById('new-field-type').addEventListener('change', function () {
  const container = document.getElementById('dict-input-container');
  container.style.display = this.value === 'dict' ? 'block' : 'none';
});

// ========== 字段操作 ==========
function addField() {
  const name = document.getElementById('new-field-name').value.trim();
  const type = document.getElementById('new-field-type').value;
  if (!name) return alert('请输入字段名');
  if (formFields.some(f => f.name === name)) return alert('字段名不能重复');

  let dictItems = [];
  if (type === 'dict') {
    const dictStr = document.getElementById('new-field-dict').value.trim();
    if (!dictStr) return alert('请填写字典项（用逗号分隔）');
    dictItems = dictStr.split(',').map(s => s.trim()).filter(s => s);
    if (dictItems.length === 0) return alert('字典项不能为空');
  }

  formFields.push({ name, type, dictItems });
  renderFieldList();
  document.getElementById('new-field-name').value = '';
  document.getElementById('new-field-dict').value = '';
}

function deleteField(index) {
  if (!confirm('确定删除字段 "' + formFields[index].name + '" 吗？')) return;
  formFields.splice(index, 1);
  renderFieldList();
  localStorage.setItem('formFields', JSON.stringify(formFields));
}

function renderFieldList() {
  const list = document.getElementById('fields-list');
  list.innerHTML = '';
  formFields.forEach((field, i) => {
    const item = document.createElement('div');
    item.className = 'field-item';

    const indexDiv = document.createElement('div');
    indexDiv.className = 'field-index';
    indexDiv.textContent = i + 1;
    indexDiv.title = '点击修改序号（1-' + formFields.length + '）';
    indexDiv.onclick = () => makeIndexEditable(indexDiv, i);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'field-info';
    let typeLabel = field.type === 'number' ? '数字' : field.type === 'date' ? '日期' : field.type === 'dict' ? '字典' : field.type === 'image' ? '图片' : '文本';
    infoDiv.innerHTML = `
      <span>${field.name}</span>
      <span class="type-tag">${typeLabel}</span>
      ${field.type === 'dict' ? `<span class="dict-preview">${field.dictItems.join(', ')}</span>` : ''}
    `;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'field-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.title = '编辑字段';
    editBtn.textContent = '✎';
    editBtn.onclick = () => openEditModal(i);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.title = '删除字段';
    delBtn.textContent = '×';
    delBtn.onclick = () => deleteField(i);

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(delBtn);

    item.appendChild(indexDiv);
    item.appendChild(infoDiv);
    item.appendChild(actionsDiv);
    list.appendChild(item);
  });
}

function makeIndexEditable(indexDiv, oldIndex) {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = 1;
  input.max = formFields.length;
  input.value = oldIndex + 1;
  input.className = 'field-index editable';
  input.onblur = () => applyNewIndex(input, oldIndex);
  input.onkeydown = (e) => {
    if (e.key === 'Enter') applyNewIndex(input, oldIndex);
    if (e.key === 'Escape') {
      const parent = input.parentElement;
      parent.replaceChild(createIndexSpan(oldIndex), input);
    }
  };
  indexDiv.replaceWith(input);
  input.focus();
  input.select();
}

function createIndexSpan(index) {
  const span = document.createElement('div');
  span.className = 'field-index';
  span.textContent = index + 1;
  span.onclick = () => makeIndexEditable(span, index);
  return span;
}

function applyNewIndex(input, oldIndex) {
  const newIndex = parseInt(input.value, 10) - 1;
  if (isNaN(newIndex) || newIndex < 0 || newIndex >= formFields.length || newIndex === oldIndex) {
    const parent = input.parentElement;
    parent.replaceChild(createIndexSpan(oldIndex), input);
    return;
  }

  const field = formFields.splice(oldIndex, 1)[0];
  formFields.splice(newIndex, 0, field);
  localStorage.setItem('formFields', JSON.stringify(formFields));
  renderFieldList();
}

// ========== 字段编辑弹窗 ==========
function openEditModal(index) {
  const field = formFields[index];
  const body = document.getElementById('edit-modal-body');
  body.innerHTML = `
    <label>
      <span>字段名称</span>
      <input type="text" id="edit-name" value="${field.name}" />
    </label>
    <label>
      <span>字段类型</span>
      <select id="edit-type">
        <option value="text" ${field.type==='text'?'selected':''}>文本</option>
        <option value="image" ${field.type==='image'?'selected':''}>图片</option>
        <option value="dict" ${field.type==='dict'?'selected':''}>数据字典</option>
        <option value="number" ${field.type==='number'?'selected':''}>数字</option>
        <option value="date" ${field.type==='date'?'selected':''}>日期</option>
      </select>
    </label>
    <div id="edit-dict-container" style="display:${field.type==='dict'?'block':'none'};">
      <label>
        <span>字典项（逗号分隔）</span>
        <input type="text" id="edit-dict" value="${field.dictItems?.join(', ') || ''}" />
      </label>
    </div>
  `;

  document.getElementById('edit-type').onchange = (e) => {
    document.getElementById('edit-dict-container').style.display = e.target.value === 'dict' ? 'block' : 'none';
  };

  document.getElementById('confirm-edit-btn').onclick = () => {
    try {
      const name = document.getElementById('edit-name').value.trim();
      const type = document.getElementById('edit-type').value;
      if (!name) throw new Error('字段名不能为空');
      if (formFields.some((f, i) => i !== index && f.name === name)) throw new Error('字段名重复');

      let dictItems = [];
      if (type === 'dict') {
        const dictStr = document.getElementById('edit-dict').value.trim();
        if (!dictStr) throw new Error('请填写字典项');
        dictItems = dictStr.split(',').map(s => s.trim()).filter(Boolean);
        if (dictItems.length === 0) throw new Error('字典项无效');
      }

      formFields[index] = { name, type, dictItems };
      localStorage.setItem('formFields', JSON.stringify(formFields));
      renderFieldList();
      closeEditModal();
    } catch (e) {
      alert(e.message);
    }
  };

  document.getElementById('edit-modal-overlay').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal-overlay').classList.add('hidden');
}

function saveFormDesign() {
  localStorage.setItem('formFields', JSON.stringify(formFields));
  alert('表单设计已保存！');
}

// ========== 动态表单渲染（两列） ==========
function renderDynamicForm(isEdit = false, record = {}) {
  const form = document.getElementById('dynamic-form');
  form.innerHTML = '';
  if (formFields.length === 0) {
    form.innerHTML = '<p class="empty-hint">请先设计表单字段</p>';
    return;
  }

  formFields.forEach((field,index) => {
    const container = document.createElement('div');

    const label = document.createElement('label');
    label.textContent = (index + 1) + '.' + field.name;
    container.appendChild(label);

    if (field.type === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.name = field.name;
      input.onchange = (e) => {
        const preview = container.querySelector('.image-preview');
        if (e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = () => {
            if (!preview) {
              const img = document.createElement('img');
              img.className = 'image-preview';
              img.src = reader.result;
              container.appendChild(img);
            } else {
              preview.src = reader.result;
              preview.style.display = 'block';
            }
          };
          reader.readAsDataURL(e.target.files[0]);
        } else if (preview) {
          preview.style.display = 'none';
        }
      };
      container.appendChild(input);

      if (isEdit && record[field.name]) {
        const img = document.createElement('img');
        img.className = 'image-preview';
        img.src = record[field.name];
        img.style.display = 'block';
        container.appendChild(img);
      }
    } else if (field.type === 'dict') {
      const select = document.createElement('select');
      select.name = field.name;
      const def = document.createElement('option');
      def.value = '';
      def.textContent = '请选择';
      select.appendChild(def);
      field.dictItems.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        if (isEdit && record[field.name] === item) opt.selected = true;
        select.appendChild(opt);
      });
      container.appendChild(select);
    } else if (field.type === 'number'){
      const input = document.createElement('input');
      input.type = 'number';
      input.name = field.name;
      input.value = isEdit ? (record[field.name] || '') : '';
      input.required = true;
      container.appendChild(input);
    } else if (field.type === 'date'){
        const input = document.createElement('input');
        input.type = 'date';
        input.name = field.name;
        input.value = isEdit ? (record[field.name] || '') : '';
        input.required = true;
        container.appendChild(input);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = field.name;
      input.value = isEdit ? (record[field.name] || '') : '';
      input.required = true;
      container.appendChild(input);
    }

    form.appendChild(container);
  });
}

// 生成伪UUID
function generateTimestampUUID() {
    // 获取当前时间戳（毫秒）
    const timestamp = Date.now().toString();
  
    // 生成10位随机字符（字母+数字）
    const randomPart = Array.from({ length: 10 }, () => 
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        .charAt(Math.floor(Math.random() * 62))
    ).join('');
  
    return timestamp + '_' + randomPart;
}

// ========== 提交记录：取消必填校验 ==========
async function submitRecord() {
    const formData = new FormData(document.getElementById('dynamic-form'));
    const record = {};
  
    for (let field of formFields) {
      if (field.type === 'image') {
        const file = formData.get(field.name);
        if (file && file instanceof File) {
          const base64 = await readFileAsBase64(file);
          record[field.name] = base64;
        } else {
          record[field.name] = ''; // 允许为空
        }
      } else {
        record[field.name] = formData.get(field.name) || ''; // 允许为空
      }
    }
    // 添加uuid作为唯一标志
    record['uuid'] = generateTimestampUUID();
  
    // ✅ 不再校验必填
    records.push(record);
    localStorage.setItem('records', JSON.stringify(records));
    document.getElementById('dynamic-form').reset(); // 保存后清空表单
    alert('记录提交成功！');
    updateRecordCount();
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========== 记录表格 ==========
let filters = {};  // 记录搜索条件

// ========== 渲染搜索栏及表头 =====
function renderRecordsTable() {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    const filterDiv = document.getElementById('search-filters');
  
    head.innerHTML = '';
    body.innerHTML = '';
    filterDiv.innerHTML = '';
  
    if (formFields.length === 0) {
      body.innerHTML = '<tr><td>尚未设计表单</td></tr>';
      updateRecordCount();
      return;
    }
  
    // 表头
    const headerRow = document.createElement('tr');
    const indexTh = document.createElement('th');
    indexTh.textContent = '序号';
    headerRow.appendChild(indexTh); // 序号列
    const displayFields = formFields.slice(0, 10); // 只显示前10个字段
    displayFields.forEach(field => {
      const th = document.createElement('th');
      th.textContent = field.name;
      headerRow.appendChild(th);
    });
    const actionTh = document.createElement('th');
    actionTh.textContent = '操作';
    headerRow.appendChild(actionTh); // 操作列
    head.appendChild(headerRow);
  
    // 遍历所有字段，每个都创建对应控件
    const allFields = formFields;
    allFields.forEach((field, idx) => {
        let control;
        if (field.type === 'number') {
            const container = document.createElement('div');
            container.dataset.fieldIndex = idx;
            container.dataset.fieldType = 'div';
            container.style.display = idx < 4 || showAllFilters ? 'flex' : 'none';
            container.dataset.field = field.name;
            container.className = 'range-filter';

            const minInput = document.createElement('input');
            minInput.type = 'number';
            minInput.placeholder = `🔍 最小${field.name}`;
            minInput.dataset.bound = 'min';
          
            const maxInput = document.createElement('input');
            maxInput.type = 'number';
            maxInput.placeholder = `🔍 最大${field.name}`;
            maxInput.dataset.bound = 'max';
          
            const updateFilter = () => {
              const min = minInput.value.trim() === '' ? null : parseFloat(minInput.value);
              const max = maxInput.value.trim() === '' ? null : parseFloat(maxInput.value);
              if (min === null && max === null) {
                delete filters[field.name];
              } else {
                filters[field.name] = { min, max };
              }
              applyFilters();
            };
          
            minInput.oninput = updateFilter;
            maxInput.oninput = updateFilter;
          
            container.appendChild(minInput);
            container.appendChild(document.createTextNode(' ~ '));
            container.appendChild(maxInput);
          
            control = container;
          
          } else if (field.type === 'date') {
            const container = document.createElement('div');
            container.dataset.fieldIndex = idx;
            container.dataset.fieldType = 'div';
            container.style.display = idx < 4 || showAllFilters ? 'flex' : 'none';
            container.dataset.field = field.name;
            container.className = 'range-filter';
          
            const minInput = document.createElement('input');
            minInput.type = 'date';
            minInput.title = `🔍 最早${field.name}`;
            minInput.dataset.bound = 'min';
          
            const maxInput = document.createElement('input');
            maxInput.type = 'date';
            maxInput.title = `🔍 最晚${field.name}`;
            maxInput.dataset.bound = 'max';
          
            const updateFilter = () => {
              const min = minInput.value || null;
              const max = maxInput.value || null;
              if (min === null && max === null) {
                delete filters[field.name];
              } else {
                filters[field.name] = { min, max };
              }
              applyFilters();
            };
          
            minInput.onchange = updateFilter; // date 用 onchange
            maxInput.onchange = updateFilter;
          
            container.appendChild(minInput);
            container.appendChild(document.createTextNode(' ~ '));
            container.appendChild(maxInput);

            control = container;
          
        }
        else if (field.type === 'dict') {
            // 创建 select
            const select = document.createElement('select');
            select.dataset.fieldIndex = idx;
            select.dataset.fieldType = 'select';
            select.dataset.field = field.name;
            select.style.display = idx < 4 ? 'block' : 'none'; // 初始显示控制

            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = `🔍 请选择${field.name}`;
            select.appendChild(defaultOpt);

            field.dictItems.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item;
                opt.textContent = item;
                select.appendChild(opt);
            });

            select.onchange = (e) => {
                const val = e.target.value;
                if (val) {
                    filters[field.name] = val.toLowerCase();
                } else {
                    delete filters[field.name];
                }
                applyFilters();
            };

            control = select;
        } else {
            // 创建 input
            const input = document.createElement('input');
            input.dataset.fieldIndex = idx;
            input.dataset.fieldType = 'input';
            input.placeholder = `🔍 请输入${field.name}`;
            input.dataset.field = field.name;
            input.style.display = idx < 4 ? 'block' : 'none';

            input.oninput = (e) => {
                const val = e.target.value.trim();
                if (val) {
                    filters[field.name] = val.toLowerCase();
                } else {
                    delete filters[field.name];
                }
                applyFilters();
            };

            control = input;
        }

        filterDiv.appendChild(control); // 👈 所有控件都 append 进去
    });
  
    // 清空 filter-controls 容器
    const filterControls = document.getElementById('filter-controls');
    filterControls.innerHTML = '';

    // 创建“展开/收起筛选”按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn text-btn';
    toggleBtn.id = 'toggle-more-filters'; // 保留 ID 以防其他引用
    toggleBtn.textContent = showAllFilters ? '🔼 收起筛选' : '🔽 展开更多筛选';
    toggleBtn.onclick = () => {
        showAllFilters = !showAllFilters;
        // 获取所有控件（包括 input/select/div.range-filter）
        const controls = filterDiv.children; // ✅ 更准确：只取直接子元素（每个对应一个字段）

        Array.from(controls).forEach(el => {
            const fieldIndex = parseInt(el.dataset.fieldIndex, 10);
            el.style.display = (fieldIndex < 4 || showAllFilters) ? (el.dataset.fieldType == 'div' ? 'flex' : 'block') : 'none';
        });

        toggleBtn.textContent = showAllFilters ? '🔼 收起筛选' : '🔽 展开更多筛选';
    };

    // 创建“清空筛选”按钮
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn text-btn';
    clearBtn.id = 'clear-all-filters';
    clearBtn.textContent = '🧹 清空筛选';
    clearBtn.onclick = () => {
        filters = {};
        // 清空所有控件
        document.querySelectorAll('#search-filters input, #search-filters select').forEach(el => {
            if (el.type === 'date' || el.type === 'number' || el.type === 'text') {
                el.value = '';
            } else if (el.tagName === 'SELECT') {
                el.value = '';
            }
        });

        // 特别处理 range-filter 容器中的 input（如果上面没覆盖）
        document.querySelectorAll('.range-filter input').forEach(el => {
            el.value = '';
        });
        applyFilters();
    };

    // 将两个按钮加入容器
    filterControls.appendChild(toggleBtn);
    filterControls.appendChild(clearBtn);

    // 控制“展开/收起”按钮是否显示（根据字段数量）
    const hasMore = allFields.length > 4;
    toggleBtn.style.display = hasMore ? 'inline-block' : 'none';
    clearBtn.style.display = 'inline-block'; // 始终显示清空按钮（即使无更多筛选项）

    applyFilters();
}

// 根据搜索栏搜索条件筛选结果
function applyFilters() {
    const filtered = records.filter(record => {
      for (const field of formFields) {
        const filterVal = filters[field.name];
        if (filterVal !== undefined && filterVal !== '') { // ✅ 正确：跳过空/未设置
          const recordVal = (record[field.name] || '').toString().toLowerCase();
          if (field.type === 'number') {
            const num = parseFloat(recordVal);
            if (isNaN(num)) return false;
            const { min, max } = filterVal;
            if (min !== null && num < min) return false;
            if (max !== null && num > max) return false;
    
          } else if (field.type === 'date') {
            // 假设 record[field.name] 是 YYYY-MM-DD 字符串
            const recordDate = recordVal; // 如 "2023-05-15"
            const { min, max } = filterVal;
            if (min && recordDate < min) return false;
            if (max && recordDate > max) return false;
    
          } else if (field.type === 'dict') {
            if (recordVal !== filterVal) return false;
          } else {
            if (!recordVal.includes(filterVal)) return false;
          }
        }
      }
      return true;
    });
    filterRecordsNum = filtered.length;
    renderTableBody(filtered);
    updateRecordCount();
}

function renderTableBody(data) {
  const body = document.getElementById('table-body');
  body.innerHTML = '';
  const displayFields = formFields.slice(0, 10);

  data.forEach((record, index) => {
    const tr = document.createElement('tr');
    const indexTd = document.createElement('td'); // 创建序号列
    indexTd.textContent = index + 1;
    tr.appendChild(indexTd);
    displayFields.forEach(field => {
      const td = document.createElement('td');
      if (field.type === 'image') {
        if (record[field.name]) {
          const img = document.createElement('img');
          img.src = record[field.name];
          img.className = 'thumbnail';
          img.alt = '图片';
          img.onerror = () => { img.style.display = 'none'; };
          td.appendChild(img);
        }
      } else {
        td.textContent = record[field.name] || '';
      }
      tr.appendChild(td);
    });

    const actionTd = document.createElement('td');
    const div = document.createElement('div');
    div.className = 'action-buttons';

    ['详情', '编辑', '删除'].forEach((text, i) => {
      const btn = document.createElement('button');
      btn.className = `btn ${i===0?'outline':i===1?'success':'danger'} small`;
      btn.textContent = text;
      btn.onclick = () => {
        if (text === '详情') openModal(record.uuid, false);
        else if (text === '编辑') openModal(record.uuid, true);
        else deleteRecord(record.uuid);
      };
      div.appendChild(btn);
    });
    actionTd.appendChild(div);
    tr.appendChild(actionTd);
    body.appendChild(tr);
  });
}

// ========== 打开编辑弹窗 ==========
function openModal(uuidOfSelected, isEditing) {
    editingIndex = records.findIndex(item => item.uuid === uuidOfSelected);
    const record = records[editingIndex];
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form');
    const saveBtn = document.getElementById('modal-save-btn');
  
    modalTitle.textContent = isEditing ? '✏️ 编辑记录' : '🔍 记录详情';
    saveBtn.style.display = isEditing ? 'inline-block' : 'none';
  
    modalForm.innerHTML = '';
    formFields.forEach(field => {
      const container = document.createElement('label');
      const title = document.createElement('span');
      title.textContent = field.name + '：';
      container.appendChild(title);
  
      if (field.type === 'image') {
        if (record[field.name]) {
          const img = document.createElement('img');
          img.src = record[field.name];
          img.className = 'thumbnail';
          img.alt = '图片';
          img.onerror = () => { img.style.display = 'none'; };
          container.appendChild(img);
        }
        if (isEditing) {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.dataset.field = field.name;
          container.appendChild(input);
        }
      } else if (field.type === 'dict') {
        if (isEditing) {
          const select = document.createElement('select');
          const def = document.createElement('option');
          def.value = '';
          def.textContent = '请选择';
          select.appendChild(def);
          field.dictItems.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item;
            opt.textContent = item;
            if (record[field.name] === item) opt.selected = true;
            select.appendChild(opt);
          });
          container.appendChild(select);
        } else {
          const span = document.createElement('span');
          span.textContent = record[field.name] || '（未选择）';
          span.style.color = '#999';
          container.appendChild(span);
        }
      } else if (field.type === 'number') {
        if (isEditing) {
            const input = document.createElement('input');
            input.type = 'number';
            input.value = record[field.name] || '';
            container.appendChild(input);
          } else {
            const span = document.createElement('span');
            span.textContent = record[field.name] || '（空）';
            span.style.color = '#999';
            container.appendChild(span);
          }
      } else if (field.type === 'date') {
        if (isEditing) {
            const input = document.createElement('input');
            input.type = 'date';
            input.value = record[field.name] || '';
            container.appendChild(input);
          } else {
            const span = document.createElement('span');
            span.textContent = record[field.name] || '（空）';
            span.style.color = '#999';
            container.appendChild(span);
          }
      } else {
        if (isEditing) {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = record[field.name] || '';
          container.appendChild(input);
        } else {
          const span = document.createElement('span');
          span.textContent = record[field.name] || '（空）';
          span.style.color = '#999';
          container.appendChild(span);
        }
      }
  
      modalForm.appendChild(container);
    });
  
    document.getElementById('modal').classList.remove('hidden');
}
  

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

// ========== 保存编辑：修复字段匹配逻辑 ==========
async function saveEditedRecord() {
    const updated = {};
    const containers = document.querySelectorAll('#modal-form > label');
  
    for (let i = 0; i < formFields.length; i++) {
      const field = formFields[i];
      const container = containers[i];
      if (!container) continue;
  
      if (field.type === 'image') {
        const fileInput = container.querySelector('input[type="file"]');
        if (fileInput && fileInput.files[0]) {
          updated[field.name] = await readFileAsBase64(fileInput.files[0]);
        } else {
          updated[field.name] = records[editingIndex][field.name]; // 保留原图
        }
      } else if (field.type === 'dict') {
        const select = container.querySelector('select');
        updated[field.name] = select ? select.value : '';
      } else if (field.type === 'number') {
        const input = container.querySelector('input[type="number"]');
        updated[field.name] = input ? input.value : '';
      } else if (field.type === 'date') {
        const input = container.querySelector('input[type="date"]');
        updated[field.name] = input ? input.value : '';
      } else {
        const input = container.querySelector('input[type="text"]');
        updated[field.name] = input ? input.value : '';
      }
    }
  
    records[editingIndex] = updated;
    localStorage.setItem('records', JSON.stringify(records));
    closeModal();
    // showAllFilters = false;
    // renderRecordsTable();
    applyFilters();
    // alert('记录已更新！');
}

function deleteRecord(uuidOfSelected) {
  if (!confirm('确定删除？')) return;
  editingIndex = records.findIndex(item => item.uuid === uuidOfSelected);
  records.splice(editingIndex, 1);
  localStorage.setItem('records', JSON.stringify(records));
  // renderRecordsTable();
  applyFilters();
  // alert('已删除');
}

// ========== 导入/导出 ==========
function exportData() {
  if (formFields.length === 0 && records.length === 0) {
    alert('无数据可导出');
    return;
  }
  const data = {
    version: '1.0',
    formFields,
    records,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `form-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 100);
}

document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.formFields || !Array.isArray(data.records)) throw new Error('格式错误');
    formFields = data.formFields;
    records = data.records;
    localStorage.setItem('formFields', JSON.stringify(formFields));
    localStorage.setItem('records', JSON.stringify(records));
    renderFieldList();
    alert('✅ 导入成功！');
    // 自动切换到记录页
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="records-panel"]').classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('records-panel').classList.add('active');
    renderRecordsTable();
  } catch (err) {
    alert('❌ 导入失败：' + err.message);
  }
  e.target.value = '';
});

// ========== 初始化 ==========
function updateRecordCount() {
  document.getElementById('record-count').textContent = filterRecordsNum >= 0 ? filterRecordsNum : records.length;
}

renderFieldList();
updateRecordCount();
