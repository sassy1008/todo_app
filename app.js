// DOM 요소 캐싱
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');

// 초기 데이터 로드
let todos = JSON.parse(localStorage.getItem('todos')) || [];

/**
 * 할 일 목록을 렌더링합니다.
 */
function renderTodos() {
    todoList.innerHTML = '';
    
    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        
        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${index})">
            <span>${todo.text}</span>
            <button class="delete-btn" onclick="deleteTodo(${index})" aria-label="삭제">
                <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
            </button>
        `;
        
        todoList.appendChild(li);
    });
    
    // 새롭게 추가된 요소들에 대해 Lucide 아이콘 적용
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * 새로운 할 일을 추가합니다.
 */
function addTodo() {
    const text = todoInput.value.trim();
    
    // 빈 값 방지
    if (!text) return;
    
    todos.push({
        text: text,
        completed: false
    });
    
    saveAndRender();
    todoInput.value = '';
    todoInput.focus();
}

/**
 * 할 일의 완료 상태를 토글합니다.
 */
window.toggleTodo = function(index) {
    todos[index].completed = !todos[index].completed;
    saveAndRender();
};

/**
 * 할 일을 삭제합니다.
 */
window.deleteTodo = function(index) {
    // 삭제 전 페이드 아웃 효과를 위한 처리 (선택 사항)
    todos.splice(index, 1);
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

// Enter 키 입력 처리
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 초기화 호출
renderTodos();
