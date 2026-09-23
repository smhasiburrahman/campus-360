/* study-zone.js */

document.addEventListener('DOMContentLoaded', () => {
    initFilterTabs();
    initStudyCards();
});


function initFilterTabs() {
    const tabs = document.querySelectorAll('#filterTabs .filter-pill');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.filter;
            filterStudyFeed(filter);
        });
    });
}

function filterStudyFeed(filter) {
    // Mock filtering: on this page only Study Zone posts are loaded,
    // so "All Posts" and "Study Zone" both show everything currently
    // rendered. When backend integration is added, this should request
    // posts by category instead of hiding/showing DOM nodes.
    const cards = document.querySelectorAll('#studyFeed .post-card');

    cards.forEach(card => {
        const matches = filter === 'all' || filter === 'study-zone';
        card.style.display = matches ? '' : 'none';
    });
}

/* ---------------------------------------------------------
   Study session cards: join, like, dislike, bookmark
--------------------------------------------------------- */
function initStudyCards() {
    document.querySelectorAll('#studyFeed .post-card').forEach(card => {
        const joinBtn = card.querySelector('[data-action="join"]');
        const likeBtn = card.querySelector('[data-action="like"]');
        const dislikeBtn = card.querySelector('[data-action="dislike"]');
        const bookmarkBtn = card.querySelector('[data-action="bookmark"]');

        if (joinBtn) {
            joinBtn.addEventListener('click', () => handleJoinSession(card, joinBtn));
        }
        if (likeBtn) {
            likeBtn.addEventListener('click', () => handleLike(likeBtn));
        }
        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', () => handleDislike(dislikeBtn));
        }
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => handleBookmark(bookmarkBtn));
        }
    });
}

function handleJoinSession(card, joinBtn) {
    const joinedEl = card.querySelector('.study-joined-count');
    const progressFill = card.querySelector('.study-progress-fill');
    if (!joinedEl || !progressFill) return;

    if (joinBtn.classList.contains('joined')) {
        return; // already joined in this mock session
    }

    const [current, total] = joinedEl.textContent
        .replace(/[^\d/]/g, '')
        .split('/')
        .map(Number);

    const newCount = Math.min(current + 1, total);
    joinedEl.innerHTML = `<i class="fa-solid fa-users"></i> ${newCount}/${total} joined`;
    progressFill.style.width = `${(newCount / total) * 100}%`;

    joinBtn.textContent = 'Joined';
    joinBtn.classList.add('joined');

    // TODO: replace with real API call once backend endpoint exists, e.g.
    // api.post(`/study-sessions/${card.dataset.postId}/join`)
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

function handleDislike(dislikeBtn) {
    dislikeBtn.classList.toggle('active');
}

function handleBookmark(bookmarkBtn) {
    const icon = bookmarkBtn.querySelector('i');
    const isSaved = bookmarkBtn.classList.toggle('active');

    if (icon) {
        icon.classList.toggle('fa-regular', !isSaved);
        icon.classList.toggle('fa-solid', isSaved);
    }
}