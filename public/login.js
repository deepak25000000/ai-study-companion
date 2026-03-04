// ==================== FIREBASE CONFIG ====================
// Replace these with your actual Firebase config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCEDNgJs47VCGXL4LlC8I1Y0wHOzeOd7e0",
    authDomain: "ai-study-buddy-292bc.firebaseapp.com",
    projectId: "ai-study-buddy-292bc",
    storageBucket: "ai-study-buddy-292bc.firebasestorage.app",
    messagingSenderId: "678666431838",
    appId: "1:678666431838:web:26c666c34326d3a0e5b3cf",
    measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
let firebaseInitialized = false;
try {
    firebase.initializeApp(firebaseConfig);
    firebaseInitialized = true;
} catch (e) {
    console.warn('Firebase not configured. Google Sign-In will be unavailable.');
}

// ==================== DOM ELEMENTS ====================
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const tabIndicator = document.getElementById('tabIndicator');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');
const googleSignInBtn = document.getElementById('googleSignInBtn');

// ==================== CHECK IF ALREADY LOGGED IN ====================
(function checkAuth() {
    const token = localStorage.getItem('studyBuddyToken');
    if (token) {
        window.location.href = '/';
    }
})();

// ==================== TAB SWITCHING ====================
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    tabIndicator.classList.remove('right');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    hideMessage();
});

registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    tabIndicator.classList.add('right');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    hideMessage();
});

// ==================== PASSWORD TOGGLE ====================
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

// ==================== MESSAGE HELPERS ====================
function showMessage(text, type = 'error') {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
}

function hideMessage() {
    authMessage.className = 'auth-message';
    authMessage.textContent = '';
}

function setLoading(btn, loading) {
    if (loading) {
        btn.classList.add('loading');
    } else {
        btn.classList.remove('loading');
    }
}

// ==================== LOGIN ====================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showMessage('Please fill in all fields.');
        return;
    }

    const btn = document.getElementById('loginBtn');
    setLoading(btn, true);

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || 'Login failed.');
            setLoading(btn, false);
            return;
        }

        // Save token and user data
        localStorage.setItem('studyBuddyToken', data.token);
        localStorage.setItem('studyBuddyUser', JSON.stringify(data.user));

        showMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => { window.location.href = '/'; }, 800);

    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please try again.');
        setLoading(btn, false);
    }
});

// ==================== REGISTER ====================
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password) {
        showMessage('Name, email, and password are required.');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters.');
        return;
    }

    const btn = document.getElementById('registerBtn');
    setLoading(btn, true);

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || 'Registration failed.');
            setLoading(btn, false);
            return;
        }

        // Save token and user data
        localStorage.setItem('studyBuddyToken', data.token);
        localStorage.setItem('studyBuddyUser', JSON.stringify(data.user));

        showMessage('Account created! Redirecting...', 'success');
        setTimeout(() => { window.location.href = '/'; }, 800);

    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Network error. Please try again.');
        setLoading(btn, false);
    }
});

// ==================== GOOGLE SIGN IN ====================
googleSignInBtn.addEventListener('click', async () => {
    if (!firebaseInitialized) {
        showMessage('Google Sign-In is not configured. Please set up Firebase.');
        return;
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');

        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;

        showMessage('Google authentication successful...', 'success');

        // Send to our backend
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL
            })
        });

        const data = await res.json();

        if (!res.ok) {
            showMessage(data.error || 'Google auth failed.');
            return;
        }

        // Save token and user data
        localStorage.setItem('studyBuddyToken', data.token);
        localStorage.setItem('studyBuddyUser', JSON.stringify(data.user));

        showMessage('Welcome! Redirecting...', 'success');
        setTimeout(() => { window.location.href = '/'; }, 800);

    } catch (error) {
        console.error('Google Sign-In error:', error);
        if (error.code === 'auth/popup-closed-by-user') {
            showMessage('Sign-in popup was closed. Please try again.');
        } else if (error.code === 'auth/network-request-failed') {
            showMessage('Network error. Check your internet connection.');
        } else {
            showMessage('Google Sign-In failed. Please try again.');
        }
    }
});
