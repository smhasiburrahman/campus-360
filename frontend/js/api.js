const API_BASE_URL = 'http://localhost:8080/api/v1';

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };
    
    // If sending FormData, remove Content-Type so browser can set boundary
    if (options.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // Handle 401 Unauthorized (token expired)
        if (response.status === 401 && !endpoint.includes('/auth/')) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
// Initialize currentUser globally by decoding JWT
(function() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            window.currentUser = {
                id: payload.userId || payload.sub,
                accountType: payload.accountType || payload.role,
                role: payload.role || 'ROLE_STUDENT'
            };
        } catch(e) {
            console.error('Failed to parse token payload', e);
        }
    }
})();
