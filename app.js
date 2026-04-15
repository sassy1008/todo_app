// DOM 요소 캐싱
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');

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
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        
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
    todos = todos.filter(t => t.id !== id);
    saveAndRender();
};

/**
 * 데이터를 저장하고 화면을 다시 그립니다.
 */
function saveAndRender() {
    localStorage.setItem('todos', JSON.stringify(todos));
    renderTodos();
}

// 이벤트 리스너 등록
addBtn.addEventListener('click', addTodo);

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
