document.addEventListener('DOMContentLoaded', () => {
    // Topbar Profile Init
    const avatar = document.getElementById('topbarAvatar');
    const name = document.getElementById('topbarName');
    async function fetchUserProfile() {
        try {
            const res = await apiFetch('/students/me');
            if (res && res.ok) {
                const user = await res.json();
                name.textContent = user.fullName;
                const initials = user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                avatar.textContent = initials;
                
                document.getElementById('shareMaterialBtn').style.display = 'inline-flex';
            }
        } catch (err) {
            console.error('Failed to load user profile', err);
        }
    }
    fetchUserProfile();

    // Dropdown toggle
    const toggle = document.getElementById('userProfileDropdownToggle');
    const menu = document.getElementById('profileDropdownMenu');
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', () => {
        menu.style.display = 'none';
    });

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
    
    // Semantic Search functionality
    const semanticSearchBtn = document.getElementById('semanticSearchBtn');
    const semanticSearchInput = document.getElementById('semanticSearchInput');
    const semanticCourseSelect = document.getElementById('semanticCourseSelect');
    
    if (semanticSearchBtn) {
        semanticSearchBtn.addEventListener('click', async () => {
            const query = semanticSearchInput.value.trim();
            const courseId = semanticCourseSelect.value;
            const feed = document.getElementById('materialsFeed');
            
            if (!query) {
                fetchMaterials(); // reset
                return;
            }
            
            feed.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top:2rem;"><i class="fas fa-spinner fa-spin"></i> AI is searching conceptually...</p>';
            
            try {
                let url = `/materials/semantic-search?q=${encodeURIComponent(query)}`;
                if (courseId) {
                    url += `&courseId=${courseId}`;
                }
                
                const res = await apiFetch(url);
                if (res && res.ok) {
                    const results = await res.json();
                    renderSemanticResults(results, feed);
                } else {
                    feed.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top:2rem;">Search failed.</p>';
                }
            } catch (err) {
                feed.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top:2rem;">Error connecting to AI search.</p>';
            }
        });
        
        semanticSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') semanticSearchBtn.click();
        });
    }

    function renderSemanticResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top:2rem;">No conceptual matches found.</p>';
            return;
        }
        
        container.innerHTML = `<h3 style="margin-bottom: 1rem; color: var(--primary-color);"><i class="fas fa-robot"></i> AI Found ${results.length} relevant snippet(s)</h3>` + results.map(mat => {
            // Fix API base URL path if needed
            let linkUrl = mat.fileUrl || '#';
            if (linkUrl && linkUrl.startsWith('/uploads')) {
                const backendHost = API_BASE_URL.replace('/api/v1', '');
                linkUrl = backendHost + linkUrl;
            }
            
            return `
                <div class="post-card material-card" style="border-left: 4px solid var(--primary-color);">
                    <div class="material-body" style="padding-top: 0;">
                        <div class="material-icon-box" style="background: rgba(79, 70, 229, 0.1); color: var(--primary-color);">
                            <i class="fas fa-brain"></i>
                        </div>
                        <div style="flex:1;">
                            <div class="material-details">
                                <h3>${mat.fileName || 'Document Snippet'}</h3>
                            </div>
                            <div style="margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; font-style: italic; color: #475569;">
                                "...${mat.textSnippet}..."
                            </div>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; justify-content: center;">
                            <a href="${linkUrl}" target="_blank" download class="material-visit-btn">
                                <i class="fas fa-download"></i> Download
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Modals
    const shareModal = document.getElementById('shareMaterialModal');
    const shareBtn = document.getElementById('shareMaterialBtn');
    const closeShareBtn = document.getElementById('closeMaterialModal');
    
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            shareModal.style.display = 'flex';
        });
    }

    closeShareBtn.addEventListener('click', () => {
        shareModal.style.display = 'none';
    });

    // Preview Modal
    const closePreviewBtn = document.getElementById('closePreviewModal');
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', () => {
            document.getElementById('previewModal').style.display = 'none';
            document.getElementById('previewContainer').innerHTML = '';
        });
    }

    // Form Submission
    document.getElementById('shareMaterialForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitMaterialBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Uploading file...';
        submitBtn.disabled = true;

        try {
            const fileInput = document.getElementById('materialFile');
            if (!fileInput.files || fileInput.files.length === 0) {
                alert('Please select a file to upload.');
                return;
            }

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            const uploadRes = await apiFetch('/materials/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes || !uploadRes.ok) {
                alert('File upload failed.');
                return;
            }

            const uploadData = await uploadRes.json();
            
            submitBtn.textContent = 'Sharing...';

            const payload = {
                title: document.getElementById('materialTitle').value,
                departmentId: parseInt(document.getElementById('materialDepartment').value),
                courseId: parseInt(document.getElementById('materialCourse').value),
                trimesterId: parseInt(document.getElementById('materialTrimester').value),
                description: document.getElementById('materialDescription').value,
                files: [
                    {
                        fileType: document.getElementById('materialType').value,
                        fileUrl: uploadData.fileUrl,
                        originalFilename: uploadData.originalFilename
                    }
                ]
            };

            const res = await apiFetch('/materials', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res && res.ok) {
                shareModal.style.display = 'none';
                e.target.reset();
                fetchMaterials();
            } else {
                alert('Failed to share material.');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred while sharing material.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Fetch reference data for dropdowns
    fetchDepartments();
    fetchCourses();
    fetchTrimesters();

    // Fetch lists
    fetchMaterials();
    fetchWidgets();
});

async function fetchDepartments() {
    try {
        const res = await apiFetch('/departments');
        if (res && res.ok) {
            const depts = await res.json();
            const select = document.getElementById('materialDepartment');
            depts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = d.name;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error("Could not fetch departments"); }
}

async function fetchCourses() {
    try {
        const res = await apiFetch('/courses');
        if (res && res.ok) {
            const courses = await res.json();
            const select = document.getElementById('materialCourse');
            const searchSelect = document.getElementById('semanticCourseSelect');
            courses.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.courseName;
                select.appendChild(opt);
                
                if (searchSelect) {
                    const opt2 = document.createElement('option');
                    opt2.value = c.id;
                    opt2.textContent = c.courseName;
                    searchSelect.appendChild(opt2);
                }
            });
        }
    } catch (e) { console.error("Could not fetch courses"); }
}

async function fetchTrimesters() {
    try {
        const res = await apiFetch('/trimesters');
        if (res && res.ok) {
            const trimesters = await res.json();
            const select = document.getElementById('materialTrimester');
            trimesters.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error("Could not fetch trimesters"); }
}

async function fetchMaterials() {
    const feed = document.getElementById('materialsFeed');
    try {
        const res = await apiFetch('/materials?size=50');
        if (res && res.ok) {
            const data = await res.json();
            window.allMaterialsCache = data.content;
            renderMaterials(data.content, feed);
        } else {
            feed.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Failed to load materials.</p>';
        }
    } catch (e) {
        feed.innerHTML = '<p style="text-align: center; color: var(--text-muted);">An error occurred.</p>';
    }
}

function renderMaterials(materials, container) {
    if (materials.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top:2rem;">No materials shared yet.</p>';
        return;
    }
    
    container.innerHTML = materials.map(mat => {
        let avatarText = 'U';
        let authorName = 'Unknown';
        if (mat.postedBy && mat.postedBy.name) {
            authorName = mat.postedBy.name;
            avatarText = authorName.charAt(0).toUpperCase();
        }
        
        let typeStr = 'Material';
        let linkUrl = '#';
        if (mat.files && mat.files.length > 0) {
            typeStr = mat.files[0].fileType || 'Material';
            const rawUrl = mat.files[0].fileUrl;
            // If the URL is relative (starts with /uploads), prepend the backend base URL.
            if (rawUrl && rawUrl.startsWith('/uploads')) {
                const backendHost = API_BASE_URL.replace('/api/v1', '');
                linkUrl = backendHost + rawUrl;
            } else {
                linkUrl = rawUrl || '#';
            }
        }

        const dateStr = new Date(mat.createdAt).toLocaleDateString();

        return `
            <div class="post-card material-card">
                <div class="material-header">
                    <div class="material-avatar">${avatarText}</div>
                    <div class="material-meta">
                        <h4>${authorName} <span class="material-tag"><i class="fas fa-circle" style="font-size:0.5rem; margin-right:0.25rem;"></i>Material Sharing</span></h4>
                        <p>Student &middot; ${dateStr}</p>
                    </div>
                </div>
                
                <div class="material-body">
                    <div class="material-icon-box">
                        <i class="far fa-file-alt"></i>
                    </div>
                    <div style="flex:1;">
                        <div class="material-details">
                            <h3>${mat.title || 'Untitled Material'}</h3>
                            <p class="material-context">${mat.courseName || 'Course'} &middot; ${mat.departmentName || 'Dept'} &middot; ${mat.trimesterName || 'Trimester'}</p>
                        </div>
                        <div class="material-stats">
                            <span class="type-pill">${typeStr}</span>
                            <span class="visit-count"><i class="fas fa-eye"></i> ${mat.visits || 0} visits</span>
                        </div>
                        ${mat.description ? `<p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem;">${mat.description}</p>` : ''}
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${(() => {
                            if (linkUrl === '#') return '';
                            const lowerUrl = linkUrl.toLowerCase();
                            const isPdf = lowerUrl.endsWith('.pdf');
                            const isImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;
                            if (isPdf || isImage) {
                                const safeTitle = (mat.title || 'Preview').replace(/'/g, "\\'");
                                return `<button class="btn btn-outline" onclick="previewFile('${linkUrl}', '${isPdf ? 'pdf' : 'image'}', '${safeTitle}')"><i class="fas fa-eye"></i> Preview</button>`;
                            }
                            return '';
                        })()}
                        <a href="${linkUrl}" target="_blank" download class="material-visit-btn" onclick="incrementVisits(${mat.id})">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                </div>
                
                <div class="material-footer">
                    <button class="action-btn"><i class="far fa-heart"></i> Like</button>
                    <button class="action-btn"><i class="far fa-comment"></i> Comment</button>
                    <button class="action-btn action-right"><i class="far fa-bookmark"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

window.incrementVisits = async function(id) {
    try {
        await apiFetch('/materials/' + id + '/visit', { method: 'POST' });
        // The fetchMaterials could be refreshed if we want to show updated visit count immediately
        // fetchMaterials(); 
    } catch (e) {
        console.error('Failed to increment visits', e);
    }
}

async function fetchWidgets() {
    try {
        const pRes = await apiFetch('/pulse');
        if (pRes && pRes.ok) {
            const data = await pRes.json();
            document.getElementById('pulsePosts').textContent = data.postsToday || 0;
            document.getElementById('pulseComplaints').textContent = data.openComplaints || 0;
            document.getElementById('pulseStudies').textContent = data.activeStudies || 0;
            document.getElementById('pulseMaterials').textContent = data.newMaterials || 0;
        }

        const eRes = await apiFetch('/events?upcoming=true&size=3');
        if (eRes && eRes.ok) {
            const data = await eRes.json();
            const widget = document.getElementById('upcomingEventsWidget');
            widget.innerHTML = '';
            if (data.content.length === 0) {
                widget.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">No upcoming events.</p>';
            } else {
                data.content.forEach(evt => {
                    const dateObj = new Date(evt.eventDate);
                    const month = dateObj.toLocaleString('default', { month: 'short' });
                    const day = dateObj.getDate();
                    widget.innerHTML += `
                        <div class="event-item">
                            <div class="event-date">
                                <span>${month}</span>
                                ${day}
                            </div>
                            <div class="event-details">
                                <h4>${evt.title || 'Untitled Event'}</h4>
                                <p>${evt.postedBy ? evt.postedBy.name : 'Unknown'}</p>
                            </div>
                        </div>
                    `;
                });
            }
        }
    } catch (e) {
        console.error("Widget fetch error", e);
    }
}

window.previewFile = function(url, type, title) {
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('previewContainer');
    document.getElementById('previewModalTitle').textContent = title || 'Preview';
    
    if (type === 'pdf') {
        container.innerHTML = `<iframe src="${url}" width="100%" height="100%" style="border: none;"></iframe>`;
    } else {
        container.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    }
    
    modal.style.display = 'flex';
};
