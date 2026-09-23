// Setup UI logic
document.addEventListener('DOMContentLoaded', () => {
    fetchUserProfile();
    
    // Initialize Select2 for the completed courses multi-select
    $('.js-example-basic-multiple').select2({
        placeholder: "Search for courses...",
        allowClear: true
    });

    // Handle Workload selection
    const workloadOptions = document.querySelectorAll('.workload-option');
    const workloadInput = document.getElementById('workload');
    
    workloadOptions.forEach(option => {
        option.addEventListener('click', () => {
            workloadOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            workloadInput.value = option.dataset.value;
        });
    });

    // Handle Department change to load specializations and courses
    document.getElementById('department').addEventListener('change', async (e) => {
        const deptId = e.target.value;
        const specSelect = document.getElementById('specialization');
        const courseSelect = $('#completedCourses');

        if (!deptId) {
            specSelect.innerHTML = '<option value="">Select Department First...</option>';
            specSelect.disabled = true;
            courseSelect.empty();
            return;
        }

        specSelect.innerHTML = '<option value="">Loading specializations...</option>';
        specSelect.disabled = true;

        try {
            // Load Specializations
            const resSpec = await apiFetch(`/course-planner/specializations?departmentId=${deptId}`);
            const specializations = await resSpec.json();
            
            specSelect.innerHTML = '<option value="">Select a Track/Specialization...</option>';
            specializations.forEach(s => {
                specSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
            specSelect.disabled = false;

            // Load Courses for the "completed" dropdown
            const resCourses = await apiFetch(`/course-planner/curriculum?departmentId=${deptId}`);
            const courses = await resCourses.json();
            
            courseSelect.empty();
            courses.forEach(c => {
                const newOption = new Option(`${c.courseCode} - ${c.courseName}`, c.courseCode, false, false);
                courseSelect.append(newOption);
            });
            courseSelect.trigger('change');

        } catch (error) {
            console.error("Failed to load department metadata:", error);
            alert("Failed to load data. Please try again.");
        }
    });

    // Handle Form Submit
    document.getElementById('plannerForm').addEventListener('submit', handleGeneratePlan);
});

// Wizard Navigation
function nextStep(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
}

function prevStep(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
}

// Reset Planner
function resetPlanner() {
    document.getElementById('resultsView').style.display = 'none';
    document.getElementById('setupWizard').style.display = 'block';
    nextStep(1);
}

// Generate Plan Logic
async function handleGeneratePlan(e) {
    e.preventDefault();
    
    const deptId = document.getElementById('department').value;
    const specId = document.getElementById('specialization').value;
    
    if (!deptId || !specId) {
        alert("Please select both a department and a specialization.");
        return;
    }

    // Gather data
    const requestData = {
        departmentId: parseInt(deptId),
        specializationId: parseInt(specId),
        currentTrimester: 1, // Currently defaulting to freshman start
        workloadPref: document.getElementById('workload').value,
        interestText: document.getElementById('interests').value,
        completedCourseCodes: $('#completedCourses').val() || [],
        avoidCourseCodes: [],
        skipTrimesters: []
    };

    // Show Loading
    document.getElementById('setupWizard').style.display = 'none';
    document.getElementById('loadingState').style.display = 'flex';

    try {
        const response = await apiFetch('/course-planner/generate', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to generate plan');
        }

        const planData = await response.json();
        renderPlan(planData);
    } catch (error) {
        console.error("Generation Error:", error);
        alert("Failed to generate plan: " + error.message);
        resetPlanner();
    }
}

// Render the AI result
function renderPlan(plan) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('resultsView').style.display = 'block';

    // Populate header summary
    document.getElementById('resultDeptName').innerText = plan.departmentName;
    document.getElementById('resultSpecName').innerText = `Track: ${plan.specializationName || 'General'}`;
    document.getElementById('resultCredits').innerText = plan.totalCredits;
    document.getElementById('resultSummary').innerText = plan.planSummary;

    // Render Trimesters
    const grid = document.getElementById('trimestersGrid');
    grid.innerHTML = '';

    plan.trimesters.forEach(tri => {
        let coursesHtml = '';
        
        tri.courses.forEach(c => {
            coursesHtml += `
                <div class="course-item course-${c.category}">
                    <div class="course-code-row">
                        <span class="course-code">${c.courseCode}</span>
                        <span class="course-credit-pill">${c.credits} cr</span>
                    </div>
                    <div class="course-name">${c.courseName}</div>
                </div>
            `;
        });

        // Add empty state if no courses
        if (tri.courses.length === 0) {
            coursesHtml = `<div class="course-item" style="border-left-color: #cbd5e1; color: #94a3b8; text-align: center; font-style: italic;">Break / No Courses</div>`;
        }

        const reasoningHtml = tri.reasoning ? `<div class="trimester-reasoning">${tri.reasoning}</div>` : '';

        grid.innerHTML += `
            <div class="trimester-card">
                <div class="trimester-header">
                    <span class="trimester-title">Trimester ${tri.trimesterNumber}</span>
                    <span class="trimester-credits">${tri.totalCredits} cr</span>
                </div>
                <div class="course-list">
                    ${coursesHtml}
                </div>
                ${reasoningHtml}
            </div>
        `;
    });
}

// User Profile & Topbar Logic
async function fetchUserProfile() {
    try {
        const res = await apiFetch('/students/me');
        if (res && res.ok) {
            const user = await res.json();
            document.getElementById('navName').textContent = user.fullName;
            const initials = user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.getElementById('navAvatar').textContent = initials;
        }
    } catch (err) {
        console.error('Failed to load user profile', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (userProfileBtn && profileDropdown) {
        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.style.display = profileDropdown.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', () => {
            profileDropdown.style.display = 'none';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }
});
