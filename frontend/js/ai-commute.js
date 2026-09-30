/**
 * Campus 360 Gemini AI Commute Assistant
 * Powered by Google Gemini 2.5 Flash API
 * Combines Official UIU Timetable + Real-Time Live Bus Simulation Status
 * Provides dynamic, real-time, location-aware Banglish commute advice.
 */

(function() {
    // 1. Official UIU Shuttle Timings
    const SCHEDULE_NB_TO_UIU = [
        { time: "07:30 AM", minutes: 7 * 60 + 30, desc: "07:30 AM – 08:45 AM (Continuous peak slots)" },
        { time: "09:25 AM", minutes: 9 * 60 + 25, desc: "09:25 AM – 09:35 AM" },
        { time: "10:45 AM", minutes: 10 * 60 + 45, desc: "10:45 AM – 10:55 AM" },
        { time: "12:05 PM", minutes: 12 * 60 + 5, desc: "12:05 PM – 12:15 PM" },
        { time: "01:25 PM", minutes: 13 * 60 + 25, desc: "01:25 PM – 01:35 PM" },
        { time: "02:45 PM", minutes: 14 * 60 + 45, desc: "02:45 PM – 02:55 PM" },
        { time: "06:10 PM", minutes: 18 * 60 + 10, desc: "06:10 PM" }
    ];

    const SCHEDULE_UIU_TO_NB = [
        { time: "10:05 AM", minutes: 10 * 60 + 5 },
        { time: "11:25 AM", minutes: 11 * 60 + 25 },
        { time: "12:45 PM", minutes: 12 * 60 + 45 },
        { time: "02:05 PM", minutes: 14 * 60 + 5 },
        { time: "03:25 PM", minutes: 15 * 60 + 25 },
        { time: "04:40 PM", minutes: 16 * 60 + 40 },
        { time: "05:45 PM", minutes: 17 * 60 + 45 },
        { time: "07:00 PM", minutes: 19 * 60 + 0 },
        { time: "09:40 PM", minutes: 21 * 60 + 40 }
    ];

    // 2. Gemini 2.5 Flash API Configuration
    const GEMINI_API_KEY = window.GEMINI_API_KEY || (typeof localStorage !== 'undefined' && localStorage.getItem('gemini_api_key')) || atob("QVEuQWI4Uk42SjdRN3dFNHV6emVqd3g2SWlYYjV5VHE0SWJIYkhpZms2R0JVWTlOZGltbUE=");
    const GEMINI_MODEL = "gemini-2.5-flash";
    const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    // Multi-turn conversation state & history
    const chatHistory = [];
    const conversationState = {
        waitingForStop: false,
        lastTopic: null
    };

    document.addEventListener('DOMContentLoaded', () => {
        const triggerBtn = document.getElementById('aiCommuteTriggerBtn');
        const drawer = document.getElementById('aiCommuteDrawer');
        const closeBtn = document.getElementById('aiDrawerCloseBtn');
        const chatForm = document.getElementById('aiChatForm');
        const chatInput = document.getElementById('aiChatInput');
        const chatMessages = document.getElementById('aiChatMessages');

        if (!triggerBtn || !drawer) return;

        // Auto-collapse Active Fleet panel when opening AI Assistant to prevent UI overlap
        function openDrawer() {
            drawer.classList.remove('hidden');
            const glassPanel = document.getElementById('glassPanel');
            const panelToggleIcon = document.getElementById('panelToggleIcon');
            if (glassPanel && !glassPanel.classList.contains('panel-collapsed')) {
                glassPanel.classList.add('panel-collapsed');
                if (panelToggleIcon) {
                    panelToggleIcon.className = 'fa-solid fa-chevron-down';
                }
            }
            if (chatInput) chatInput.focus();
            scrollChatToBottom();
        }

        function closeDrawer() {
            drawer.classList.add('hidden');
        }

        triggerBtn.addEventListener('click', () => {
            if (drawer.classList.contains('hidden')) {
                openDrawer();
            } else {
                closeDrawer();
            }
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', closeDrawer);
        }

        // Tab Switcher Handler
        window.switchAiTab = function(tabName) {
            const chatTabBtn = document.getElementById('tabBtnChat');
            const rushTabBtn = document.getElementById('tabBtnRush');
            const chatView = document.getElementById('aiChatView');
            const rushView = document.getElementById('aiRushView');

            if (tabName === 'chat') {
                if (chatTabBtn) chatTabBtn.classList.add('active');
                if (rushTabBtn) rushTabBtn.classList.remove('active');
                if (chatView) chatView.classList.remove('hidden');
                if (rushView) rushView.classList.add('hidden');
            } else {
                if (rushTabBtn) rushTabBtn.classList.add('active');
                if (chatTabBtn) chatTabBtn.classList.remove('active');
                if (rushView) rushView.classList.remove('hidden');
                if (chatView) chatView.classList.add('hidden');
            }
        };

        // Quick prompt sender
        window.sendQuickPrompt = function(promptText) {
            openDrawer();
            window.switchAiTab('chat');
            if (chatInput) chatInput.value = promptText;
            handleUserSubmit(promptText);
        };

        // Form submit
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = chatInput.value.trim();
            if (!query) return;
            handleUserSubmit(query);
        });

        async function handleUserSubmit(userQuestion) {
            chatInput.value = '';
            appendMessage(userQuestion, 'user');

            // Show typing indicator
            const typingId = showTypingIndicator();

            try {
                // Call Gemini 2.5 Flash API with live shuttle context & conversation history
                const answer = await fetchGeminiAdvice(userQuestion);
                removeTypingIndicator(typingId);
                appendMessage(answer, 'assistant');
            } catch (error) {
                console.warn("[Gemini AI Commute] Error or offline, using dynamic fallback:", error);
                removeTypingIndicator(typingId);
                const localAdvice = generateDynamicCommuteAdvice(userQuestion);
                appendMessage(localAdvice, 'assistant');
            }
        }

        async function fetchGeminiAdvice(studentQuery) {
            const now = new Date();
            const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const currentHours = now.getHours();

            let periodName = "shokal";
            if (currentHours >= 12 && currentHours < 15) periodName = "dupur";
            else if (currentHours >= 15 && currentHours < 18) periodName = "bikel";
            else if (currentHours >= 18 && currentHours < 20) periodName = "shondha";
            else if (currentHours >= 20 || currentHours < 6) periodName = "raat";

            // Gather live status from running Leaflet/backend simulation
            const liveStatus = typeof window.getShuttleLiveStatusSummary === 'function'
                ? window.getShuttleLiveStatusSummary()
                : "No active trips right now (all buses parked).";

            const systemPrompt = `You are the Campus 360 AI Commute Assistant for United International University (UIU), Dhaka.
Current system time: ${periodName} ${currentTimeStr}.

OFFICIAL UIU SHUTTLE TIMINGS:
From Notun Bazar to UIU (Takes ~20 mins total):
- 07:30 AM – 08:45 AM (Continuous peak departures for 8:30 AM & 9:00 AM classes)
- 09:25 AM – 09:35 AM
- 10:45 AM – 10:55 AM
- 12:05 PM – 12:15 PM
- 01:25 PM – 01:35 PM
- 02:45 PM – 02:55 PM
- 06:10 PM

From UIU to Notun Bazar (Takes ~20 mins total):
- 10:05 AM, 11:25 AM, 12:45 PM, 02:05 PM, 03:25 PM, 04:40 PM, 05:45 PM, 07:00 PM, 09:40 PM

INTERMEDIATE STOPS & TRANSIT OFFSETS:
Direction Notun Bazar -> UIU:
- Notun Bazar (Origin, 0 min)
- Family Bazar (+4 min)
- Sayednagar Auto Stand (+8 min)
- Bashundhara Bitumen Gate (+12 min)
- Chefs Table U-turn (+15 min)
- Mosjid Al Mostofa (+17 min)
- UIU Campus (Destination, ~20 min)

Direction UIU -> Notun Bazar:
- UIU Campus (Origin, 0 min)
- Sayednagar (+12 min)
- Family Bazar (+16 min)
- Notun Bazar (Destination, ~20 min)

LIVE ACTIVE BUSES SIMULATION:
${liveStatus}

RUSH & SEATING INSIGHTS:
- 07:30 AM – 08:45 AM: Extreme peak rush for 8:30 AM & 9:00 AM morning classes. Students should board at Notun Bazar by 08:25-08:35 AM.
- 04:40 PM – 05:45 PM: Extreme evening peak rush heading back to Notun Bazar after classes.
- 12:00 PM – 03:00 PM: Most comfortable slots with plenty of empty seats (12:05 PM and 01:25 PM).
- After 09:40 PM: Official service is closed until 07:30 AM tomorrow morning.

RESPONSE GUIDELINES:
1. Always respond in natural, friendly, fluent Banglish (Bengali words typed using English alphabet, e.g. "Kal shokal 9 tar moddhe UIU pouchate hole...").
2. Keep your answer strictly within 2 to 3 concise, highly relevant sentences.
3. UNDERSTAND INTENT ACCURATELY:
   - If the student asks about TOMORROW or a future time (e.g. "uiu te jabo kal sokal 9 tai" or "kal sokal 8:30 e class"): recommend the best shuttle slot to reach UIU on time (e.g., to reach UIU by 9:00 AM, suggest the 07:30–08:45 AM continuous peak slot, advising to board around 08:30 AM at Notun Bazar or 08:38 AM at Sayednagar). NEVER say bus service is closed for the night when they are asking about tomorrow!
   - If the student asks about an intermediate stop (e.g. Sayednagar, Family Bazar), calculate the estimated arrival time using the stop transit offset.
   - If the student asks about RIGHT NOW ("ekhon bus ache?", "next bus koto shomoy por?"):
     * If there are live active shuttles listed in LIVE ACTIVE BUSES, report their live location and ETA to the user.
     * If no live bus and it is night (after 09:40 PM or before 07:30 AM), state service is currently closed and next bus is tomorrow at 07:30 AM.
     * If daytime and no live bus, suggest the next scheduled slot from the timetable.
   - If greeting ("hello", "hi", "assalamu alaikum"), greet warmly, mention current time, and ask where they want to go.
   - If asking the time ("koita baje"), answer the exact current time.`;

            // Build multi-turn context
            const contents = chatHistory.slice(-6).map(m => ({
                role: m.sender === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }));
            contents.push({
                role: 'user',
                parts: [{ text: studentQuery }]
            });

            const payload = {
                system_instruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: contents,
                generationConfig: {
                    temperature: 0.25,
                    maxOutputTokens: 600,
                    thinkingConfig: {
                        thinkingBudget: 0
                    }
                }
            };

            const response = await fetch(GEMINI_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.warn(`[Gemini API] HTTP ${response.status}: Falling back to local advisor`);
                return generateDynamicCommuteAdvice(studentQuery);
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                const rawText = data.candidates[0].content.parts[0].text.trim();
                chatHistory.push({ sender: 'user', text: studentQuery });
                chatHistory.push({ sender: 'assistant', text: rawText });
                return rawText;
            } else {
                return generateDynamicCommuteAdvice(studentQuery);
            }
        }

        // ==========================================
        // Intelligent Dynamic Local Commute Advisor
        // Real-time, Location-Aware, Context-Driven
        // ==========================================
        const STOP_DEFS = [
            { id: 1, name: "Notun Bazar", offsetMinA: 0, offsetMinB: 20, patterns: ["notun bazar", "natun bazar", "notunbazar", "natunbazar", "nutun bazar", "notun", "natun"] },
            { id: 2, name: "Family Bazar", offsetMinA: 4, offsetMinB: 16, patterns: ["family bazar", "familybazar", "family", "femili"] },
            { id: 3, name: "Sayednagar Auto Stand", offsetMinA: 8, offsetMinB: 12, patterns: ["sayednagar", "sayednogor", "syednagar", "sayed nagar", "sayed nogor", "syed nagar", "sayed"] },
            { id: 4, name: "Bashundhara Bitumen Gate", offsetMinA: 12, offsetMinB: 8, patterns: ["bitumen", "bashundhara", "bitumen gate"] },
            { id: 5, name: "Chef's Table (U-turn Point)", offsetMinA: 15, offsetMinB: 5, patterns: ["chef", "chefs table", "chef's table", "u-turn", "uturn"] },
            { id: 6, name: "Mosjid Al Mostofa", offsetMinA: 17, offsetMinB: 3, patterns: ["mosjid", "mostofa", "al mostofa"] },
            { id: 7, name: "UIU Campus", offsetMinA: 20, offsetMinB: 0, patterns: ["uiu", "campus", "varsity", "university"] }
        ];

        function parseOriginAndDestination(text) {
            const q = text.toLowerCase();
            let origin = null;
            let destination = null;

            for (const stop of STOP_DEFS) {
                for (const p of stop.patterns) {
                    const regexFrom = new RegExp(`\\b${p}\\s*(theke|hote|theikha|stand|e\\s*uth|a\\s*uth|thek)\\b`, 'i');
                    const regexFromPrefix = new RegExp(`\\b(from|theke)\\s*${p}\\b`, 'i');
                    if (regexFrom.test(q) || regexFromPrefix.test(q)) {
                        origin = stop;
                        break;
                    }
                }
                if (origin) break;
            }

            for (const stop of STOP_DEFS) {
                if (origin && stop.id === origin.id) continue;
                for (const p of stop.patterns) {
                    const regexTo = new RegExp(`\\b${p}\\s*(-?te|-?e|jabo|jawar|class|to|pouch)\\b`, 'i');
                    const regexToPrefix = new RegExp(`\\b(to|dike)\\s*${p}\\b`, 'i');
                    if (regexTo.test(q) || regexToPrefix.test(q)) {
                        destination = stop;
                        break;
                    }
                }
                if (destination) break;
            }

            if (!origin && !destination) {
                for (const stop of STOP_DEFS) {
                    for (const p of stop.patterns) {
                        if (q.includes(p)) {
                            if (stop.id === 7) destination = stop;
                            else origin = stop;
                            break;
                        }
                    }
                    if (origin || destination) break;
                }
            }

            if (origin && !destination) {
                destination = origin.id === 7 ? STOP_DEFS[0] : STOP_DEFS[6];
            }
            if (destination && !origin) {
                origin = destination.id === 7 ? STOP_DEFS[0] : STOP_DEFS[6];
            }

            return { origin, destination };
        }

        function extractTargetClassTime(text) {
            const q = text.toLowerCase();
            const timeMatch = q.match(/\b(\d{1,2})[:.](\d{2})(?:\s*(am|pm))?/i);
            if (timeMatch) {
                let hour = parseInt(timeMatch[1], 10);
                const min = parseInt(timeMatch[2], 10);
                const meridiem = (timeMatch[3] || '').toLowerCase();
                
                if (meridiem === 'pm') {
                    if (hour < 12) hour += 12;
                } else if (meridiem === 'am') {
                    if (hour === 12) hour = 0;
                } else {
                    if (q.includes("sokal") || q.includes("morning")) {
                        // morning AM
                    } else if (q.includes("dupur") || q.includes("bikel") || q.includes("shondha") || q.includes("raat")) {
                        if (hour < 12) hour += 12;
                    } else {
                        if (hour >= 1 && hour <= 6) hour += 12;
                    }
                }
                const formatted = `${String(hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)).padStart(2, '0')}:${String(min).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
                return { hour, min, totalMinutes: hour * 60 + min, formatted };
            }

            const explicitTa = q.match(/\b(\d{1,2})\s*(ta|tay|tai)\b/);
            if (explicitTa) {
                let hour = parseInt(explicitTa[1], 10);
                if (q.includes("sokal") || q.includes("morning")) {
                    if (hour === 12) hour = 0;
                } else if (q.includes("dupur") || q.includes("bikel") || (hour >= 1 && hour <= 6)) {
                    hour += 12;
                }
                const formatted = `${String(hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)).padStart(2, '0')}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
                return { hour, min: 0, totalMinutes: hour * 60, formatted };
            }

            const hourMatch = q.match(/\b(\d{1,2})\s*(ta|tay|tai|a|e)\b/);
            if (hourMatch && (q.includes("class") || q.includes("shuru") || q.includes("shomoy") || q.includes("baje") || q.includes("jabo") || q.includes("kal"))) {
                let hour = parseInt(hourMatch[1], 10);
                if (q.includes("dupur") || q.includes("bikel") || (hour >= 1 && hour <= 6)) hour += 12;
                const formatted = `${String(hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)).padStart(2, '0')}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
                return { hour, min: 0, totalMinutes: hour * 60, formatted };
            }

            return null;
        }

        function formatMinutesToTime(mins) {
            let h = Math.floor(mins / 60) % 24;
            let m = mins % 60;
            const mer = h >= 12 ? 'PM' : 'AM';
            let h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${mer}`;
        }

        function generateDynamicCommuteAdvice(query) {
            const q = query.toLowerCase().trim();
            const now = new Date();
            const currentHours = now.getHours();
            const currentMins = now.getMinutes();
            const totalMinutesNow = currentHours * 60 + currentMins;
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

            let periodName = "shokal";
            if (currentHours >= 12 && currentHours < 15) periodName = "dupur";
            else if (currentHours >= 15 && currentHours < 18) periodName = "bikel";
            else if (currentHours >= 18 && currentHours < 20) periodName = "shondha";
            else if (currentHours >= 20 || currentHours < 6) periodName = "raat";

            const isNightClosed = totalMinutesNow > (21 * 60 + 40) || totalMinutesNow < (7 * 60 + 30);
            const activeTrips = Object.values(window.activeTripsData || {});
            const hasLiveTrips = activeTrips.length > 0;

            function getBusName(trip) {
                if (window.shuttleMap && window.shuttleMap[trip.shuttleId]) {
                    return window.shuttleMap[trip.shuttleId];
                }
                return trip.shuttleId === 1 ? "UIU Shuttle 01 (Bus A)" : "UIU Shuttle 02 (Bus B)";
            }

            function getNearestStop(trip) {
                if (!trip.currentLatitude || !trip.currentLongitude) return "Stand";
                let nearest = STOP_DEFS[0].name;
                let minDist = Infinity;
                STOP_DEFS.forEach(s => {
                    const d = Math.hypot(s.lat - trip.currentLatitude, s.lng - trip.currentLongitude);
                    if (d < minDist) {
                        minDist = d;
                        nearest = s.name;
                    }
                });
                return nearest;
            }

            // 1. GREETINGS
            const isGreeting = q === "hello" || q === "hi" || q === "hey" || q.includes("assalamu alaikum") ||
                               q.includes("slaam") || q.includes("kemon acho") || q.includes("ki khobor");
            if (isGreeting) {
                return `Assalamu Alaikum! Ekhon ${periodName} ${timeStr}। UIU Commute Assistant apnake shuttle timing, live bus tracking o rush updates dite prostut। Apni kothay jaben ba kon bus-er khoj nite chan?`;
            }

            // 2. RUSH / CROWD QUERY
            const isRushQuery = q.includes("vir") || q.includes("bhir") || q.includes("crowd") ||
                                q.includes("rush") || q.includes("seat") || q.includes("vlo kharap") ||
                                (q.includes("konta time") && !q.includes("baje")) ||
                                (q.includes("kon time") && !q.includes("baje"));
            if (isRushQuery && !q.includes("class")) {
                return `UIU Shuttle Rush Guide:
🔴 Extreme Peak: Shokal 07:30–08:45 AM (8:30 AM class-er bhir) ebong bikel 04:40–05:45 PM (Class sesh hoye basha phera)।
🟢 Best & Easy Seat Slots: 12:00 PM theke 03:00 PM (12:05 PM o 01:25 PM) shobcheye aaramdayok o khali thake, ebong raat 07:00 PM o 09:40 PM-e besh calm thake।
Bistaritho dekhte upore 'Rush & Crowd Guide' tab-e click korun!`;
            }

            // 3. TARGET CLASS / FORWARD COMMUTE PLANNING QUERY
            const targetClassTime = extractTargetClassTime(q);
            const isPlanning = q.includes("kal") || q.includes("agami") || q.includes("tomorrow") || targetClassTime !== null;
            const parsed = parseOriginAndDestination(q);
            const origin = parsed.origin || STOP_DEFS[0]; // Default to Notun Bazar
            const destination = parsed.destination || STOP_DEFS[6]; // UIU Campus

            if (isPlanning && targetClassTime) {
                conversationState.waitingForStop = false;
                const isForward = origin.id <= (destination ? destination.id : 7);
                const dayPrefix = (q.includes("kal") || q.includes("tomorrow")) ? "Kal " : "";

                if (isForward) {
                    const classMins = targetClassTime.totalMinutes;

                    // 8:30 AM Class
                    if (classMins <= 8 * 60 + 35) {
                        const stopOffset = origin.offsetMinA;
                        const boardStart = formatMinutesToTime(7 * 60 + 30 + stopOffset);
                        const boardEnd = formatMinutesToTime(7 * 60 + 45 + stopOffset);
                        const arrivalUiu = formatMinutesToTime(7 * 60 + 45 + 20); // ~08:05 AM

                        return `${dayPrefix}shokal ${targetClassTime.formatted} er class dhorar jonno ${origin.name}-e ${boardStart} theke ${boardEnd}-er moddhe bus dhora best। Notun Bazar theke 07:30 AM theke continuous shuttle charbe, ja pray ${arrivalUiu}-er moddhe UIU pouchiye dibe। 8:30-er class-e extreme peak rush thake, tai stand-e ${formatMinutesToTime(7 * 60 + 30 + stopOffset - 3)}-er moddhe thaka safety।`;
                    }
                    // 10:00 AM / 10:15 AM Class
                    else if (classMins <= 10 * 60 + 20) {
                        const stopOffset = origin.offsetMinA;
                        const boardTime = formatMinutesToTime(9 * 60 + 25 + stopOffset);
                        return `${dayPrefix}shokal ${targetClassTime.formatted} er class-er jonno Notun Bazar theke 09:25 AM-er shuttle slot dhora best। ${origin.name}-e bus-ti pray ${boardTime}-e pouchabe ebong 09:45 AM-er moddhe UIU pouchiye dibe।`;
                    }
                    // 10:45 AM / 11:00 AM Class
                    else if (classMins <= 11 * 60 + 15) {
                        const stopOffset = origin.offsetMinA;
                        const boardSafety = formatMinutesToTime(9 * 60 + 25 + stopOffset);
                        return `${dayPrefix}shokal ${targetClassTime.formatted} er class-er jonno 09:25 AM-er slot (${origin.name}-e pray ${boardSafety}) dhora safety। 10:45 AM-er slot UIU pouchate 11:05 AM hoye jete pare, tai khub tarahura thakle Sayednagar theke direct rickshaw nite paren।`;
                    }
                    // 12:00 PM / 12:30 PM Class
                    else if (classMins <= 12 * 60 + 35) {
                        const stopOffset = origin.offsetMinA;
                        const boardTime = formatMinutesToTime(10 * 60 + 45 + stopOffset);
                        return `${dayPrefix}dupur ${targetClassTime.formatted} er class-er jonno ${origin.name}-e pray ${boardTime}-e bus dhorun (Notun Bazar slot: 10:45 AM)। Bus-ti 11:05 AM-er moddhe apnake UIU pouchiye dibe।`;
                    }
                    // 01:30 PM / 02:00 PM Class
                    else if (classMins <= 14 * 60 + 15) {
                        const stopOffset = origin.offsetMinA;
                        const boardTime = formatMinutesToTime(13 * 60 + 25 + stopOffset);
                        return `${dayPrefix}dupur ${targetClassTime.formatted} er class-er jonno Notun Bazar theke 01:25 PM-er slot dhora best (${origin.name}-e pray ${boardTime})। Ei shomoy bhir kom thake ebong aramse seat peye jaben।`;
                    }
                    // General later classes
                    else {
                        let bestSlot = SCHEDULE_NB_TO_UIU[0];
                        for (const s of SCHEDULE_NB_TO_UIU) {
                            if (s.minutes + 20 <= classMins) bestSlot = s;
                        }
                        const boardTime = formatMinutesToTime(bestSlot.minutes + origin.offsetMinA);
                        return `${dayPrefix}${targetClassTime.formatted} er class-er jonno Notun Bazar theke ${bestSlot.time} er slot dhorun (${origin.name}-e pray ${boardTime})। Bus-ti pray 20 minute-e UIU pouchiye dibe।`;
                    }
                } else {
                    let bestSlot = SCHEDULE_UIU_TO_NB.find(s => s.minutes >= targetClassTime.totalMinutes) || SCHEDULE_UIU_TO_NB[0];
                    return `${dayPrefix}${targetClassTime.formatted}-e UIU theke Notun Bazar ferot jawar jonno ${bestSlot.time}-er shuttle slot paben। Class shesh hole stand-e ektu aage giye line-e darano bhalo।`;
                }
            }

            // 4. "NEXT BUS KOTO SOMAI POR"
            const isNextBusQuery = q.includes("next bus") || q.includes("porer bus") || q.includes("koto somai") ||
                                   q.includes("koto somoy") || q.includes("koto deri") || q.includes("por aste pare") ||
                                   q.includes("por asbe") || q.includes("por ashbe");
            if (isNextBusQuery) {
                if (hasLiveTrips) {
                    const t = activeTrips[0];
                    const busName = getBusName(t);
                    const nearest = getNearestStop(t);
                    return `Live tracking-e ekhon ${busName} cholche, ekhon ${nearest}-e ache! Apni stand-e gele 3-6 minute-er moddhe peye jaben।`;
                }
                if (isNightClosed) {
                    let minsTo730 = (7 * 60 + 30) - totalMinutesNow;
                    if (minsTo730 < 0) minsTo730 += 24 * 60;
                    const hoursLeft = Math.floor(minsTo730 / 60);
                    const minsLeft = minsTo730 % 60;
                    return `Ekhon ${periodName} ${timeStr}, raat-e shuttle chole na। Kal shokal 07:30 AM-e Notun Bazar theke din-er prothom shuttle shuru hobe (ar ${hoursLeft} ghonta ${minsLeft} min por)।`;
                } else {
                    const nextNbSlot = SCHEDULE_NB_TO_UIU.find(s => s.minutes > totalMinutesNow);
                    const nextSlotStr = nextNbSlot ? nextNbSlot.time : "07:30 AM (Kal shokal)";
                    const diff = nextNbSlot ? Math.max(1, nextNbSlot.minutes - totalMinutesNow) : 20;
                    return `Ekhon live kono bus cholche na। Notun Bazar theke agami shuttle slot holo ${nextSlotStr} (ar pray ${diff} minute por)।`;
                }
            }

            // 5. STOP SPECIFIC QUERY (Real-time or upcoming bus)
            if (origin && !isPlanning) {
                conversationState.waitingForStop = false;
                if (hasLiveTrips) {
                    const relevantTrip = activeTrips[0];
                    const busName = getBusName(relevantTrip);
                    const isFwd = window.isForwardDirection ? window.isForwardDirection(relevantTrip) : (relevantTrip.routeId === 1);
                    const nearest = getNearestStop(relevantTrip);
                    const dirStr = isFwd ? "Notun Bazar ➔ UIU" : "UIU ➔ Notun Bazar";

                    let etaMins = 3;
                    const destLat = origin.lat || 23.798778;
                    const destLng = origin.lng || 90.434972;
                    if (window.getDistanceKm && relevantTrip.currentLatitude && relevantTrip.currentLongitude) {
                        const distKm = window.getDistanceKm(relevantTrip.currentLatitude, relevantTrip.currentLongitude, destLat, destLng);
                        etaMins = Math.max(1, Math.round((distKm / 18) * 60));
                    }
                    return `Ekhon ${busName} live cholche (${dirStr})। Bus-ti ekhon ${nearest}-e ache, ${origin.name}-e anumanik ${etaMins} minute-er moddhe pouchabe। Stand-e thakle uthe porte parben।`;
                }

                if (isNightClosed) {
                    const firstBusOriginArrival = formatMinutesToTime(7 * 60 + 30 + origin.offsetMinA);
                    return `Ekhon ${periodName} ${timeStr}, ekhon UIU shuttle service bondho ache (kono bus live nei)। Kal shokal 07:30 AM-e Notun Bazar theke din-er prothom shuttle shuru hobe (${origin.name}-e pray ${firstBusOriginArrival}-e paben)।`;
                } else {
                    const nextNbSlot = SCHEDULE_NB_TO_UIU.find(s => s.minutes > totalMinutesNow);
                    const nextSlotStr = nextNbSlot ? nextNbSlot.time : "07:30 AM (Kal shokal)";
                    const arrivalEst = nextNbSlot ? formatMinutesToTime(nextNbSlot.minutes + origin.offsetMinA) : "07:38 AM";
                    const minsRemaining = nextNbSlot ? Math.max(1, nextNbSlot.minutes - totalMinutesNow) : 30;
                    return `Ekhon ${origin.name}-e kono bus live nei। Notun Bazar-er porer slot (${nextSlotStr}) ${origin.name}-e pray ${arrivalEst}-e pouchabe (ar ${minsRemaining} min por)।`;
                }
            }

            // 6. GENERAL BUS INQUIRY
            const isGeneralBusInquiry = q.includes("bus ki") || q.includes("bus asbe") || q.includes("bus ashbe") ||
                                       q.includes("bus pabo") || q.includes("bus ache") || q.includes("shuttle ache") ||
                                       q.includes("gari pabo") || q.includes("gari ache");
            if (isGeneralBusInquiry) {
                conversationState.waitingForStop = true;
                if (isNightClosed && !hasLiveTrips) {
                    return `Ekhon ${periodName} ${timeStr}, raat-e UIU shuttle service bondho thake। Apni kothatheke uthte chan? (Notun Bazar, Family Bazar, Sayednagar, naki UIU?) Kal shokal 07:30 AM theke bus paben।`;
                }
                if (hasLiveTrips) {
                    const busList = activeTrips.map(t => getBusName(t)).join(" o ");
                    return `Ekhon ${busList} live cholche! Apni thik kothatheke uthben? (Notun Bazar, Family Bazar, Sayednagar, naki UIU?) Bolle ami pouchar time hisheb kore bolchi।`;
                }
                return `Apni kothatheke uthben? (Notun Bazar, Family Bazar, Sayednagar, naki UIU?) Bolle ami timetable o live status dekhe shera advice dicchi।`;
            }

            // 7. TIME OF DAY INQUIRY
            const isTimeQuery = q.includes("koita baje") || q.includes("baje koita") ||
                                q.includes("ekhon koita") || q.includes("somoy koto") ||
                                q.includes("somai koto") || q.includes("what time is it") ||
                                q === "time" || q === "time?" || q === "current time";
            if (isTimeQuery) {
                if (isNightClosed) {
                    if (hasLiveTrips) {
                        const tripDesc = activeTrips.map(t => `${getBusName(t)} (${getNearestStop(t)}-e live)`).join(", ");
                        return `Ekhon ${periodName} ${timeStr}। Official schedule bondho thakleo tracking-e ${tripDesc} cholche।`;
                    }
                    return `Ekhon ${periodName} ${timeStr}। Ekhon UIU shuttle service bondho ache (official timing 07:30 AM theke 09:40 PM porjonto)। Agamikal shokal 07:30 AM-e Notun Bazar theke din-er prothom shuttle shuru hobe।`;
                } else {
                    if (hasLiveTrips) {
                        const tripDesc = activeTrips.map(t => `${getBusName(t)} (${getNearestStop(t)}-e live)`).join(", ");
                        return `Ekhon ${periodName} ${timeStr}। Live tracking-e ekhon ${tripDesc} transit-e cholche।`;
                    } else {
                        const nextNbSlot = SCHEDULE_NB_TO_UIU.find(s => s.minutes > totalMinutesNow);
                        const nextSlotStr = nextNbSlot ? nextNbSlot.time : "07:30 AM (Kal shokal)";
                        return `Ekhon ${periodName} ${timeStr}। Ekhon kono bus live nei, Notun Bazar theke agami shuttle slot holo ${nextSlotStr}।`;
                    }
                }
            }

            // 8. General fallback
            if (hasLiveTrips) {
                const tripDesc = activeTrips.map(t => {
                    const isFwd = window.isForwardDirection ? window.isForwardDirection(t) : (t.routeId === 1);
                    const dirStr = isFwd ? "Notun Bazar ➔ UIU" : "UIU ➔ Notun Bazar";
                    return `${getBusName(t)} (${dirStr}, ${getNearestStop(t)}-e)`;
                }).join("; ");
                return `Ekhon live tracking-e ${tripDesc} cholche। Tarahura na thakle stand-e shuttle-e wait korun, kom khoroche aramse pouchate parben।`;
            } else if (isNightClosed) {
                return `Ekhon ${periodName} ${timeStr}, ekhon UIU shuttle service bondho ache। Agamikal shokal 07:30 AM-e Notun Bazar theke din-er prothom shuttle shuru hobe।`;
            } else {
                const nextNbSlot = SCHEDULE_NB_TO_UIU.find(s => s.minutes > totalMinutesNow);
                const nextSlotStr = nextNbSlot ? nextNbSlot.time : "07:30 AM";
                return `Notun Bazar theke agami scheduled shuttle slot holo ${nextSlotStr}। Apnar class timing onujayi shuttle dhorun, ar hurry thakle Sayednagar theke auto ba rickshaw use korun।`;
            }
        }

        function appendMessage(text, sender) {
            const row = document.createElement('div');
            row.className = `ai-message-row ai-row-${sender}`;

            const avatar = document.createElement('div');
            avatar.className = 'ai-avatar';
            avatar.innerHTML = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';

            const bubble = document.createElement('div');
            bubble.className = `ai-bubble ai-${sender}-bubble`;
            bubble.textContent = text;

            if (sender === 'user') {
                row.appendChild(bubble);
                row.appendChild(avatar);
            } else {
                row.appendChild(avatar);
                row.appendChild(bubble);
            }

            chatMessages.appendChild(row);
            scrollChatToBottom();
        }

        function showTypingIndicator() {
            const id = 'typing_' + Date.now();
            const row = document.createElement('div');
            row.id = id;
            row.className = 'ai-message-row ai-row-assistant';
            row.innerHTML = `
                <div class="ai-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="ai-bubble ai-assistant-bubble ai-typing-bubble">
                    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                </div>
            `;
            chatMessages.appendChild(row);
            scrollChatToBottom();
            return id;
        }

        function removeTypingIndicator(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }

        function scrollChatToBottom() {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
})();
