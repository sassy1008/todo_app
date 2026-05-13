import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile 
} from 'firebase/auth';
import { 
    getDatabase, 
    ref, 
    set, 
    onValue, 
    push, 
    remove, 
    update 
} from 'firebase/database';

// TODO: Firebase 콘솔에서 복사한 실제 설정으로 교체하세요.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "todo2-682ba.firebaseapp.com",
    databaseURL: "https://todo2-682ba-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "todo2-682ba",
    storageBucket: "todo2-682ba.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM 요소 캐싱
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const toSignup = document.getElementById('to-signup');
const toLogin = document.getElementById('to-login');

const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const remainingCount = document.getElementById('remaining-count');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

let todos = [];
let currentUser = null;

// ===== 인증 로직 =====

// 인증 상태 감시
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        userInfo.textContent = `${user.displayName || '사용자'}님`;
        loadTodos(user.uid);
    } else {
        currentUser = null;
        authScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
        todoList.innerHTML = '';
    }
});

// 화면 전환
toSignup.onclick = (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
};

toLogin.onclick = (e) => {
    e.preventDefault();
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
};

// 회원가입
document.getElementById('signup-btn').onclick = async () => {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!name || !email || !password) {
        alert('모든 필드를 입력해 주세요.');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        alert('회원가입 성공!');
    } catch (error) {
        alert('회원가입 실패: ' + error.message);
    }
};

// 로그인
document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert('로그인 실패: ' + error.message);
    }
};

// 로그아웃
logoutBtn.onclick = () => signOut(auth);

// ===== Todo 로직 =====

/**
 * 특정 사용자의 할 일 목록을 실시간으로 가져옵니다.
 */
function loadTodos(uid) {
    const todosRef = ref(db, `users/${uid}/todos`);
    onValue(todosRef, (snapshot) => {
        const data = snapshot.val();
        todos = [];
        if (data) {
            // Firebase 객체를 배열로 변환
            for (let id in data) {
                todos.push({ id, ...data[id] });
            }
        }
        renderTodos();
    });
}

/**
 * 할 일 목록을 렌더링합니다.
 */
function renderTodos() {
    todoList.innerHTML = '';
    
    // 복합 정렬 로직 (기존 로직 유지)
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
        li.dataset.todoId = todo.id;
        
        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''} id="check-${todo.id}">
            <span>${todo.text}</span>
            <button class="delete-btn" id="del-${todo.id}" aria-label="삭제">
                <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
            </button>
        `;
        
        // 이벤트 바인딩 (onchange/onclick 대신 addEventListener 사용)
        li.querySelector(`#check-${todo.id}`).onchange = () => toggleTodo(todo.id);
        li.querySelector(`#del-${todo.id}`).onclick = () => deleteTodo(todo.id);
        
        todoList.appendChild(li);
    });
    
    if (window.lucide) lucide.createIcons();

    // 하단 UI 업데이트
    const remaining = todos.filter(t => !t.completed).length;
    const hasCompleted = todos.some(t => t.completed);

    if (todos.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    if (remaining === 0 && todos.length > 0) {
        remainingCount.textContent = '🎉 모든 할 일을 완료했어요!';
    } else if (remaining > 0) {
        remainingCount.textContent = `${remaining}개의 할 일이 남았습니다.`;
    } else {
        remainingCount.textContent = '';
    }

    if (hasCompleted) {
        clearCompletedBtn.classList.remove('hidden');
    } else {
        clearCompletedBtn.classList.add('hidden');
    }
}

/**
 * 새로운 할 일을 Firebase에 추가합니다.
 */
async function addTodo() {
    const text = todoInput.value.trim();
    if (!text || !currentUser) return;
    
    const todosRef = ref(db, `users/${currentUser.uid}/todos`);
    const newTodoRef = push(todosRef);
    
    await set(newTodoRef, {
        text: text,
        completed: false,
        createdAt: Date.now(),
        completedAt: null
    });
    
    todoInput.value = '';
    todoInput.focus();
}

/**
 * 할 일 완료 상태를 토글합니다.
 */
async function toggleTodo(id) {
    if (!currentUser) return;
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const todoRef = ref(db, `users/${currentUser.uid}/todos/${id}`);
        await update(todoRef, {
            completed: !todo.completed,
            completedAt: !todo.completed ? Date.now() : null
        });
    }
}

/**
 * 할 일을 삭제합니다.
 */
async function deleteTodo(id) {
    if (!currentUser) return;
    const item = todoList.querySelector(`[data-todo-id="${id}"]`);
    if (!item) return;

    // 애니메이션 실행
    item.classList.add('removing');

    setTimeout(() => {
        const currentHeight = item.offsetHeight;
        item.style.height = currentHeight + 'px';
        item.style.paddingTop = '0';
        item.style.paddingBottom = '0';
        item.style.marginBottom = '0';
        requestAnimationFrame(() => {
            item.classList.add('collapsing');
            item.style.height = '0';
        });
    }, 180);

    // 애니메이션 후 데이터 삭제
    setTimeout(async () => {
        const todoRef = ref(db, `users/${currentUser.uid}/todos/${id}`);
        await remove(todoRef);
    }, 420);
}

/**
 * 완료된 할 일을 일괄 삭제합니다.
 */
async function clearCompleted() {
    if (!currentUser) return;
    const completedTodos = todos.filter(t => t.completed);
    const updates = {};
    completedTodos.forEach(t => {
        updates[`users/${currentUser.uid}/todos/${t.id}`] = null;
    });
    await update(ref(db), updates);
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);
clearCompletedBtn.addEventListener('click', clearCompleted);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});
