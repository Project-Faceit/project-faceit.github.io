import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, getCountFromServer, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// Данные из firebase (не трогаем!)
const firebaseConfig = {
    apiKey: "AIzaSyAuQJaKE1GS4D6GbqZfhOtTij-GXIvQF1w",
    authDomain: "project-faceit-22088.firebaseapp.com",
    projectId: "project-faceit-22088",
    storageBucket: "project-faceit-22088.firebasestorage.app",
    messagingSenderId: "681525286192",
    appId: "1:681525286192:web:42dee0506a6c2cf32b64f5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null; 
let currentUserData = null; 
let viewedProfileUid = null; 
let isOwner = true; 

// --- УТИЛИТА: Очистка строк от HTML (Защита от XSS) ---
function sanitizeHTML(str) {
    if (!str) return "";
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// --- УТИЛИТА: Плавная анимация чисел ---
function animateValue(obj, start, end, duration) {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end; // Фикс точности в конце
        }
    };
    window.requestAnimationFrame(step);
}

// Определение страны при регистрации
async function fetchUserCountry() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();
        return data.country_name || "Неизвестно";
    } catch (e) {
        return "Неизвестно";
    }
}

const authSec = document.getElementById('authSection');
const profileSec = document.getElementById('profileSection');
const setupSec = document.getElementById('setupSection');
const mainSec = document.getElementById('mainSection');
const btnCancelSetup = document.getElementById('btnCancelSetup');
let isEditingProfile = false;

function showSection(sectionElem, titleString) {
    [authSec, profileSec, setupSec, mainSec].forEach(sec => {
        if(sec) sec.classList.add('hidden');
    });
    if(sectionElem) sectionElem.classList.remove('hidden');
    // Фикс: безопасная установка заголовка
    document.title = titleString ? "Project Faceit | " + titleString : "Project Faceit";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// Меню
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');

function toggleMenu() {
    if (!currentUser) {
        alert("Пожалуйста, зарегистрируйтесь или войдите в аккаунт, чтобы открыть меню.");
        return;
    }
    if (sideMenu && menuOverlay && menuToggle) {
        sideMenu.classList.toggle('open');
        menuOverlay.classList.toggle('active');
        menuToggle.classList.toggle('active'); 
        document.body.classList.toggle('menu-open'); 
    }
}

if (menuToggle && menuOverlay) {
    menuToggle.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', toggleMenu);
}

const navMainEl = document.getElementById('navMain');
if (navMainEl) {
    navMainEl.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMenu(); 
        window.history.pushState(null, null, window.location.pathname); // Очищаем URL от ?user=
        isOwner = true; // Сброс стейта
        showSection(mainSec, "Главная");
    });
}

const logoToMainEl = document.getElementById('logoToMain');
if (logoToMainEl) {
    logoToMainEl.addEventListener('click', () => {
        if(currentUser) {
            window.history.pushState(null, null, window.location.pathname);
            isOwner = true;
            showSection(mainSec, "Главная");
        }
    });
}

// Переход в свой профиль из меню
const menuDisplayNameEl = document.getElementById('menuDisplayName');
if (menuDisplayNameEl) {
    menuDisplayNameEl.addEventListener('click', () => {
        toggleMenu();
        if(currentUserData && currentUserData.gameId) {
            window.history.pushState(null, null, `?user=${currentUserData.gameId}`);
            checkUserState(currentUser);
        }
    });
}

// Клик по иконке шестеренки (редактирование профиля)
const menuSettingsBtn = document.getElementById('menuSettingsBtn');
if (menuSettingsBtn) {
    menuSettingsBtn.addEventListener('click', () => {
        toggleMenu();
        if (currentUserData) {
            isEditingProfile = true;
            showSection(setupSec, "Редактирование");
            if (btnCancelSetup) btnCancelSetup.classList.remove('hidden');
            
            document.getElementById('setupNickname').value = currentUserData.nickname || '';
            document.getElementById('setupGameId').value = currentUserData.gameId || '';
            document.getElementById('setupClanTag').value = currentUserData.clanTag || '';
            document.getElementById('setupRole').value = currentUserData.role || 'Рифлер';
            document.getElementById('setupBannerColor').value = currentUserData.bannerColor || 'red';
            document.getElementById('setupAvatarUrl').value = currentUserData.avatar && !currentUserData.avatar.includes('ui-avatars') ? currentUserData.avatar : '';
            document.getElementById('setupProfileBannerUrl').value = currentUserData.profileBanner || '';
            document.getElementById('setupBannerUrl').value = currentUserData.banner || '';
            document.getElementById('setupTgUrl').value = currentUserData.socialTg || '';
            document.getElementById('setupVkUrl').value = currentUserData.socialVk || '';
        }
    });
}

// Разделы: О нас
const navAbout = document.getElementById('navAbout');
if (navAbout) {
    navAbout.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Раздел "О нас" пока пуст. Скоро здесь будет информация о проекте Project Faceit!');
    });
}

document.querySelectorAll('.dev-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Этот раздел находится в разработке.');
    });
});

const tabs = document.querySelectorAll('.nav-tabs span');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
            content.classList.remove('active');
        });
        const targetId = tab.getAttribute('data-tab');
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
            targetContent.classList.remove('hidden');
            targetContent.classList.add('active');
        }
    });
});

// Живой поиск Firebase
const searchInput = document.getElementById('menuSearchInput');
const searchResults = document.getElementById('searchResults');

let searchTimeout; // Добавляем таймер
if (searchInput && searchResults) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout); // Сбрасываем таймер при каждом вводе
        const val = e.target.value.trim(); 
        
        if (val.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        // Ждем полсекунды перед запросом в БД
        searchTimeout = setTimeout(async () => {
            try {
                const q = query(collection(db, "players"), 
                    where("nickname", ">=", val), 
                    where("nickname", "<=", val + '\uf8ff')
                );
                const querySnapshot = await getDocs(q);

                searchResults.innerHTML = '';
                let found = 0;

                querySnapshot.forEach((docSnap) => {
                    found++;
                    const data = docSnap.data();
                    const div = document.createElement('div');
                    div.className = 'search-item';
                    div.innerText = data.clanTag ? `[${data.clanTag}] ${data.nickname}` : data.nickname;
                    div.onclick = () => {
                        toggleMenu(); 
                        window.history.pushState(null, null, `?user=${data.gameId}`); 
                        checkUserState(currentUser); 
                    };
                    searchResults.appendChild(div);
                });

                if (found === 0) {
                    searchResults.innerHTML = '<div class="search-item" style="color:#aaa;">Никто не найден</div>';
                }
                searchResults.style.display = 'block';
            } catch(err) {
                console.error("Ошибка поиска:", err);
            }
        }, 500); // 500 мс задержка
    });
}


// Статистика онлайна и Список пользователей
let baseOnline = 0;
async function updateOnlineStats() {
    try {
        const menuTotalUsers = document.getElementById('menuTotalUsers');
        const coll = collection(db, "players");
        const snapshot = await getCountFromServer(coll);
        const count = snapshot.data().count;

        if (menuTotalUsers) animateValue(menuTotalUsers, parseInt(menuTotalUsers.innerText) || 0, count, 1000);
        
        baseOnline = Math.max(1, Math.floor(count * 0.3) + Math.floor(Math.random() * 5));
        const onlineEl = document.getElementById('menuOnlineCount');
        if (onlineEl) onlineEl.innerText = baseOnline;

    } catch (e) {
        console.error("Ошибка при получении статистики:", e);
    }
}
updateOnlineStats();
setInterval(updateOnlineStats, 60000); 

setInterval(() => {
    const onlineEl = document.getElementById('menuOnlineCount');
    if (onlineEl && baseOnline > 0) {
        const fluctuation = Math.floor(Math.random() * 3) - 1; 
        let newOnline = Math.max(1, baseOnline + fluctuation);
        onlineEl.innerText = newOnline;
        onlineEl.style.textShadow = "0 0 15px rgba(255, 42, 42, 0.8)";
        setTimeout(() => { onlineEl.style.textShadow = "none"; }, 500);
    }
}, 3500);

const toggleUsersListBtn = document.getElementById('toggleUsersList');
const registeredUsersDropdown = document.getElementById('registeredUsersDropdown');
const usersListContainer = document.getElementById('usersListContainer');
let usersListLoaded = false;

if (toggleUsersListBtn && registeredUsersDropdown && usersListContainer) {
    toggleUsersListBtn.addEventListener('click', async () => {
        registeredUsersDropdown.classList.toggle('hidden');
        
        if (!registeredUsersDropdown.classList.contains('hidden') && !usersListLoaded) {
            usersListContainer.innerHTML = '<li class="loading-text" style="text-align:center; padding: 10px; color: var(--text-muted);">Загрузка базы...</li>';
            try {
                // ФИКС: Ограничиваем запрос до 50 игроков для защиты БД
                const q = query(collection(db, "players"), limit(50));
                const querySnapshot = await getDocs(q);
                usersListContainer.innerHTML = '';
                
                if (querySnapshot.empty) {
                    usersListContainer.innerHTML = '<li style="text-align:center; padding: 10px;">Список пуст</li>';
                } else {
                    querySnapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        const li = document.createElement('li');
                        li.style.padding = "8px 10px";
                        li.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
                        li.style.cursor = "pointer";
                        li.style.display = "flex";
                        li.style.justifyContent = "space-between";
                        
                        const nameSpan = document.createElement('span');
                        nameSpan.style.color = "white";
                        nameSpan.style.fontWeight = "500";
                        nameSpan.innerText = data.clanTag ? `[${data.clanTag}] ${data.nickname}` : data.nickname;
                        
                        const idSpan = document.createElement('span');
                        idSpan.style.color = "var(--text-muted)";
                        idSpan.style.fontSize = "0.8rem";
                        idSpan.innerText = `ID: ${data.gameId}`;
                        
                        li.appendChild(nameSpan);
                        li.appendChild(idSpan);
                        
                        li.onclick = () => {
                            toggleMenu();
                            window.history.pushState(null, null, `?user=${data.gameId}`);
                            checkUserState(currentUser);
                        };
                        usersListContainer.appendChild(li);
                    });
                }
                usersListLoaded = true;
            } catch (err) {
                console.error("Ошибка загрузки списка:", err);
                usersListContainer.innerHTML = '<li style="color:red; text-align:center;">Ошибка подключения</li>';
            }
        }
    });
}

const shareBtn = document.getElementById('btnShareProfile');
if (shareBtn) {
    shareBtn.addEventListener('click', () => {
        const gameIdToShare = document.getElementById('displayGameId').getAttribute('data-id');
        if(!gameIdToShare || gameIdToShare === '00000000') return;
        
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('user', gameIdToShare);
        
        navigator.clipboard.writeText(url.toString()).then(() => {
            alert(`Ссылка на профиль скопирована!\n${url.toString()}`);
        }).catch(err => console.error('Ошибка копирования:', err));
    });
}

// Подписки
const btnSubscribe = document.getElementById('btnSubscribe');
const subsCountEl = document.getElementById('subsCount');
let isSubscribed = false; 
let currentSubs = 0;

if (btnSubscribe && subsCountEl) {
    btnSubscribe.addEventListener('click', async () => {
        if (!currentUser) {
            alert("Для подписки необходимо войти в аккаунт.");
            return;
        }
        if (isOwner) {
            alert("Вы не можете подписаться на самого себя!");
            return;
        }
        if (!viewedProfileUid) return;

        isSubscribed = !isSubscribed;
        if (isSubscribed) {
            btnSubscribe.classList.remove('btn-primary');
            btnSubscribe.classList.add('btn-secondary');
            btnSubscribe.innerText = 'Отписаться';
            currentSubs++;
        } else {
            btnSubscribe.classList.remove('btn-secondary');
            btnSubscribe.classList.add('btn-primary');
            btnSubscribe.innerText = 'Подписаться';
            currentSubs = Math.max(0, currentSubs - 1); 
        }
        subsCountEl.innerText = currentSubs;

        try {
            await updateDoc(doc(db, "players", viewedProfileUid), { subs: currentSubs });
        } catch (e) {
            console.error("Ошибка при обновлении подписок:", e);
        }
    });
}

const displayGameId = document.getElementById('displayGameId');
if (displayGameId) {
    displayGameId.addEventListener('click', function() {
        const idText = this.getAttribute('data-id') || this.innerText;
        if(idText !== '00000000') {
            navigator.clipboard.writeText(idText);
            this.setAttribute('data-id', idText);
            const originalColor = this.style.color;
            this.style.color = 'var(--win-green)';
            this.innerText = 'Скопировано!';
            this.style.pointerEvents = 'none'; 
            setTimeout(() => { 
                this.style.color = originalColor; 
                this.innerText = idText; 
                this.style.pointerEvents = 'auto';
            }, 1000);
        }
    });
}

const bannerColors = {
    red: { grad: 'linear-gradient(135deg, rgba(255,42,42,0.8), #09090b)', txt: '#ff0000' },
    black: { grad: 'linear-gradient(135deg, #333333, #09090b)', txt: '#aaaaaa' },
    pink: { grad: 'linear-gradient(135deg, #ff66b2, #09090b)', txt: '#ff66b2' },
    white: { grad: 'linear-gradient(135deg, #ffffff, #555555)', txt: '#ffffff' },
    orange: { grad: 'linear-gradient(135deg, #ff8c00, #09090b)', txt: '#ff8c00' },
    yellow: { grad: 'linear-gradient(135deg, #ffd700, #09090b)', txt: '#ffd700' },
    lightblue: { grad: 'linear-gradient(135deg, #00bfff, #09090b)', txt: '#00bfff' },
    purple: { grad: 'linear-gradient(135deg, #8a2be2, #09090b)', txt: '#8a2be2' }
};

function getRankDetails(elo) {
    if (elo < 1050) return { rank: "Новичок", color: "#888888" };
    if (elo < 1150) return { rank: "Бронза", color: "#cd7f32" };
    if (elo < 1300) return { rank: "Серебро", color: "#c0c0c0" };
    if (elo < 1500) return { rank: "Золото", color: "#ffd700" };
    if (elo < 1800) return { rank: "Мастер", color: "#ff2a2a" };
    return { rank: "Легенда", color: "#cc0000" };
}

function toggleButtonLoading(btnId, isLoading, originalText) {
    const btn = document.getElementById(btnId);
    if(btn) {
        btn.disabled = isLoading;
        btn.innerText = isLoading ? "..." : originalText;
    }
}

// Авторизация Firebase
const btnRegister = document.getElementById('btnRegister');
if (btnRegister) {
    btnRegister.addEventListener('click', async () => { 
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value.trim();
        if(pass.length < 6) return alert("Пароль минимум 6 символов!");
        toggleButtonLoading('btnRegister', true, 'Создать аккаунт');
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
            alert("✅ Успешно! Вы зарегистрированы.");
        } catch (e) { alert("Ошибка: " + e.message); } 
        finally { toggleButtonLoading('btnRegister', false, 'Создать аккаунт'); }
    });
}

const btnLogin = document.getElementById('btnLogin');
if (btnLogin) {
    btnLogin.addEventListener('click', async () => { 
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value.trim();
        toggleButtonLoading('btnLogin', true, 'Войти');
        try { 
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (e) { alert("Ошибка входа! Проверьте данные."); } 
        finally { toggleButtonLoading('btnLogin', false, 'Войти'); }
    });
}

const btnGoogle = document.getElementById('btnGoogle');
if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
        try { 
            await signInWithPopup(auth, googleProvider);
        } catch (e) { alert("Ошибка Google: " + e.message); }
    });
}

// Перенаправление на Главную после сохранения и фикс черного экрана
const btnSaveSetup = document.getElementById('btnSaveSetup');
if (btnSaveSetup) {
    btnSaveSetup.addEventListener('click', async () => {
        if (!currentUser) return;
        
        // ФИКС XSS: Очищаем данные от HTML-тегов перед сохранением
        const nick = sanitizeHTML(document.getElementById('setupNickname').value.trim());
        const gameId = sanitizeHTML(document.getElementById('setupGameId').value.trim());
        const clanTag = sanitizeHTML(document.getElementById('setupClanTag').value.trim());
        const role = document.getElementById('setupRole').value;
        const bannerColor = document.getElementById('setupBannerColor').value;
        const avatarUrl = document.getElementById('setupAvatarUrl').value.trim();
        const profileBannerUrl = document.getElementById('setupProfileBannerUrl').value.trim();
        const bannerUrl = document.getElementById('setupBannerUrl').value.trim();
        const tgUrl = document.getElementById('setupTgUrl').value.trim();
        const vkUrl = document.getElementById('setupVkUrl').value.trim();

        if (nick.length < 3) return alert("Никнейм должен быть больше 3 символов.");
        if (gameId.length < 5) return alert("Введите корректный ID из игры.");

        toggleButtonLoading('btnSaveSetup', true, 'Сохранить');
        
         try {
            if (nick.length < 3 || nick.length > 20) throw new Error("Никнейм должен быть от 3 до 20 символов.");
            
            // ФИКС: Разрешаем только буквы, цифры, пробелы и подчеркивания в нике
            const nickRegex = /^[a-zA-Zа-яА-Я0-9_ ]+$/;
            if (!nickRegex.test(nick)) throw new Error("В никнейме можно использовать только буквы, цифры и подчеркивание.");

            if (!currentUserData || nick !== currentUserData.nickname) {
                const qNick = query(collection(db, "players"), where("nickname", "==", nick));
                const snapNick = await getDocs(qNick);
                const isNickTaken = snapNick.docs.some(doc => doc.id !== currentUser.uid);
                if (isNickTaken) throw new Error("Этот Никнейм уже занят!");
            }
            
            if (!currentUserData || gameId !== currentUserData.gameId) {
                const qId = query(collection(db, "players"), where("gameId", "==", gameId));
                const snapId = await getDocs(qId);
                const isIdTaken = snapId.docs.some(doc => doc.id !== currentUser.uid);
                if (isIdTaken) throw new Error("Этот ID уже привязан!");
            }

            // ФИКС: Более строгая валидация (только защищенный протокол HTTPS)
            const safeAvatar = avatarUrl.startsWith('https://') ? avatarUrl : (currentUser.photoURL || null);
            const safeTg = tgUrl.startsWith('https://') ? tgUrl : null;
            const safeVk = vkUrl.startsWith('https://') ? vkUrl : null;


            await setDoc(doc(db, "players", currentUser.uid), { 
                email: currentUser.email,
                nickname: nick, gameId: gameId, clanTag: clanTag || null, 
                role: role || "Рифлер", bannerColor: bannerColor || "red",
                avatar: safeAvatar, profileBanner: profileBannerUrl || null,
                banner: bannerUrl || null, socialTg: safeTg, socialVk: safeVk
            }, { merge: true });
            
            isEditingProfile = false;
            window.history.pushState(null, null, window.location.pathname);
            showSection(mainSec, "Главная"); 
            checkUserState(currentUser); 
        } catch (e) { 
            console.error("Ошибка сохранения:", e);
            alert(e.message); 
        } 
        finally { toggleButtonLoading('btnSaveSetup', false, 'Сохранить'); }
    });
}

const btnEditProfile = document.getElementById('btnEditProfile');
if (btnEditProfile) {
    btnEditProfile.addEventListener('click', () => {
        if (!currentUserData) return;
        isEditingProfile = true;
        showSection(setupSec, "Редактирование");
        if (btnCancelSetup) btnCancelSetup.classList.remove('hidden');
        
        document.getElementById('setupNickname').value = currentUserData.nickname || '';
        document.getElementById('setupGameId').value = currentUserData.gameId || '';
        document.getElementById('setupClanTag').value = currentUserData.clanTag || '';
        document.getElementById('setupRole').value = currentUserData.role || 'Рифлер';
        document.getElementById('setupBannerColor').value = currentUserData.bannerColor || 'red';
        document.getElementById('setupAvatarUrl').value = currentUserData.avatar && !currentUserData.avatar.includes('ui-avatars') ? currentUserData.avatar : '';
        document.getElementById('setupProfileBannerUrl').value = currentUserData.profileBanner || '';
        document.getElementById('setupBannerUrl').value = currentUserData.banner || '';
        document.getElementById('setupTgUrl').value = currentUserData.socialTg || '';
        document.getElementById('setupVkUrl').value = currentUserData.socialVk || '';
    });
}

if (btnCancelSetup) {
    btnCancelSetup.addEventListener('click', () => {
        isEditingProfile = false;
        showSection(profileSec, currentUserData.nickname);
    });
}

// ФИКС: Обработка кнопки "Назад" в браузере
window.addEventListener('popstate', () => {
    checkUserState(auth.currentUser);
});

// Главный роутер
async function checkUserState(user) {
    currentUser = user; 

    let dataToDisplay = null;
    isOwner = true;
    viewedProfileUid = null;

    const urlParams = new URLSearchParams(window.location.search);
    const targetGameId = urlParams.get('user');

    if (user) {
        const userRef = doc(db, "players", user.uid);
        const docSnap = await getDoc(userRef);
        
        if (!docSnap.exists()) {
            const country = await fetchUserCountry(); 
            // ФИКС ELO: У нового пользователя теперь 1000 ELO вместо 0
            const newUserData = { 
                email: user.email, elo: 1000, wins: 0, losses: 0, subs: 0, 
                country: country, matchHistory: [], avatar: user.photoURL || null, 
                role: "Рифлер", bannerColor: "red" 
            };
            await setDoc(userRef, newUserData);
            currentUserData = { id: user.uid, ...newUserData }; 
        } else {
            currentUserData = { id: docSnap.id, ...docSnap.data() };
        }
        
        if (!currentUserData.nickname || !currentUserData.gameId) {
            if (btnCancelSetup) btnCancelSetup.classList.add('hidden');
            showSection(setupSec, "Настройка профиля");
            return;
        }

        const menuDisplayName = document.getElementById('menuDisplayName');
        if (menuDisplayName) menuDisplayName.innerText = currentUserData.nickname;
        const menuAvatarEl = document.getElementById('menuAvatar');
        const safeNick = encodeURIComponent(currentUserData.nickname || 'Player');
        if (menuAvatarEl) menuAvatarEl.src = currentUserData.avatar || `https://ui-avatars.com/api/?name=${safeNick}&background=ff2a2a&color=fff&font-size=0.4`;
        
        if (currentUserData.profileBanner) {
            const menuProfileBg = document.getElementById('menuProfileBg');
            if (menuProfileBg) menuProfileBg.style.backgroundImage = `url("${currentUserData.profileBanner.replace(/"/g, '')}")`;
        }
    }

    if (targetGameId) {
        if (user && currentUserData && targetGameId === currentUserData.gameId) {
            dataToDisplay = currentUserData;
            viewedProfileUid = user.uid;
            isOwner = true;
            window.history.replaceState(null, null, window.location.pathname); 
        } else {
            const q = query(collection(db, "players"), where("gameId", "==", targetGameId));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const targetDoc = querySnapshot.docs[0];
                dataToDisplay = { id: targetDoc.id, ...targetDoc.data() };
                viewedProfileUid = targetDoc.id;
                isOwner = false;
            } else {
                alert("Игрок с таким ID не найден!");
                window.history.replaceState(null, null, window.location.pathname);
                if (user) {
                    dataToDisplay = currentUserData;
                    viewedProfileUid = user.uid;
                    isOwner = true;
                }
            }
        }
    } else if (user) {
        dataToDisplay = currentUserData;
        viewedProfileUid = user.uid;
        isOwner = true;
    }

    if (dataToDisplay) {
        if (!isEditingProfile) {
            if (targetGameId) {
                showSection(profileSec, dataToDisplay.nickname);
            } else if (setupSec && !setupSec.classList.contains('hidden')) {
                showSection(profileSec, dataToDisplay.nickname);
            } else if (authSec && !authSec.classList.contains('hidden')) {
                showSection(mainSec, "Главная");
            }
        }

        if (btnEditProfile) {
            btnEditProfile.style.display = isOwner ? 'inline-block' : 'none';
        }

        const btnLogoutEl = document.getElementById('btnLogout');
        if (btnLogoutEl) {
            btnLogoutEl.style.display = isOwner ? 'block' : 'none';
        }

        const displayNickname = document.getElementById('displayNickname');
        if (displayNickname) displayNickname.innerText = dataToDisplay.nickname;
        
        const clanDisplay = document.getElementById('displayClanTag');
        if (clanDisplay) clanDisplay.innerText = dataToDisplay.clanTag ? `[${dataToDisplay.clanTag}] ` : '';

        const displayGameIdEl = document.getElementById('displayGameId');
        if (displayGameIdEl) {
            displayGameIdEl.innerText = dataToDisplay.gameId;
            displayGameIdEl.setAttribute('data-id', dataToDisplay.gameId);
        }

        const wins = dataToDisplay.wins || 0; 
        const losses = dataToDisplay.losses || 0; 
        const elo = dataToDisplay.elo || 1000;
        
        // ФИКС: Анимация начинается с текущего значения, а не с нуля
        const currentElo = parseInt(document.getElementById('elo').innerText) || 0;
        const currentWins = parseInt(document.getElementById('wins').innerText) || 0;
        const currentLosses = parseInt(document.getElementById('losses').innerText) || 0;

        animateValue(document.getElementById('elo'), currentElo, elo, 1500);
        animateValue(document.getElementById('wins'), currentWins, wins, 1000);
        animateValue(document.getElementById('losses'), currentLosses, losses, 1000);

        
        document.getElementById('displayCountry').innerText = dataToDisplay.country || "Неизвестно";
        
        currentSubs = dataToDisplay.subs || 0;
        if (subsCountEl) subsCountEl.innerText = currentSubs;

        try {
            const totalMatches = wins + losses;
            let winRate = "0%";
            if (totalMatches > 0) { winRate = Math.round((wins / totalMatches) * 100) + "%"; }
            document.getElementById('winRateTxt').innerText = winRate;
        } catch(e) {}
        
        const safeNick = encodeURIComponent(dataToDisplay.nickname || 'Player');
        const defaultAvatar = `https://ui-avatars.com/api/?name=${safeNick}&background=ff2a2a&color=fff&font-size=0.4`;
        const userAvatarEl = document.getElementById('userAvatar');
        if (userAvatarEl) userAvatarEl.src = dataToDisplay.avatar || defaultAvatar;
        
        const colorConfig = bannerColors[dataToDisplay.bannerColor || 'red'] || bannerColors['red'];
        const bannerEl = document.getElementById('userBanner');
        const profileBgBanner = document.getElementById('profileBgBanner');
        
        const eloLabelColor = document.getElementById('eloLabelColor');
        if (eloLabelColor) eloLabelColor.style.color = colorConfig.txt;

        if(dataToDisplay.banner && bannerEl) {
            bannerEl.style.backgroundImage = `url("${dataToDisplay.banner.replace(/"/g, '')}")`;
        } else if (bannerEl) { 
            // ФИКС ГРАДИЕНТА: используется background вместо backgroundImage
            bannerEl.style.background = colorConfig.grad; 
        }

        if(dataToDisplay.profileBanner) {
            if(profileBgBanner) profileBgBanner.style.backgroundImage = `url("${dataToDisplay.profileBanner.replace(/"/g, '')}")`;
        } else {
            if(profileBgBanner) profileBgBanner.style.backgroundImage = 'none';
        }

        const rankDetails = getRankDetails(elo);
        const badge = document.getElementById('rankBadge');
        if (badge) {
            badge.innerText = `${dataToDisplay.role || 'Рифлер'} - ${rankDetails.rank}`;
            badge.style.color = rankDetails.color;
            badge.style.borderColor = rankDetails.color;
        }
        
        const socialsContainer = document.getElementById('socialLinksContainer');
        if (socialsContainer) {
            socialsContainer.innerHTML = ''; 
            
            if (dataToDisplay.socialTg && dataToDisplay.socialTg.startsWith('http')) {
                const aTg = document.createElement('a');
                aTg.href = dataToDisplay.socialTg;
                aTg.target = "_blank";
                aTg.className = "social-link";
                aTg.title = "Telegram";
                aTg.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.89 8.24l-1.97 9.28c-.14.65-.53.81-1.07.51l-2.96-2.18-1.43 1.38c-.16.16-.29.29-.6.29l.21-3.02 5.5-4.97c.24-.22-.05-.34-.37-.13l-6.79 4.27-2.93-.92c-.64-.2-.65-.64.13-.95l11.45-4.41c.53-.2.99.11.83.85z"/></svg>`;
                socialsContainer.appendChild(aTg);
            }
            if (dataToDisplay.socialVk && dataToDisplay.socialVk.startsWith('http')) {
                const aVk = document.createElement('a');
                aVk.href = dataToDisplay.socialVk;
                aVk.target = "_blank";
                aVk.className = "social-link";
                aVk.title = "VK";
                aVk.innerHTML = `<svg viewBox="0 0 24 24"><path d="M23.1 7.2c.2-.6 0-1.1-.9-1.1h-2.6c-.7 0-1.1.4-1.4.9 0 0-1.3 3.2-3.2 5.3-.6.6-.9.8-1.3.8-.2 0-.4-.2-.4-.7V7.1c0-.7-.2-1.1-.8-1.1h-4.4c-.4 0-.7.3-.7.6 0 .6 1 .8 1.1 2.6v3.9c0 .9-.2 1.1-.5 1.1-.9 0-3.3-3.2-4.6-6.9-.3-.8-.6-1.1-1.3-1.1H.5c-.8 0-.9.4-.9.9 0 1 1.3 6.1 6.1 12.8 3.2 4.6 7.6 7.1 11.6 7.1 2.4 0 2.7-.5 2.7-1.4V20c0-.8.2-1 .7-1 .4 0 1.1.2 2.7 1.7 1.9 1.9 2.2 2.8 3.3 2.8h2.6c.8 0 1.2-.4 1-.1-.3-.6-1.5-2.2-3-3.8-1.3-1.5-1.7-2.1-2.2-2.8-.6-.7-.4-1 0-1.6 0-.1 2.9-4.1 3.2-5z"/></svg>`;
                socialsContainer.appendChild(aVk);
            }
        }

    } else {
        const menuDisplayName = document.getElementById('menuDisplayName');
        if (menuDisplayName) menuDisplayName.innerText = 'Авторизуйтесь';
        isEditingProfile = false;
        showSection(authSec, "Вход");
    }
}

const trigger = document.getElementById('subTrigger');
const subContainer = document.getElementById('subscriptionContainer');

if (trigger && subContainer) {
    trigger.removeAttribute('onclick'); 
    trigger.addEventListener('click', () => {
        subContainer.classList.toggle('hidden');
        if (!subContainer.classList.contains('hidden')) {
            setTimeout(() => { subContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); 
        }
    });
}

// Отслеживание сессии Firebase
onAuthStateChanged(auth, (user) => {
    checkUserState(user);
    const gear = document.getElementById('menuSettingsBtn');
    if (gear) gear.classList.toggle('hidden', !user);
});

const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await signOut(auth);
    });
}

// ==========================================
// ИНТЕГРАЦИЯ ТЕХПОДДЕРЖКИ В TELEGRAM (С ФИКСАМИ)
// ==========================================
const TG_BOT_TOKEN = "8717937977:AAGZcfvBZhu818aKp-o2RSpDr7bk5-dy8qA"; 
const TG_ADMIN_CHAT_ID = "-1003780021925"; 

const navSupportBtn = document.getElementById('navSupport');
const supportModalOverlay = document.getElementById('supportModalOverlay');
const closeSupportModal = document.getElementById('closeSupportModal');
const btnSubmitSupport = document.getElementById('btnSubmitSupport');

let lastTgSentTime = 0; // ФИКС: Переменная для таймера спама

if (navSupportBtn && supportModalOverlay) {
    navSupportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMenu(); 
        document.getElementById('supportNickname').value = currentUserData ? currentUserData.nickname : 'Аноним';
        supportModalOverlay.style.display = 'flex'; 
    });
    
    closeSupportModal.addEventListener('click', () => {
        supportModalOverlay.style.display = 'none';
    });

    btnSubmitSupport.addEventListener('click', async () => {
        // ФИКС: Защита от спама (1 сообщение в 2 минуты)
        if (Date.now() - lastTgSentTime < 120000) {
            return alert("Пожалуйста, подождите 2 минуты перед следующей отправкой.");
        }

        const reason = document.getElementById('supportReason').value;
        const msg = document.getElementById('supportMessage').value.trim();
        const nick = document.getElementById('supportNickname').value;

        if (!reason || !msg) {
            return alert("Пожалуйста, выберите причину и напишите текст обращения.");
        }
        
        // ФИКС: Ограничение длины сообщения
        if (msg.length > 500) return alert("Сообщение слишком длинное (максимум 500 символов).");

        toggleButtonLoading('btnSubmitSupport', true, 'Отправка...');

        // ФИКС XSS в Telegram: Экранируем HTML теги
        const safeMsg = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const textMsg = `🚨 <b>Новое обращение из Project Faceit</b>\n\n👤 <b>От:</b> ${nick}\n📌 <b>Категория:</b> ${reason}\n\n📝 <b>Сообщение:</b>\n${safeMsg}`;

        try {
            const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_ADMIN_CHAT_ID,
                    text: textMsg,
                    parse_mode: 'HTML'
                })
            });

            if (response.ok) {
                alert("Ваше обращение успешно отправлено администрации!");
                lastTgSentTime = Date.now(); // Записываем время успешной отправки
                supportModalOverlay.style.display = 'none';
                document.getElementById('supportMessage').value = '';
                document.getElementById('supportReason').value = '';
            } else {
                const errData = await response.json();
                console.error("TG API Ошибка:", errData);
                throw new Error("Telegram API вернул ошибку.");
            }
        } catch (error) {
            console.error("Ошибка TG:", error);
            alert("Ошибка при отправке. Проверьте настройки бота или попробуйте позже.");
        } finally {
            toggleButtonLoading('btnSubmitSupport', false, 'Отправить сообщение');
        }
    });
}
