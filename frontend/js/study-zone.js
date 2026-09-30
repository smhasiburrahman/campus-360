/* study-zone.js */

document.addEventListener('DOMContentLoaded', () => {
    initAddSessionModal();
    loadStudySessions();
});

function initAddSessionModal() {
    const modal = document.getElementById('addSessionModal');
    const openBtn = document.getElementById('openAddSessionBtn');
    const closeBtn = document.getElementById('closeSessionModalBtn');
    const cancelBtn = document.getElementById('cancelSessionModalBtn');
    const form = document.getElementById('addSessionForm');
    const submitBtn = document.getElementById('submitSessionBtn');

    if (!modal || !openBtn) return;

    const closeModal = () => {
        modal.style.display = 'none';
        form.reset();
    };

    openBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        // Set default time to now + 1 hour
        const now = new Date();
        now.setHours(now.getHours() + 1);
        
        // Convert to local time string matching the input format (yyyy-MM-ddThh:mm)
        const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        document.getElementById('sessionTime').value = localNow.toISOString().slice(0, 16);
    });

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;

        try {
            const timeValue = document.getElementById('sessionTime').value;
            
            const payload = {
                subjectText: document.getElementById('sessionSubject').value.trim(),
                studyTime: timeValue + ':00', // API expects yyyy-MM-dd'T'HH:mm:ss
                peerLimit: parseInt(document.getElementById('sessionLimit').value, 10),
                tutorNeeded: document.getElementById('sessionTutor').checked,
                mode: document.getElementById('sessionMode').value.toUpperCase(),
                description: document.getElementById('sessionDescription').value.trim()
            };

            const res = await apiFetch('/study-sessions', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                closeModal();
                loadStudySessions();
            } else {
                alert('Failed to create session. Please try again.');
            }
        } catch (err) {
            console.error('Error creating session:', err);
            alert('An error occurred while creating the session.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

async function loadStudySessions() {
    const feed = document.getElementById('studyFeed');
    if (!feed) return;
    
    feed.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';
    
    try {
        const res = await apiFetch('/study-sessions?size=50');
        if (res && res.ok) {
            const data = await res.json();
            const sessions = data.content || [];
            renderStudySessions(sessions);
        } else {
            feed.innerHTML = '<div class="empty-state"><p>Could not load study sessions.</p></div>';
        }
    } catch (err) {
        console.error('Error loading study sessions:', err);
        feed.innerHTML = '<div class="empty-state"><p>Error connecting to server.</p></div>';
    }
}

function renderStudySessions(sessions) {
    const feed = document.getElementById('studyFeed');
    if (!sessions || sessions.length === 0) {
        feed.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-book-open"></i></div>
                <h3>No Study Sessions</h3>
                <p>There are no active study sessions right now. Be the first to create one!</p>
            </div>
        `;
        return;
    }
    
    feed.innerHTML = sessions.map(session => {
        const timeAgo = formatTimeAgo(session.createdAt);
        const studyTime = formatStudyTime(session.studyTime);
        const initials = (session.studentName || 'S').substring(0, 2).toUpperCase();
        
        const modeBadge = session.mode === 'OFFLINE' 
            ? `<span class="offline-badge"><i class="fa-solid fa-location-dot"></i> Offline</span>`
            : `<span class="offline-badge" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;"><i class="fa-solid fa-video"></i> Online</span>`;
            
        const joinedClass = session.isJoined ? 'joined' : '';
        const joinedText = session.isJoined ? 'Joined' : 'Join Session';
        
        const joinBtnHtml = session.isJoined && session.studentName === window.currentUser?.name
            ? `<button class="btn-join joined" disabled>Your Session</button>`
            : `<button class="btn-join ${joinedClass}" data-action="join" data-session-id="${session.id}">${joinedText}</button>`;
            
        const progressPercentage = session.peerLimit > 0 ? Math.min(100, (session.participantCount / session.peerLimit) * 100) : 0;
        
        return `
            <article class="post-card study-post" data-post-id="${session.id}">
                <div class="post-header">
                    <div class="post-avatar">${initials}</div>
                    <div class="post-meta">
                        <h4>${escapeHtml(session.studentName)} <span class="tag-pill study-tag">Study Zone</span></h4>
                        <p>${timeAgo}</p>
                    </div>
                </div>

                <div class="post-content">
                    <h3>${escapeHtml(session.subjectText || session.courseName || 'Study Session')}</h3>

                    <div class="study-info-row">
                        ${session.courseCode ? `<span class="info-chip"><i class="fa-solid fa-book"></i> ${escapeHtml(session.courseCode)}</span>` : ''}
                        <span class="info-chip"><i class="fa-regular fa-calendar"></i> ${studyTime}</span>
                        ${modeBadge}
                    </div>

                    <p>${escapeHtml(session.description || '')}</p>

                    <div class="study-progress-row">
                        <span class="study-joined-count" id="joined-count-${session.id}"><i class="fa-solid fa-users"></i> ${session.participantCount}${session.peerLimit ? `/${session.peerLimit}` : ''} joined</span>
                        ${session.peerLimit ? `
                        <div class="study-progress-bar">
                            <div class="study-progress-fill" id="progress-fill-${session.id}" style="width: ${progressPercentage}%;"></div>
                        </div>` : ''}
                        ${joinBtnHtml}
                    </div>
                </div>

                <div class="post-actions">
                    <button class="action-btn" data-action="like" onclick="handleLike(this)">
                        <i class="fa-regular fa-heart"></i> <span class="like-count">0</span>
                    </button>
                    <button class="action-btn" data-action="bookmark" onclick="handleBookmark(this)">
                        <i class="fa-regular fa-bookmark"></i>
                    </button>
                </div>
            </article>
        `;
    }).join('');
    
    // Attach event listeners for join buttons
    document.querySelectorAll('#studyFeed .btn-join').forEach(btn => {
        if (!btn.disabled && !btn.classList.contains('joined')) {
            btn.addEventListener('click', () => handleJoinSession(btn.dataset.sessionId, btn));
        } else if (btn.classList.contains('joined') && !btn.disabled) {
             btn.addEventListener('click', () => handleLeaveSession(btn.dataset.sessionId, btn));
        }
    });
}

async function handleJoinSession(sessionId, btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    try {
        const res = await apiFetch(`/study-sessions/${sessionId}/participants`, { method: 'POST' });
        if (res && res.ok) {
            btn.textContent = 'Joined';
            btn.classList.add('joined');
            
            // Re-bind to leave
            btn.removeEventListener('click', () => handleJoinSession(sessionId, btn));
            btn.addEventListener('click', () => handleLeaveSession(sessionId, btn));
            
            // Reload the feed to get updated count and progress bar
            loadStudySessions(); 
        } else {
            btn.textContent = originalText;
            alert('Failed to join session');
        }
    } catch (err) {
        console.error(err);
        btn.textContent = originalText;
    } finally {
        btn.disabled = false;
    }
}

async function handleLeaveSession(sessionId, btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    try {
        const res = await apiFetch(`/study-sessions/${sessionId}/participants/me`, { method: 'DELETE' });
        if (res && res.ok) {
            btn.textContent = 'Join Session';
            btn.classList.remove('joined');
            
            // Re-bind to join
            btn.removeEventListener('click', () => handleLeaveSession(sessionId, btn));
            btn.addEventListener('click', () => handleJoinSession(sessionId, btn));
            
            // Reload the feed to get updated count and progress bar
            loadStudySessions();
        } else {
            btn.textContent = originalText;
            alert('Failed to leave session');
        }
    } catch (err) {
        console.error(err);
        btn.textContent = originalText;
    } finally {
        btn.disabled = false;
    }
}

function handleLike(likeBtn) {
    const countEl = likeBtn.querySelector('.like-count');
    const icon = likeBtn.querySelector('i');
    if (!countEl) return;

    let count = parseInt(countEl.textContent, 10) || 0;
    const isLiked = likeBtn.classList.toggle('liked');

    count = isLiked ? count + 1 : count - 1;
    countEl.textContent = count;

    if (icon) {
        icon.classList.toggle('fa-regular', !isLiked);
        icon.classList.toggle('fa-solid', isLiked);
    }

    if (isLiked) {
        likeBtn.style.color = '#ef4444';
    } else {
        likeBtn.style.color = '';
    }
}

function handleBookmark(bookmarkBtn) {
    const icon = bookmarkBtn.querySelector('i');
    const isSaved = bookmarkBtn.classList.toggle('active');

    if (icon) {
        icon.classList.toggle('fa-regular', !isSaved);
        icon.classList.toggle('fa-solid', isSaved);
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function formatStudyTime(dateString) {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}