// Handle password visibility toggle
function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    }
}

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('loginBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
            btn.disabled = true;
            
            const res = await apiFetch('/auth/students/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            if (res && res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                
                if (data.onboardingComplete === false) {
                    window.location.href = 'onboarding.html';
                } else {
                    window.location.href = 'dashboard.html';
                }
            } else {
                // Try authority login if student login fails
                const authRes = await apiFetch('/auth/authority/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                if (authRes && authRes.ok) {
                    const data = await authRes.json();
                    localStorage.setItem('token', data.token);
                    window.location.href = 'dashboard.html';
                } else {
                    const error = await res.text();
                    const authError = await authRes.text();
                    alert('Login failed. Please check your credentials.');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred during login');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// Register
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirmPassword').value;
        
        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }
        
        const btn = document.getElementById('registerBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
            btn.disabled = true;
            
            const res = await apiFetch('/auth/students/register', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            if (res && res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                window.location.href = 'onboarding.html';
            } else {
                const error = await res.text();
                alert('Registration failed: ' + error);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred during registration');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// Onboarding
const onboardingForm = document.getElementById('onboardingForm');
if (onboardingForm) {
    onboardingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const universityId = document.getElementById('universityId').value;
        const departmentId = document.getElementById('departmentId').value;
        
        const btn = document.getElementById('onboardingBtn');
        const originalText = btn.innerHTML;
        
        try {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;
            
            const res = await apiFetch('/students/me/onboarding', {
                method: 'PUT',
                body: JSON.stringify({
                    fullName,
                    universityId,
                    departmentId: parseInt(departmentId)
                })
            });
            
            if (res && res.ok) {
                window.location.href = 'dashboard.html';
            } else {
                const error = await res.text();
                alert('Onboarding failed: ' + error);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred during onboarding');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}
