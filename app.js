import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, query, where, getDocs, collection, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAuQJaKE1GS4D6GbqZfhOtTij-GXIvQF1w",
    authDomain: "project-faceit-22088.firebaseapp.com",
    projectId: "project-faceit-22088",
    storageBucket: "project-faceit-22088.appspot.com",
    messagingSenderId: "681525286192",
    appId: "1:681525286192:web:42dee0506a6c2cf32b64f5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Секции сайта
const authSec = document.getElementById('authSection');
const profileSec = document.getElementById('profileSection');
const setupSec = document.getElementById('setupSection');
const mainSec = document.getElementById('mainSection');
const btnCancelSetup = document.getElementById('btnCancelSetup');

let isEditingProfile = false;
let currentUserData = null;

// ==========================================
// ЛОГИКА НАВИГАЦИИ ПО САЙТУ
// ==========================================

function showSection(sectionElem, titleString) {
    [authSec, profileSec, setupSec, mainSec].forEach(sec => {
        if(sec) sec.classList.add('hidden');
    });
    if(sectionElem) sectionElem.classList.remove('hidden');
    document.title = "Project Faceit | " + titleString;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// ЛОГИКА ИНТЕРФЕЙСА (МЕНЮ, ВКЛАДКИ)
// ==========================================

const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');

function toggleMenu() {
    if (!auth.currentUser) {
        alert("Пожалуйста, зарегистрируйтесь или войдите в аккаунт, чтобы открыть меню.");
        return;
    }
    sideMenu.classList.toggle('open');
    menuOverlay.classList.toggle('active');
    menuToggle.classList.toggle('active'); 
    document.body.classList.toggle('menu-open'); 
}

menuToggle.addEventListener('click', toggleMenu);
menuOverlay.addEventListener('click', toggleMenu);

// Клик на логотип или "Главная"
document.getElementById('navMain').addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu(); // Закрываем меню
    showSection(mainSec, "Главная");
});
document.getElementById('logoToMain').addEventListener('click', () => {
    if(auth.currentUser) showSection(mainSec, "Главная");
});

// Закрытие меню при клике на имя (открытие профиля)
document.getElementById('menuDisplayName').addEventListener('click', () => {
    toggleMenu();
    if(currentUserData && currentUserData.nickname) {
        showSection(profileSec, currentUserData.nickname);
    }
});

// Обработка клика по ссылкам в разработке
document.querySelectorAll('.dev-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Этот раздел находится в разработке.');
    });
});

// Логика переключения вкладок профиля
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
        document.getElementById(targetId).classList.remove('hidden');
        document.getElementById(targetId).classList.add('active');
    });
});

// ==========================================
// ЛОГИКА ПОИСКА И СТАТИСТИКИ САЙТА
// ==========================================

const searchInput = document.getElementById('menuSearchInput');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', async (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (val.length < 2) {
        searchResults.style.display = 'none';
        return;
    }
    
    try {
        const coll = collection(db, "players");
        const snap = await getDocs(coll);
        searchResults.innerHTML = '';
        let found = 0;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.nickname && data.nickname.toLowerCase().includes(val)) {
                found++;
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerText = data.clanTag ? `[${data.clanTag}] ${data.nickname}` : data.nickname;
                div.onclick = () => alert(`Переход в профиль: ${data.nickname} (В разработке)`);
                searchResults.appendChild(div);
            }
        });

        if (found === 0) {
            searchResults.innerHTML = '<div class="search-item" style="color:#aaa;">Никто не найден</div>';
        }
        searchResults.style.display = 'block';
    } catch(err) {
        console.error("Ошибка поиска:", err);
    }
});

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
    }
});

async function updateOnlineStats() {
    try {
        const coll = collection(db, "players");
        const snapshot = await getCountFromServer(coll);
        const totalUsers = snapshot.data().count;
        
        document.getElementById('menuRegisteredCount').innerText = totalUsers;
        const simulatedOnline = Math.max(1, Math.floor(totalUsers * 0.25) + Math.floor(Math.random() * 5));
        document.getElementById('menuOnlineCount').innerText = simulatedOnline;
    } catch(e) { 
        console.error("Ошибка статистики:", e); 
    }
}
updateOnlineStats();
setInterval(updateOnlineStats, 30000);

// ==========================================
// ЛОГИКА ПРОФИЛЯ И КНОПОК
// ==========================================

const shareBtn = document.getElementById('btnShareProfile');
shareBtn.addEventListener('click', () => {
    if(!currentUserData || !currentUserData.gameId) return;
    
    // Генерируем ссылку с параметром пользователя. Например: /?user=123456
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('user', currentUserData.gameId);
    
    navigator.clipboard.writeText(url.toString()).then(() => {
        alert(`Ссылка на профиль скопирована!\n${url.toString()}`);
    }).catch(err => console.error('Ошибка копирования:', err));
});

const btnSubscribe = document.getElementById('btnSubscribe');
const subsCountEl = document.getElementById('subsCount');
let isSubscribed = false; let currentSubs = 124;

btnSubscribe.addEventListener('click', () => {
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
        currentSubs--;
    }
    subsCountEl.innerText = currentSubs;
});

// Копирование ID
document.getElementById('displayGameId').addEventListener('click', function() {
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

// ==========================================
// АВТОРИЗАЦИЯ И FIREBASE
// ==========================================

const bannerColors = {
    red: { grad: 'linear-gradient(135deg, rgba(255,42,42,0.8), #09090b)', glow: '0 0 25px rgba(255,0,0,0.8)', txt: '#ff0000', hex: '#ff0000' },
    black: { grad: 'linear-gradient(135deg, #333333, #09090b)', glow: '0 0 25px rgba(100,100,100,0.8)', txt: '#aaaaaa', hex: '#666666' },
    pink: { grad: 'linear-gradient(135deg, #ff66b2, #09090b)', glow: '0 0 25px rgba(255,102,178,0.8)', txt: '#ff66b2', hex: '#ff66b2' },
    white: { grad: 'linear-gradient(135deg, #ffffff, #555555)', glow: '0 0 25px rgba(255,255,255,0.7)', txt: '#ffffff', hex: '#ffffff' },
    orange: { grad: 'linear-gradient(135deg, #ff8c00, #09090b)', glow: '0 0 25px rgba(255,140,0,0.8)', txt: '#ff8c00', hex: '#ff8c00' },
    yellow: { grad: 'linear-gradient(135deg, #ffd700, #09090b)', glow: '0 0 25px rgba(255,215,0,0.7)', txt: '#ffd700', hex: '#ffd700' },
    lightblue: { grad: 'linear-gradient(135deg, #00bfff, #09090b)', glow: '0 0 25px rgba(0,191,255,0.8)', txt: '#00bfff', hex: '#00bfff' },
    purple: { grad: 'linear-gradient(135deg, #8a2be2, #09090b)', glow: '0 0 25px rgba(138,43,226,0.8)', txt: '#8a2be2', hex: '#8a2be2' }
};

function getRankDetails(elo) {
    if (elo < 1050) return { rank: "Новичок", color: "#888888", bg: "rgba(136, 136, 136, 0.2)" };
    if (elo < 1150) return { rank: "Бронза", color: "#cd7f32", bg: "rgba(205, 127, 50, 0.2)" };
    if (elo < 1300) return { rank: "Серебро", color: "#c0c0c0", bg: "rgba(192, 192, 192, 0.2)" };
    if (elo < 1500) return { rank: "Золото", color: "#ffd700", bg: "rgba(255, 215, 0, 0.2)" };
    if (elo < 1800) return { rank: "Мастер", color: "#ff2a2a", bg: "rgba(255, 42, 42, 0.2)" };
    return { rank: "Легенда", color: "#cc0000", bg: "rgba(204, 0, 0, 0.2)" };
}

async function checkUnique(field, value, currentUid) {
    const q = query(collection(db, "players"), where(field, "==", value));
    const snap = await getDocs(q);
    let isUnique = true;
    snap.forEach(doc => { if (doc.id !== currentUid) isUnique = false; });
    return isUnique;
}

function toggleButtonLoading(btnId, isLoading, originalText) {
    const btn = document.getElementById(btnId);
    btn.disabled = isLoading;
    btn.innerText = isLoading ? "..." : originalText;
}

// Регистрация
document.getElementById('btnRegister').addEventListener('click', async () => { 
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value.trim();
    if(pass.length < 6) return alert("Пароль минимум 6 символов!");
    toggleButtonLoading('btnRegister', true, 'Создать аккаунт');
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(userCred.user);
        alert("✅ Успешно! Отправлено письмо на почту. Подтверди её, затем войди.");
        await signOut(auth);
    } catch (e) { alert("Ошибка: " + e.message); } 
    finally { toggleButtonLoading('btnRegister', false, 'Создать аккаунт'); }
});

// Логин
document.getElementById('btnLogin').addEventListener('click', async () => { 
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value.trim();
    toggleButtonLoading('btnLogin', true, 'Войти');
    try { 
        const userCred = await signInWithEmailAndPassword(auth, email, pass); 
        if (!userCred.user.emailVerified) {
            alert("⚠️ Почта еще не подтверждена!");
            await signOut(auth);
        }
    } catch (e) { alert("Ошибка входа! Проверьте данные."); } 
    finally { toggleButtonLoading('btnLogin', false, 'Войти'); }
});

document.getElementById('btnGoogle').addEventListener('click', async () => {
    try { await signInWithPopup(auth, googleProvider); } catch (e) { alert("Ошибка Google: " + e.message); }
});

document.getElementById('btnTelegram').addEventListener('click', () => {
    alert("Вход через Telegram в разработке!");
});

// Сохранение и редактирование профиля
document.getElementById('btnSaveSetup').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    const nick = document.getElementById('setupNickname').value.trim();
    const gameId = document.getElementById('setupGameId').value.trim();
    const clanTag = document.getElementById('setupClanTag').value.trim();
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
        if (!currentUserData || nick !== currentUserData.nickname) {
            const isNickUnique = await checkUnique("nickname", nick, user.uid);
            if (!isNickUnique) throw new Error("Этот Никнейм уже занят!");
        }
        if (!currentUserData || gameId !== currentUserData.gameId) {
            const isIdUnique = await checkUnique("gameId", gameId, user.uid);
            if (!isIdUnique) throw new Error("Этот ID уже привязан!");
        }

        await updateDoc(doc(db, "players", user.uid), { 
            nickname: nick, gameId: gameId, clanTag: clanTag || null, 
            role: role || "Рифлер", bannerColor: bannerColor || "red",
            avatar: avatarUrl || user.photoURL || null, 
            profileBanner: profileBannerUrl || null,
            banner: bannerUrl || null,
            socialTg: tgUrl || null, socialVk: vkUrl || null
        });
        
        isEditingProfile = false;
        checkUserState(user); 
    } catch (e) { alert(e.message); } 
    finally { toggleButtonLoading('btnSaveSetup', false, 'Сохранить'); }
});

document.getElementById('btnEditProfile').addEventListener('click', () => {
    if (!currentUserData) return;
    isEditingProfile = true;
    showSection(setupSec, "Редактирование");
    btnCancelSetup.classList.remove('hidden');
    
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

btnCancelSetup.addEventListener('click', () => {
    isEditingProfile = false;
    showSection(profileSec, currentUserData.nickname);
});

// Проверка состояния пользователя
async function checkUserState(user) {
    if (user && user.emailVerified === false && user.providerData[0].providerId === 'password') return;

    if (user) {
        const userRef = doc(db, "players", user.uid);
        let snap = await getDoc(userRef);
        
        if (!snap.exists()) {
            await setDoc(userRef, { email: user.email, elo: 1000, wins: 0, losses: 0, avatar: user.photoURL || null, role: "Рифлер", bannerColor: "red" });
            snap = await getDoc(userRef); 
        }
        
        currentUserData = snap.data();
        const data = currentUserData;
        
        if (!data.nickname || !data.gameId) {
            btnCancelSetup.classList.add('hidden');
            showSection(setupSec, "Настройка профиля");
        } else {
            // При входе пользователя отправляем на Главную страницу
            if(!isEditingProfile) {
                 showSection(mainSec, "Главная");
            }
            
            document.getElementById('menuDisplayName').innerText = data.nickname;
            document.getElementById('displayNickname').innerText = data.nickname;
            const clanDisplay = document.getElementById('displayClanTag');
            clanDisplay.innerText = data.clanTag ? `[${data.clanTag}] ` : '';

            document.getElementById('displayGameId').innerText = data.gameId;
            document.getElementById('displayGameId').setAttribute('data-id', data.gameId);

            const wins = data.wins || 0; const losses = data.losses || 0; const elo = data.elo || 1000;
            document.getElementById('elo').innerText = elo;
            document.getElementById('wins').innerText = wins;
            document.getElementById('losses').innerText = losses;

            try {
                const totalMatches = wins + losses;
                let winRate = "0%";
                if (totalMatches > 0) {
                    const rawWinPct = (wins / totalMatches) * 100;
                    winRate = Math.round(rawWinPct) + "%";
                }
                document.getElementById('winRateTxt').innerText = winRate;
            } catch(e) {}
            
            const safeNick = encodeURIComponent(data.nickname || 'Player');
            const defaultAvatar = `https://ui-avatars.com/api/?name=${safeNick}&background=ff2a2a&color=fff&font-size=0.4`;
            const userAvatarUrl = data.avatar || defaultAvatar;
            
            document.getElementById('userAvatar').src = userAvatarUrl;
            document.getElementById('menuAvatar').src = userAvatarUrl; 
            
            const colorConfig = bannerColors[data.bannerColor || 'red'] || bannerColors['red'];
            const bannerEl = document.getElementById('userBanner');
            const profileBgBanner = document.getElementById('profileBgBanner');
            const menuProfileBg = document.getElementById('menuProfileBg');
            
            const mainAvatarWrap = document.querySelector('.avatar-wrap');
            if(mainAvatarWrap) mainAvatarWrap.style.boxShadow = colorConfig.glow;

            bannerEl.style.boxShadow = colorConfig.glow;
            document.getElementById('eloLabelColor').style.color = colorConfig.txt;

            if(data.banner) bannerEl.style.backgroundImage = `url("${data.banner}")`;
            else bannerEl.style.backgroundImage = colorConfig.grad;

            if(data.profileBanner) {
                profileBgBanner.style.backgroundImage = `url("${data.profileBanner}")`;
                menuProfileBg.style.backgroundImage = `url("${data.profileBanner}")`;
            } else {
                profileBgBanner.style.backgroundImage = 'none';
                menuProfileBg.style.backgroundImage = 'none';
            }

            const rankDetails = getRankDetails(elo);
            const badge = document.getElementById('rankBadge');
            badge.innerText = `${data.role || 'Рифлер'} - ${rankDetails.rank}`;
            badge.style.color = rankDetails.color;
            badge.style.borderColor = rankDetails.color;
            
            const socialsContainer = document.getElementById('socialLinksContainer');
            socialsContainer.innerHTML = '';
            if(data.socialTg) socialsContainer.innerHTML += `<a href="${data.socialTg}" target="_blank" class="social-link" title="Telegram"><svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.89 8.24l-1.97 9.28c-.14.65-.53.81-1.07.51l-2.96-2.18-1.43 1.38c-.16.16-.29.29-.6.29l.21-3.02 5.5-4.97c.24-.22-.05-.34-.37-.13l-6.79 4.27-2.93-.92c-.64-.2-.65-.64.13-.95l11.45-4.41c.53-.2.99.11.83.85z"/></svg></a>`;
            if(data.socialVk) socialsContainer.innerHTML += `<a href="${data.socialVk}" target="_blank" class="social-link" title="VK"><svg viewBox="0 0 24 24"><path d="M23.1 7.2c.2-.6 0-1.1-.9-1.1h-2.6c-.7 0-1.1.4-1.4.9 0 0-1.3 3.2-3.2 5.3-.6.6-.9.8-1.3.8-.2 0-.4-.2-.4-.7V7.1c0-.7-.2-1.1-.8-1.1h-4.4c-.4 0-.7.3-.7.6 0 .6 1 .8 1.1 2.6v3.9c0 .9-.2 1.1-.5 1.1-.9 0-3.3-3.2-4.6-6.9-.3-.8-.6-1.1-1.3-1.1H.5c-.8 0-.9.4-.9.9 0 1 1.3 6.1 6.1 12.8 3.2 4.6 7.6 7.1 11.6 7.1 2.4 0 2.7-.5 2.7-1.4V20c0-.8.2-1 .7-1 .4 0 1.1.2 2.7 1.7 1.9 1.9 2.2 2.8 3.3 2.8h2.6c.8 0 1.2-.4 1-.1-.3-.6-1.5-2.2-3-3.8-1.3-1.5-1.7-2.1-2.2-2.8-.6-.7-.4-1 0-1.6 0-.1 2.9-4.1 3.2-5z"/></svg></a>`;
        }
    } else {
        document.getElementById('menuDisplayName').innerText = 'Авторизуйтесь';
        isEditingProfile = false;
        showSection(authSec, "Вход");
    }
}
// Логика показа списка подписок при клике на эмблему
const subTrigger = document.getElementById('subTrigger');
const subList = document.getElementById('subscriptionList');

if (subTrigger && subList) {
    subTrigger.addEventListener('click', () => {
        // Переключаем класс hidden (показать/скрыть)
        subList.classList.toggle('hidden');
        
        // Плавная прокрутка к списку при открытии
        if (!subList.classList.contains('hidden')) {
            subList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

onAuthStateChanged(auth, checkUserState);
document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));
