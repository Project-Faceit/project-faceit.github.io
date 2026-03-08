import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://njncknfjtekfkjcceuzc.supabase.co';
const supabaseKey = 'sb_publishable_ug_cy6NOLwIPV7AaBQLrDw_mplsnQ2v';
const supabase = createClient(supabaseUrl, supabaseKey);

// Глобальная переменная для текущего юзера (заменяет auth.currentUser из Firebase)
let currentUser = null; 

async function fetchUserCountry() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Тайм-аут 3 секунды, чтобы сайт не вис
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();
        return data.country_name || "Неизвестно";
    } catch (e) {
        console.error("Ошибка при определении страны:", e);
        return "Неизвестно"; // Мгновенный фоллбэк
    }
}

const authSec = document.getElementById('authSection');
const profileSec = document.getElementById('profileSection');
const setupSec = document.getElementById('setupSection');
const mainSec = document.getElementById('mainSection');
const btnCancelSetup = document.getElementById('btnCancelSetup');

let isEditingProfile = false;
let currentUserData = null; // Данные того, кто залогинен
let viewedProfileUid = null; // UID профиля, который сейчас открыт на экране
let isOwner = true; // Смотрит ли юзер свой собственный профиль

function showSection(sectionElem, titleString) {
    [authSec, profileSec, setupSec, mainSec].forEach(sec => {
        if(sec) sec.classList.add('hidden');
    });
    if(sectionElem) sectionElem.classList.remove('hidden');
    document.title = "Project Faceit | " + titleString;
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
        // Очищаем URL от чужого ID при переходе на главную
        window.history.pushState(null, null, window.location.pathname);
        checkUserState(currentUser); 
        showSection(mainSec, "Главная");
    });
}

const logoToMainEl = document.getElementById('logoToMain');
if (logoToMainEl) {
    logoToMainEl.addEventListener('click', () => {
        if(currentUser) {
            window.history.pushState(null, null, window.location.pathname);
            checkUserState(currentUser);
            showSection(mainSec, "Главная");
        }
    });
}

const menuDisplayNameEl = document.getElementById('menuDisplayName');
if (menuDisplayNameEl) {
    menuDisplayNameEl.addEventListener('click', () => {
        toggleMenu();
        if(currentUserData && currentUserData.nickname) {
            // Возвращаемся в свой профиль
            window.history.pushState(null, null, window.location.pathname);
            checkUserState(currentUser);
        }
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

// Поиск по сайту (Supabase ilike)
const searchInput = document.getElementById('menuSearchInput');
const searchResults = document.getElementById('searchResults');

if (searchInput && searchResults) {
    searchInput.addEventListener('input', async (e) => {
        const rawVal = e.target.value.trim(); 
        if (rawVal.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        const val = rawVal.charAt(0).toUpperCase() + rawVal.slice(1);
        
        try {
            const { data: snap, error } = await supabase
                .from('players')
                .select('*')
                .ilike('nickname', `${val}%`); // Ищет по началу строки без учета регистра

            if (error) throw error;

            searchResults.innerHTML = '';
            let found = 0;

            if (snap && snap.length > 0) {
                snap.forEach(data => {
                    found++;
                    const div = document.createElement('div');
                    div.className = 'search-item';
                    div.innerText = data.clanTag ? `[${data.clanTag}] ${data.nickname}` : data.nickname;
                    div.onclick = () => {
                        toggleMenu(); // Закрываем меню
                        window.history.pushState(null, null, `?user=${data.gameId}`); // Меняем URL
                        checkUserState(currentUser); // Загружаем профиль
                    };
                    searchResults.appendChild(div);
                });
            }

            if (found === 0) {
                searchResults.innerHTML = '<div class="search-item" style="color:#aaa;">Никто не найден</div>';
            }
            searchResults.style.display = 'block';
        } catch(err) {
            console.error("Ошибка поиска:", err);
        }
    });
}

async function updateOnlineStats() {
    try {
        const statsElement = document.getElementById('onlineStats');
        const menuTotalUsers = document.getElementById('menuTotalUsers'); // Элемент в меню

        const { count, error } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true });

        if (!error) {
            if (statsElement) statsElement.innerText = `Игроков в базе: ${count}`;
            if (menuTotalUsers) menuTotalUsers.innerText = count;
        }
    } catch (e) {
        console.error("Ошибка при получении статистики:", e);
    }
}
updateOnlineStats();
setInterval(updateOnlineStats, 60000);

const shareBtn = document.getElementById('btnShareProfile');
if (shareBtn) {
    shareBtn.addEventListener('click', () => {
        // Копируем ссылку на профиль, который сейчас ОТКРЫТ (неважно твой или чужой)
        const gameIdToShare = document.getElementById('displayGameId').getAttribute('data-id');
        if(!gameIdToShare || gameIdToShare === '00000000') return;
        
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('user', gameIdToShare);
        
        navigator.clipboard.writeText(url.toString()).then(() => {
            alert(`Ссылка на профиль скопирована!\n${url.toString()}`);
        }).catch(err => console.error('Ошибка копирования:', err));
    });
}

// Подписки теперь работают корректно
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
            await supabase
                .from('players')
                .update({ subs: currentSubs })
                .eq('id', viewedProfileUid);
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

// Регистрация и логин (Supabase Auth)
const btnRegister = document.getElementById('btnRegister');
if (btnRegister) {
    btnRegister.addEventListener('click', async () => { 
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value.trim();
        if(pass.length < 6) return alert("Пароль минимум 6 символов!");
        toggleButtonLoading('btnRegister', true, 'Создать аккаунт');
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: pass,
            });
            if (error) throw error;
            alert("✅ Успешно! Подтверди почту (если включено в настройках), затем войди.");
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
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: pass,
            });
            if (error) throw error;
        } catch (e) { alert("Ошибка входа! Проверьте данные."); } 
        finally { toggleButtonLoading('btnLogin', false, 'Войти'); }
    });
}

const btnGoogle = document.getElementById('btnGoogle');
if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
        try { 
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' }); 
            if (error) throw error;
        } catch (e) { alert("Ошибка Google: " + e.message); }
    });
}

const btnSaveSetup = document.getElementById('btnSaveSetup');
if (btnSaveSetup) {
    btnSaveSetup.addEventListener('click', async () => {
        if (!currentUser) return;
        
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
            const { error } = await supabase
                .from('players')
                .upsert({ 
                    id: currentUser.id,
                    email: currentUser.email,
                    nickname: nick, gameId: gameId, clanTag: clanTag || null, 
                    role: role || "Рифлер", bannerColor: bannerColor || "red",
                    avatar: avatarUrl || currentUser.user_metadata?.avatar_url || null, profileBanner: profileBannerUrl || null,
                    banner: bannerUrl || null, socialTg: tgUrl || null, socialVk: vkUrl || null
                }, { onConflict: 'id' });
            
            if (error) {
                if (error.code === '23505') {
                    throw new Error("Этот Никнейм или ID уже занят кем-то другим!");
                }
                throw error;
            }
            
            isEditingProfile = false;
            checkUserState(currentUser); 
        } catch (e) { alert(e.message); } 
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


// ==========================================
// ГЛАВНЫЙ РОУТЕР И РЕНДЕР: ЧТЕНИЕ URL
// ==========================================
async function checkUserState(user) {
    currentUser = user; // Обновляем глобальную переменную

    if (user && !user.email_confirmed_at && user.app_metadata?.provider === 'email') {
        supabase.auth.signOut();
        showSection(authSec, "Вход");
        return;
    }

    let dataToDisplay = null;
    isOwner = true;
    viewedProfileUid = null;

    // Читаем ссылку ?user=123456
    const urlParams = new URLSearchParams(window.location.search);
    const targetGameId = urlParams.get('user');

    // Если юзер авторизован - получаем его базовые данные для меню и проверок
    if (user) {
        const { data: snap, error: getError } = await supabase
            .from('players')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (!snap) {
            const country = await fetchUserCountry(); 
            const { data: newUser, error: insertError } = await supabase
                .from('players')
                .insert([{ 
                    id: user.id, email: user.email, elo: 0, wins: 0, losses: 0, subs: 0, 
                    country: country, matchHistory: [], avatar: user.user_metadata?.avatar_url || null, 
                    role: "Рифлер", bannerColor: "red" 
                }])
                .select()
                .single();
            currentUserData = newUser || { id: user.id, email: user.email }; 
        } else {
            currentUserData = snap;
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

    // Решаем чей профиль грузить
    if (targetGameId) {
        if (user && currentUserData && targetGameId === currentUserData.gameId) {
            // Перешел по своей же ссылке
            dataToDisplay = currentUserData;
            viewedProfileUid = user.id;
            isOwner = true;
            window.history.replaceState(null, null, window.location.pathname); // убираем мусор из ссылки
        } else {
            // Загружаем ЧУЖОЙ профиль
            const { data: targetSnap, error } = await supabase
                .from('players')
                .select('*')
                .eq('gameId', targetGameId);
            
            if (targetSnap && targetSnap.length > 0) {
                dataToDisplay = targetSnap[0];
                viewedProfileUid = targetSnap[0].id;
                isOwner = false;
            } else {
                alert("Игрок с таким ID не найден!");
                window.history.replaceState(null, null, window.location.pathname);
                if (user) {
                    dataToDisplay = currentUserData;
                    viewedProfileUid = user.id;
                    isOwner = true;
                }
            }
        }
    } else if (user) {
        // Обычный вход без ссылок
        dataToDisplay = currentUserData;
        viewedProfileUid = user.id;
        isOwner = true;
    }

    // Если данные получены - рисуем страницу профиля/главную
    if (dataToDisplay) {
        if (!isEditingProfile) {
            if (targetGameId) {
                showSection(profileSec, dataToDisplay.nickname);
            } else if (setupSec && !setupSec.classList.contains('hidden')) {
                // Если мы только что закончили настройку профиля - идем в ПРОФИЛЬ
                showSection(profileSec, dataToDisplay.nickname);
            } else if (authSec && !authSec.classList.contains('hidden')) {
                showSection(mainSec, "Главная");
            }
        }

        // Прячем кнопку "Редактировать", если смотрим чужой профиль
        if (btnEditProfile) {
            btnEditProfile.style.display = isOwner ? 'inline-block' : 'none';
        }

        const displayNickname = document.getElementById('displayNickname');
        if (displayNickname) displayNickname.innerText = dataToDisplay.nickname;
        
        const clanDisplay = document.getElementById('displayClanTag');
        if (clanDisplay) clanDisplay.innerText = dataToDisplay.clanTag ? `[${dataToDisplay.clanTag}] ` : '';

        const displayGameId = document.getElementById('displayGameId');
        if (displayGameId) {
            displayGameId.innerText = dataToDisplay.gameId;
            displayGameId.setAttribute('data-id', dataToDisplay.gameId);
        }

        const wins = dataToDisplay.wins || 0; 
        const losses = dataToDisplay.losses || 0; 
        const elo = dataToDisplay.elo || 1000;
        
        document.getElementById('elo').innerText = elo;
        document.getElementById('wins').innerText = wins;
        document.getElementById('losses').innerText = losses;
        document.getElementById('displayCountry').innerText = dataToDisplay.country || "Неизвестно";
        
        currentSubs = dataToDisplay.subs || 0;
        if (subsCountEl) subsCountEl.innerText = currentSubs;

        const recentMatches = document.getElementById('recentMatchesList');
        const allMatches = document.getElementById('allMatchesList');
        if (recentMatches && allMatches) {
            if (!dataToDisplay.matchHistory || dataToDisplay.matchHistory.length === 0) {
                recentMatches.innerHTML = '<div style="padding: 15px; color: var(--text-muted); text-align: center;">Нет сыгранных матчей</div>';
                allMatches.innerHTML = '<div style="padding: 15px; color: var(--text-muted); text-align: center;">Нет сыгранных матчей</div>';
            }
        }

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
        } else if (bannerEl) { bannerEl.style.backgroundImage = colorConfig.grad; }

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
            if (dataToDisplay.socialTg) {
                socialsContainer.innerHTML += `<a href="${dataToDisplay.socialTg}" target="_blank" class="social-link" title="Telegram"><svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.89 8.24l-1.97 9.28c-.14.65-.53.81-1.07.51l-2.96-2.18-1.43 1.38c-.16.16-.29.29-.6.29l.21-3.02 5.5-4.97c.24-.22-.05-.34-.37-.13l-6.79 4.27-2.93-.92c-.64-.2-.65-.64.13-.95l11.45-4.41c.53-.2.99.11.83.85z"/></svg></a>`;
            }
            if (dataToDisplay.socialVk) {
                socialsContainer.innerHTML += `<a href="${dataToDisplay.socialVk}" target="_blank" class="social-link" title="VK"><svg viewBox="0 0 24 24"><path d="M23.1 7.2c.2-.6 0-1.1-.9-1.1h-2.6c-.7 0-1.1.4-1.4.9 0 0-1.3 3.2-3.2 5.3-.6.6-.9.8-1.3.8-.2 0-.4-.2-.4-.7V7.1c0-.7-.2-1.1-.8-1.1h-4.4c-.4 0-.7.3-.7.6 0 .6 1 .8 1.1 2.6v3.9c0 .9-.2 1.1-.5 1.1-.9 0-3.3-3.2-4.6-6.9-.3-.8-.6-1.1-1.3-1.1H.5c-.8 0-.9.4-.9.9 0 1 1.3 6.1 6.1 12.8 3.2 4.6 7.6 7.1 11.6 7.1 2.4 0 2.7-.5 2.7-1.4V20c0-.8.2-1 .7-1 .4 0 1.1.2 2.7 1.7 1.9 1.9 2.2 2.8 3.3 2.8h2.6c.8 0 1.2-.4 1-.1-.3-.6-1.5-2.2-3-3.8-1.3-1.5-1.7-2.1-2.2-2.8-.6-.7-.4-1 0-1.6 0-.1 2.9-4.1 3.2-5z"/></svg></a>`;
            }
        }
    } else {
        // Если вообще нет данных (не авторизован и не пришел по ссылке)
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

// Отслеживание изменений авторизации Supabase (замена onAuthStateChanged)
supabase.auth.onAuthStateChange((event, session) => {
    checkUserState(session?.user || null);
});

const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut();
    });
}
