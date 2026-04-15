// DOM 요소 캐싱
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');         // 빈 상태 메시지
const remainingCount = document.getElementById('remaining-count'); // 남은 개수 텍스트
const clearCompletedBtn = document.getElementById('clear-completed-btn'); // 일괄 삭제 버튼

// 초기 데이터 로드 (createdAt, completedAt이 없는 기존 데이터 대응)
let todos = JSON.parse(localStorage.getItem('todos')) || [];

/**
 * 할 일 목록을 정렬하고 렌더링합니다.
 */
function renderTodos() {
    todoList.innerHTML = '';
    
    // 복합 정렬 로직
    // 1. 미완료 항목 우선 (completed: false < true)
    // 2. 미완료 중에는 생성시간 내림차순 (최신순)
    // 3. 완료 중에는 완료시간 내림차순 (최근 완료순)
    const sortedTodos = [...todos].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        
        if (!a.completed) {
            return (b.createdAt || 0) - (a.createdAt || 0);
        } else {
            return (b.completedAt || 0) - (a.completedAt || 0);
        }
    });

    sortedTodos.forEach((todo) => {
        const li = document.createElement('li');
        // data-todo-id로 고유 식별자 부여 (onchange 파싱보다 안정적)
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.todoId = todo.id;
        
        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
            <span>${todo.text}</span>
            <button class="delete-btn" onclick="deleteTodo(${todo.id})" aria-label="삭제">
                <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
            </button>
        `;
        
        todoList.appendChild(li);
    });
    
    // Lucide 아이콘 초기화
    if (window.lucide) {
        lucide.createIcons();
    }

    // ===== 하단 UI 업데이트 =====
    const remaining = todos.filter(t => !t.completed).length;
    const hasCompleted = todos.some(t => t.completed);

    // 빈 상태 안내 메시지 표시/숨김
    if (todos.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    // 남은 개수 텍스트 업데이트
    if (remaining === 0 && todos.length > 0) {
        remainingCount.textContent = '🎉 모든 할 일을 완료했어요!';
    } else if (remaining > 0) {
        remainingCount.textContent = `${remaining}개의 할 일이 남았습니다.`;
    } else {
        remainingCount.textContent = '';
    }

    // 완료된 항목이 있을 때만 일괄 삭제 버튼 표시
    if (hasCompleted) {
        clearCompletedBtn.classList.remove('hidden');
    } else {
        clearCompletedBtn.classList.add('hidden');
    }
}

/**
 * 새로운 할 일을 추가합니다.
 */
function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;
    
    const now = Date.now();
    todos.push({
        id: now, // 고유 ID로 타임스탬프 사용
        text: text,
        completed: false,
        createdAt: now,
        completedAt: null
    });
    
    saveAndRender();
    todoInput.value = '';
    todoInput.focus();
}

/**
 * 할 일의 완료 상태를 토글합니다.
 * @param {number} id - 항목의 고유 ID
 */
window.toggleTodo = function(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        todo.completedAt = todo.completed ? Date.now() : null;
        saveAndRender();
    }
};

/**
 * 할 일을 삭제합니다.
 * @param {number} id - 항목의 고유 ID
 */
window.deleteTodo = function(id) {
    // data-todo-id 속성으로 대상 DOM 요소를 정확히 찾음
    const item = todoList.querySelector(`[data-todo-id="${id}"]`);
    if (!item) return;

    // === 1단계: 내용 페이드아웃 (0 ~ 180ms) ===
    item.classList.add('removing');

    // === 2단계: 높이 축소로 아래 항목들이 부드럽게 올라옴 (180ms ~) ===
    setTimeout(() => {
        // 현재 실제 높이를 명시적으로 고정한 뒤 transition으로 0까지 줄임
        const currentHeight = item.offsetHeight;
        item.style.height = currentHeight + 'px';
        item.style.paddingTop = '0';
        item.style.paddingBottom = '0';
        item.style.marginBottom = '0';

        // style 정착 후 바로 0으로 전환 시작 (브라우저 repaint 보장)
        requestAnimationFrame(() => {
            item.classList.add('collapsing');
            item.style.height = '0';
        });
    }, 180);

    // === 3단계: 모든 애니메이션 완료 후 데이터 삭제 및 재렌더링 (180 + 240ms) ===
    setTimeout(() => {
        todos = todos.filter(t => t.id !== id);
        saveAndRender();
    }, 420);
};

/**
 * 데이터를 저장하고 화면을 다시 그립니다.
 */
function saveAndRender() {
    localStorage.setItem('todos', JSON.stringify(todos));
    renderTodos();
}

/**
 * 완료된 모든 할 일을 일괄 삭제합니다.
 * - 요청에 따라: todos 배열에서 completed가 true인 항목들만 제거
 */
function clearCompleted() {
    todos = todos.filter(t => !t.completed);
    saveAndRender();
}

// 이벤트 리스너 등록
addBtn.addEventListener('click', addTodo);
clearCompletedBtn.addEventListener('click', clearCompleted); // 일괄 삭제 버튼

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 기존 데이터가 있다면 ID 부여 (마이그레이션 도우미)
todos = todos.map(todo => {
    if (!todo.id) {
        todo.id = todo.id || Date.now() + Math.random();
        todo.createdAt = todo.createdAt || Date.now();
    }
    return todo;
});

// 초기화 호출
renderTodos();
