function loadTasks() {
  const data = localStorage.getItem("studyHubTasks");
  if (!data) return [];
  return JSON.parse(data);
}

function saveTasks(tasks) {
  localStorage.setItem("studyHubTasks", JSON.stringify(tasks));
}

function loadVault() {
  const data = localStorage.getItem("writingVault");
  if (!data) {
    return { projects: {} };
  }
  return JSON.parse(data);
}

function saveVault(data) {
  localStorage.setItem("writingVault", JSON.stringify(data));
}

function isDraftLocked(project, draftNumber) {
  const totalDrafts = project.drafts.length;
  const goal = project.goalDrafts;
  const interval = project.revealInterval;

  if (interval === 0) {
    return false;
  }

  // If we've reached the goal, everything unlocks
  if (totalDrafts >= goal) {
    return false;
  }

  const unlockedByInterval = totalDrafts >= draftNumber + interval;

  return !unlockedByInterval;
}


/*task list, pomodoro*/
document.addEventListener("DOMContentLoaded", function() {

    //task items
    const taskForm = document.getElementById("task-form");
    const taskInput = document.getElementById("task-input");
    const taskList = document.getElementById("task-list");

    //subtask items
    const subtaskForm   = document.getElementById('subtask-form');
    const subtaskInput  = document.getElementById('subtask-input');
    const subtaskList   = document.getElementById('subtask-list');
    const subtasksColumn = document.getElementById('subtasks-column');
    const completeTaskBtn = document.getElementById("archive-task-btn");

    let tasks = loadTasks();
    let nextTaskId = 1; 
    let currentTaskId = null;
    let currentSubtaskIndex = null;  
    
    function getCurrentTask() {
        return tasks.find(t => t.id === currentTaskId) || null;
    }


    function renderSubtasks() {
        const currentTask = getCurrentTask();

        // No task selected → no subtasks
        if (!currentTask) {
            subtaskList.innerHTML = "";
            currentSubtaskIndex = null;
            return;
        }

        const subtasks = currentTask.subtasks;

        if (!subtasks || subtasks.length === 0) {
            subtaskList.innerHTML = "";
            currentSubtaskIndex = null;
            return;
        }

        if (currentSubtaskIndex === null || currentSubtaskIndex >= subtasks.length) {
            currentSubtaskIndex = 0; // default to the top subtask
        }

        subtaskList.innerHTML = "";

        subtasks.forEach((subText, index) => {
        const li = document.createElement("li");
                li.classList.add("subtask-item");

                if (index === currentSubtaskIndex) {
                    li.classList.add("active-subtask");
                }

                const textSpan = document.createElement("span");
                textSpan.textContent = subText;
                textSpan.classList.add("subtask-text");

                const completeBlock = document.createElement("div");
                completeBlock.classList.add("subtask-complete-block");
                completeBlock.innerHTML = "✓";  // placeholder; can change to an icon later
                completeBlock.addEventListener("click", (event) => {
                    event.stopPropagation();  // prevent row selection

                    currentTask.subtasks.splice(index, 1);

                    if (currentSubtaskIndex >= currentTask.subtasks.length) {
                        currentSubtaskIndex = currentTask.subtasks.length - 1;
                    }
                    if (currentTask.subtasks.length === 0) {
                        currentSubtaskIndex = null;
                    }

                    // Re-render so UI updates immediately
                    renderSubtasks();
                });

                // clicking the row selects this subtask
                li.addEventListener("click", () => {
                    currentSubtaskIndex = index;
                    renderSubtasks();
                });

                li.appendChild(textSpan);
                li.appendChild(completeBlock);
                subtaskList.appendChild(li);
        });
    }


    function highlightSelectedTask(selectedLi) {
        const allLis = taskList.querySelectorAll('li');
        allLis.forEach(li => li.classList.remove('active-task'));
        selectedLi.classList.add('active-task');
    }

    subtaskForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const text = subtaskInput.value.trim();
        if (text === "") return;

        if (currentTaskId === null) {
            alert("Select a task first.");
            return;
        }

        const currentTask = getCurrentTask();
        if (!currentTask) {
            alert("Something went wrong: task not found.");
            return;
        }

        currentTask.subtasks.push(text);

        subtaskInput.value = "";
        subtaskInput.focus();

        renderSubtasks();

        console.log("Updated task:", currentTask);
    });


    taskForm.addEventListener("submit", function(event) {
     
        event.preventDefault();

        const text = taskInput.value.trim();
        if (text === "") return;

        const newTask = {
            id: nextTaskId++,
            name: text,
            subtasks: []     // empty for now
        };

        tasks.push(newTask);

        const li = document.createElement("li");
        li.textContent = newTask.name;
        li.dataset.id = newTask.id;

        li.addEventListener('click', () => {
            currentTaskId = newTask.id;
            highlightSelectedTask(li);
            renderSubtasks();
        });

        taskList.appendChild(li);

        if (tasks.length === 1) {
            currentTaskId = newTask.id;
            highlightSelectedTask(li);
            renderSubtasks();
        }

        taskInput.value = "";
        taskInput.focus();
        saveTasks(tasks);      
    });

    console.log(tasks)

    completeTaskBtn.addEventListener("click", () => {
        const activeLi = taskList.querySelector(".active-task");
        if (!activeLi) return;

        const taskId = Number(activeLi.dataset.id);
        const index = tasks.findIndex(t => t.id === taskId);
        if (index === -1) return;

        // 1. Add animation class
        activeLi.classList.add("task-archiving");

        // 2. After animation ends, remove from DOM + data
        setTimeout(() => {
            // Remove from array
            tasks.splice(index, 1);

            // Remove from DOM
            activeLi.remove();

            // Reassign active task if any remain
            const remainingLis = taskList.querySelectorAll("li");
            if (remainingLis.length === 0) {
            currentTaskId = null;
            currentSubtaskIndex = null;
            renderSubtasks();
            return;
            }

            const newIndex = Math.min(index, remainingLis.length - 1);
            const newActive = remainingLis[newIndex];

            currentTaskId = Number(newActive.dataset.id);
            currentSubtaskIndex = null;

            highlightSelectedTask(newActive);
            renderSubtasks();
        }, 350); // match animation duration
    });



    /* =========================
        POMODORO TIMER 
    ========================= */


    // Inputs + screens
    const views = document.querySelectorAll(".view");
    const viewButtons = document.querySelectorAll("[data-view]");

    viewButtons.forEach(btn => {
        btn.addEventListener("click", () => {
        const targetView = btn.dataset.view;

        views.forEach(v => v.classList.remove("active"));

        const targetSection = document.getElementById(targetView);
        if (targetSection) {
            targetSection.classList.add("active");
        }
        });
    });

    // Setup elements
    const workInput  = document.getElementById("work-minutes-input");
    const breakInput = document.getElementById("break-minutes-input");

    const setupScreen = document.querySelector(".pomodoro-setup");
    const workScreen  = document.querySelector(".pomodoro-work");
    const breakScreen = document.querySelector(".pomodoro-break");

    const startBtn      = document.getElementById("pomodoro-start-btn");
    const workEndBtn    = document.getElementById("work-end-btn");
    const breakEndBtn   = document.getElementById("break-end-btn");
    const workPauseBtn  = document.getElementById("work-pause-btn");
    const breakPauseBtn = document.getElementById("break-pause-btn");
    const workSkipBtn   = document.getElementById("work-skip-btn");
    const breakSkipBtn  = document.getElementById("break-skip-btn");

    const workDisplay  = document.getElementById("work-timer-display");
    const breakDisplay = document.getElementById("break-timer-display");

    // Header timer
    const headerDisplay  = document.querySelector(".pomodoro-countdown");
    const headerPauseBtn = document.querySelector(".pomodoro-pause");

    // Config (chosen in setup)
    const config = {
        workMinutes: 20,
        breakMinutes: 5,
    };

    // State
    let phase = null;           // "work" | "break" | null
    let timeRemaining = 0;      // seconds
    let intervalId = null;
    let running = false;        // true = counting down, false = paused or stopped

    /* ---------- Helpers ---------- */

    function showPomodoroScreen(name) {
        [setupScreen, workScreen, breakScreen].forEach(s =>
        s.classList.remove("active")
        );

        if (name === "setup") setupScreen.classList.add("active");
        if (name === "work")  workScreen.classList.add("active");
        if (name === "break") breakScreen.classList.add("active");
    }

    function setPomodoroMode(phaseOrNull) {
        document.body.classList.remove("pomodoro-work-mode", "pomodoro-break-mode");
        if (phaseOrNull === "work") {
        document.body.classList.add("pomodoro-work-mode");
        } else if (phaseOrNull === "break") {
        document.body.classList.add("pomodoro-break-mode");
        }
    }

    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const paddedSeconds = seconds < 10 ? "0" + seconds : String(seconds);
        return `${minutes}:${paddedSeconds}`;
    }

    function updateHeaderDisplay() {
        if (!headerDisplay) return;

        if (phase === null) {
        // default to full work duration
        headerDisplay.textContent = formatTime(config.workMinutes * 60);
        } else {
        headerDisplay.textContent = formatTime(timeRemaining);
        }
    }

    function renderTime() {
        const formatted = formatTime(timeRemaining);

        if (phase === "work" && workDisplay) {
        workDisplay.textContent = formatted;
        } else if (phase === "break" && breakDisplay) {
        breakDisplay.textContent = formatted;
        }

        updateHeaderDisplay();
    }

    function stopInterval() {
        if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
        }
    }

    function setRunning(value) {
        running = value;
        const label = running ? "⏸" : "▶";

        if (phase === "work" && workPauseBtn) {
        workPauseBtn.textContent = label;
        } else if (phase === "break" && breakPauseBtn) {
        breakPauseBtn.textContent = label;
        }

        if (headerPauseBtn) {
        headerPauseBtn.textContent = label;
        }
    }

    function startInterval() {
        stopInterval();
        setRunning(true);

        intervalId = setInterval(() => {
        timeRemaining -= 1;
        if (timeRemaining <= 0) {
            timeRemaining = 0;
            renderTime();
            stopInterval();
            setRunning(false);

            // Auto-advance
            if (phase === "work") {
            startPhase("break");
            } else if (phase === "break") {
            startPhase("work");
            }
            return;
        }
        renderTime();
        }, 1000);
    }

    function startPhase(newPhase) {
        phase = newPhase;

        if (phase === "work") {
        timeRemaining = config.workMinutes * 60;
        showPomodoroScreen("work");
        } else if (phase === "break") {
        timeRemaining = config.breakMinutes * 60;
        showPomodoroScreen("break");
        }

        setPomodoroMode(phase);
        renderTime();
        startInterval();
    }

    function pause() {
        if (!running) return;
        stopInterval();
        setRunning(false);
    }

    function resume() {
        if (running || phase === null) return;
        startInterval();
    }

    function togglePause() {
        if (phase === null) return;
        if (running) {
        pause();
        } else {
        resume();
        }
    }

    function skipTo(targetPhase) {
        if (!targetPhase || phase === null) return;
        stopInterval();
        setRunning(false);
        startPhase(targetPhase);
    }

    function endSession() {
        stopInterval();
        setRunning(false);
        phase = null;
        timeRemaining = 0;
        setPomodoroMode(null);
        showPomodoroScreen("setup");

        if (workDisplay)  workDisplay.textContent  = "Work timer will go here.";
        if (breakDisplay) breakDisplay.textContent = "Break timer will go here.";
        if (workPauseBtn)  workPauseBtn.textContent  = "Pause";
        if (breakPauseBtn) breakPauseBtn.textContent = "Pause";
        if (headerPauseBtn) headerPauseBtn.textContent = "Pause";

        updateHeaderDisplay();
    }

    // event listeners
    if (startBtn) {
        startBtn.addEventListener("click", () => {
        const workVal  = parseInt(workInput.value, 10);
        const breakVal = parseInt(breakInput.value, 10);

        if (isNaN(workVal) || workVal <= 0) {
            alert("Please enter a valid work duration.");
            return;
        }
        if (isNaN(breakVal) || breakVal <= 0) {
            alert("Please enter a valid break duration.");
            return;
        }

        config.workMinutes  = workVal;
        config.breakMinutes = breakVal;

        if (workPauseBtn)  workPauseBtn.textContent  = "Pause";
        if (breakPauseBtn) breakPauseBtn.textContent = "Pause";
        if (headerPauseBtn) headerPauseBtn.textContent = "Pause";

        startPhase("work");
        });
    }

    // Work controls
    if (workPauseBtn) {
        workPauseBtn.addEventListener("click", () => {
        if (phase === "work") togglePause();
        });
    }

    if (workSkipBtn) {
        workSkipBtn.addEventListener("click", () => {
        if (phase === "work") skipTo("break");
        });
    }

    if (workEndBtn) {
        workEndBtn.addEventListener("click", endSession);
    }

    // Break controls
    if (breakPauseBtn) {
        breakPauseBtn.addEventListener("click", () => {
        if (phase === "break") togglePause();
        });
    }

    if (breakSkipBtn) {
        breakSkipBtn.addEventListener("click", () => {
        if (phase === "break") skipTo("work");
        });
    }

    if (breakEndBtn) {
        breakEndBtn.addEventListener("click", endSession);
    }

    // Header pause (global pause/resume)
    if (headerPauseBtn) {
        headerPauseBtn.addEventListener("click", togglePause);
    }

    // Initial state
    showPomodoroScreen("setup");
    updateHeaderDisplay();
    });


     /* ==================
           DRAFT VAULT 
        ================== */

document.addEventListener("DOMContentLoaded", () => {
    const projectListEl  = document.getElementById("project-list");
    const projectModal   = document.getElementById("project-modal");
    const openModalBtn   = document.getElementById("open-project-modal-btn");
    const saveProjectBtn = document.getElementById("save-project-btn");

    const projectView       = document.getElementById("project-view");
    const projectViewTitle  = document.getElementById("project-view-title");
    const draftListEl       = document.getElementById("draft-list");
    const closeProjectView  = document.getElementById("close-project-view-btn");
    
    const draftVault = document.getElementById("draft-vault");
    const deleteProjectBtn = document.getElementById("delete-project-btn");



    // Which project is currently open
    let currentProjectId = null;
    let currentDraftContext = null; // { projectId, draftNumber }


    
    projectListEl.addEventListener("click", (event) => {
        const card = event.target.closest(".project-card");
        if (!card) return;

        const projectId = card.dataset.projectId;
        if (!projectId) return;

        document.querySelectorAll(".project-card.selected").forEach((el) => {
            el.classList.remove("selected");
        });

        // Highlight the clicked project
        card.classList.add("selected");

        // Keep track for delete / project view
        currentProjectId = projectId;

        openProject(projectId);
    });

    

    console.log("Vault JS loaded");
    console.log("openModalBtn:", openModalBtn);

    // If the button isn't found, log and bail on that part instead of crashing
    if (openModalBtn && projectModal) {
        openModalBtn.addEventListener("click", () => {
        projectModal.classList.remove("hidden");
        });
    } else {
        console.warn("openModalBtn or projectModal not found in DOM.");
    }

    if (saveProjectBtn) {
        saveProjectBtn.addEventListener("click", () => {
        const nameInput = document.getElementById("project-name");
        const goalInput = document.getElementById("project-goal");
        const intervalInput = document.getElementById("project-interval");

        const name = nameInput.value.trim();
        const goalDrafts = parseInt(goalInput.value, 10);
        const revealInterval = parseInt(intervalInput.value, 10);

        if (!name) {
            alert("Please enter a project name.");
            return;
        }
        if (!goalDrafts || goalDrafts < 1) {
            alert("Iteration goal must be at least 1.");
            return;
        }


        const vault = loadVault();
        const id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());

        vault.projects[id] = {
            id,
            name,
            goalDrafts,
            revealInterval,
            drafts: []
        };

        saveVault(vault);
        renderProjects();

        nameInput.value = "";
        goalInput.value = 5;
        intervalInput.value = 1;
        projectModal.classList.add("hidden");
        });
    } else {
        console.warn("saveProjectBtn not found in DOM.");
    }

    if (deleteProjectBtn) {
        deleteProjectBtn.addEventListener("click", () => {
            if (!currentProjectId) {
                console.warn("Delete clicked but currentProjectId is null.");
                return;
            }

            const confirmDelete = confirm("Delete this project and all its drafts?");
            if (!confirmDelete) return;

            const vault = loadVault();

            console.log("Before delete, projects:", Object.keys(vault.projects));
            console.log("Deleting project id:", currentProjectId);

            // Safety: make sure this id actually exists
            if (!vault.projects[currentProjectId]) {
                console.warn("No project found with that id in vault.projects:", currentProjectId);
                return;
            }

            // ACTUAL removal from the data model
            delete vault.projects[currentProjectId];

            console.log("After delete, projects:", Object.keys(vault.projects));

            saveVault(vault);

            // Reset state + views
            currentProjectId = null;
            projectView.classList.add("hidden");
            if (draftVault) {
                draftVault.classList.remove("hidden");
            }

            // Re-render the vault list from fresh data
            renderProjects();
        });
    }

    

    function renderProjects() {
        const vault = loadVault();
        const projects = Object.values(vault.projects);

        projectListEl.innerHTML = "";

        projects.forEach((project) => {
        const card = document.createElement("div");
        card.classList.add("project-card");
        card.dataset.projectId = project.id;   // for click handling

        const totalDrafts = project.drafts.length;
        const goal = project.goalDrafts;
        const statusText = totalDrafts >= goal ? "Goal reached" : "In progress";

        if (project.id === currentProjectId) {
            card.classList.add("selected");
        }

        card.innerHTML = `
            <h3>${project.name}</h3>
            <p>Drafts: ${totalDrafts} / ${goal}</p>
            <p>Reveal interval: every ${project.revealInterval} draft(s)</p>
            <p>Status: ${statusText}</p>
        `;

        projectListEl.appendChild(card);
        });
    }

    function openProject(projectId) {
        const vault = loadVault();
        const project = vault.projects[projectId];
        if (!project) return;

        currentProjectId = projectId;
        projectViewTitle.textContent = project.name;

        renderProjectView(project);

        // show project view, hide vault list
        projectView.classList.remove("hidden");
        if (draftVault) {
            draftVault.classList.add("hidden");
        }
    }

    function renderProjectView(project) {
        draftListEl.innerHTML = "";

        if (project.drafts.length === 0) {
        draftListEl.innerHTML = `<p>No drafts yet. Use your Draft Pad to create the first one.</p>`;
        return;
        }

        project.drafts.forEach((draft) => {
        const locked = isDraftLocked(project, draft.number);

        const card = document.createElement("div");
        card.classList.add("draft-card");
        card.classList.add(locked ? "locked" : "unlocked");
        card.dataset.draftNumber = draft.number;

        const icon = locked ? "🔒" : "🔓";
        const statusText = locked ? "Locked" : "Unlocked";

        card.innerHTML = `
            <span class="lock-icon">${icon}</span>
            <h4>Draft ${draft.number}</h4>
            <p>${statusText}</p>
        `;

        draftListEl.appendChild(card);
        });
    }


    renderProjects();
    


    /* ==================
        DRAFT PAD 
    ================== */

        const progressContainer = document.getElementById("draft-progress-container");
        const actionsContainer  = document.getElementById("draft-actions-container");
        const progressFill      = document.getElementById("draft-progress-fill");
        const progressText      = document.getElementById("draft-progress-text");

        const setupScreen       = document.getElementById("draft-setup-screen");
        const writingScreen     = document.getElementById("draft-writing-screen");
        const wordGoalInput     = document.getElementById("draft-word-goal");
        const modeFreeBtn       = document.getElementById("mode-free");
        const modeChallengeBtn  = document.getElementById("mode-challenge");
        const startBtn          = document.getElementById("draft-start-btn");

        const draftTextarea     = document.getElementById("draft-pad-textarea");

        const downloadBtn = document.getElementById("draft-btn-download");
        const saveBtn     = document.getElementById("draft-btn-save");
        const restartBtn  = document.getElementById("draft-btn-restart");


        if (!draftTextarea) return;

        // ---- STATE ----
        let draftMode   = "free";   // "free" or "challenge"
        let wordGoal    = 250;
        let goalReached = false;

        let typingStarted = false;
        let lastKeypress  = Date.now();
        let isBlurred     = false;

        let inactivityTimer = null; // 3s to start blur
        let resetTimer      = null; // 3.5s after blur to reset

        const INACTIVITY_DELAY = 3000;
        const BLUR_DURATION    = 3500;

        // ---- MODE TOGGLE ----
        modeFreeBtn.addEventListener("click", () => {
            draftMode = "free";
            modeFreeBtn.classList.add("mode-active");
            modeChallengeBtn.classList.remove("mode-active");
        });

        modeChallengeBtn.addEventListener("click", () => {
            draftMode = "challenge";
            modeChallengeBtn.classList.add("mode-active");
            modeFreeBtn.classList.remove("mode-active");
        });

        if (restartBtn) {
            restartBtn.addEventListener("click", () => {
            // Clear current draft text and reset state
            draftTextarea.value = "";
            goalReached = false;

            // If you want to reset progress in challenge mode:
            if (draftMode === "challenge") {
                // Reset progress bar display to 0/goal
                if (typeof updateProgress === "function") {
                updateProgress(0, wordGoal);
                }
            }

            // Hide writing, show setup
            writingScreen.classList.add("hidden");
            setupScreen.classList.remove("hidden");
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener("click", () => {
            const text = draftTextarea.value.trim();
            if (!text) {
                alert("Draft is empty. Nothing to download.");
                return;
            }

            const blob = new Blob([text], { type: "text/plain" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");

            a.href = url;
            a.download = "draft.txt";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            });
        }

        function createNewProjectWithDraft(vault, text) {
            const name = window.prompt("Enter a name for the new project:");
            if (!name) {
            alert("Project name is required.");
            return;
            }

            const goalStr = window.prompt(
            "Iteration goal for this project (number of drafts):",
            "5"
            );
            let goalDrafts = parseInt(goalStr, 10);
            if (isNaN(goalDrafts) || goalDrafts < 1) goalDrafts = 5;

            const intervalStr = window.prompt(
            "Reveal interval (every N drafts unlock previous ones, 0 = no lock):",
            "0"
            );
            let revealInterval = parseInt(intervalStr, 10);
            if (isNaN(revealInterval) || revealInterval < 0) revealInterval = 0;

            const id =
            (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());

            const project = {
            id,
            name,
            goalDrafts,
            revealInterval,
            drafts: []
            };

            const draftNumber = 1;
            project.drafts.push({
            number: draftNumber,
            text,
            mode: draftMode,
            wordGoal,
            createdAt: Date.now()
            });

            vault.projects[id] = project;
            saveVault(vault);

            alert(`Draft saved to new project: "${name}".`);
        }

        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
            const text = draftTextarea.value.trim();
            if (!text) {
                alert("Draft is empty. Nothing to save.");
                return;
            }

            const vault = loadVault();

            const choice = window.prompt(
                "Save draft to vault:\n" +
                "Type 1 to save to an existing project.\n" +
                "Type 2 to create a new project."
            );

            if (choice === null) return; // user cancelled

            if (choice === "2") {
                // Create new project + attach draft
                createNewProjectWithDraft(vault, text);
                return;
            }

            if (choice !== "1") {
                alert("Save cancelled.");
                return;
            }

            // Save to existing project
            const projects = Object.values(vault.projects);

            if (projects.length === 0) {
                alert("No projects exist yet. Creating a new project instead.");
                createNewProjectWithDraft(vault, text);
                return;
            }

            let list = "Choose a project by number:\n";
            projects.forEach((p, i) => {
                list += `${i + 1}: ${p.name}\n`;
            });

            const selection = window.prompt(list);
            if (selection === null) return;

            const index = parseInt(selection, 10) - 1;
            if (isNaN(index) || index < 0 || index >= projects.length) {
                alert("Invalid selection. Save cancelled.");
                return;
            }

            const project = projects[index];
            if (!project.drafts) {
                project.drafts = [];
            }

            const draftNumber = project.drafts.length + 1;

            project.drafts.push({
                number: draftNumber,
                text,
                mode: draftMode,
                wordGoal,
                createdAt: Date.now()
            });

            vault.projects[project.id] = project;
            saveVault(vault);

            alert(`Draft saved to existing project: "${project.name}".`);
            });
        }



        // ---- UI HELPERS ----
        
        function showButtonsBar() {
            if (!progressContainer || !actionsContainer) return;
            progressContainer.classList.add("hidden");
            actionsContainer.classList.remove("hidden");
        }

        function showProgressBar() {
            if (!progressContainer || !actionsContainer) return;
            actionsContainer.classList.add("hidden");
            progressContainer.classList.remove("hidden");
        }

        function updateProgress(currentWords, goalWords) {
            if (!progressFill || !progressText) return;
            const clampedGoal = goalWords > 0 ? goalWords : 1;
            const ratio = Math.min(currentWords / clampedGoal, 1);
            const percent = Math.round(ratio * 100);
            progressFill.style.width = percent + "%";
            progressText.textContent = `${currentWords} / ${goalWords} words`;
        }

        function getWordCount(text) {
            const trimmed = text.trim();
            if (!trimmed) return 0;
            return trimmed.split(/\s+/).length;
        }

        function clearTimers() {
            clearTimeout(inactivityTimer);
            clearTimeout(resetTimer);
            inactivityTimer = null;
            resetTimer = null;
        }

        function clearEffects() {
            draftTextarea.classList.remove("draft-idle-effect");
            isBlurred = false;
        }

        // ---- START BUTTON ----
        startBtn.addEventListener("click", () => {
            const val = parseInt(wordGoalInput.value, 10);
            wordGoal = !isNaN(val) && val > 0 ? val : 250;

            draftTextarea.value = "";
            typingStarted = false;
            goalReached = false;
            clearTimers();
            clearEffects();

            // Screens
            setupScreen.classList.add("hidden");
            writingScreen.classList.remove("hidden");

            if (draftMode === "challenge") {
            // Challenge mode: progress bar only, no buttons until done
            showProgressBar();
            updateProgress(0, wordGoal);
            } else {
            // Free write: buttons only, no progress bar
            showButtonsBar();
            }

            draftTextarea.focus();
        });

        // ---- INACTIVITY (CHALLENGE ONLY) ----
        function startInactivityTimer() {
            if (draftMode !== "challenge" || goalReached) return;

            clearTimers();

            inactivityTimer = setTimeout(() => {
            // If user resumed typing, bail
            if (Date.now() - lastKeypress < INACTIVITY_DELAY) return;

            // Enter blur state
            draftTextarea.classList.add("draft-idle-effect");
            isBlurred = true;

            // Schedule reset if they *still* don't type
            resetTimer = setTimeout(() => {
                if (Date.now() - lastKeypress < BLUR_DURATION) {
                clearEffects();
                return;
                }
                triggerShutdown();
            }, BLUR_DURATION);

            }, INACTIVITY_DELAY);
        }

        function triggerShutdown() {
            clearTimers();
            clearEffects();

            draftTextarea.value = "";
            typingStarted = false;
            goalReached = false;

            writingScreen.classList.add("hidden");
            setupScreen.classList.remove("hidden");

            alert("You stopped typing! Draft reset.");
        }

        // ---- INPUT HANDLER ----
        draftTextarea.addEventListener("input", () => {
            const now = Date.now();
            lastKeypress = now;
            if (!typingStarted) typingStarted = true;

            // If user resumes typing during blur, recover immediately
            if (isBlurred) {
            clearEffects();
            }

            // FREE WRITE MODE: NO timers, NO progress bar logic
            if (draftMode === "free") {
            clearTimers();
            // Ensure correct UI: buttons on, progress off
            showButtonsBar();
            return;
            }

            // CHALLENGE MODE BELOW

            // Restart inactivity pipeline
            startInactivityTimer();

            // Update progress while under goal
            if (!goalReached) {
            const words = getWordCount(draftTextarea.value);
            updateProgress(words, wordGoal);

            if (words >= wordGoal) {
                goalReached = true;
                clearTimers();
                clearEffects();
                // goal hit: show buttons, hide progress bar
                showButtonsBar();
            }
            }
        });


    /* ==================
        BREAKROOM
    ================== */


        const breakTiles = document.querySelectorAll('.break-tile');
        const modalBackdrop = document.getElementById('break-modal-backdrop');
        const modalCloseBtn = document.getElementById('break-modal-close');
        const modalTitle = document.getElementById('break-modal-title');
        const modalCaption = document.getElementById('break-modal-caption');
        const modalContent = document.getElementById('break-modal-content');

        breakTiles.forEach(tile => {
        tile.addEventListener('click', () => {
            const activity = tile.dataset.activity;
            openBreakActivity(activity);
        });
        });

        //wind game logic
        function initWindGame() {
            const canvas = document.getElementById("windCanvas");
            if (!canvas) return; // safety

            const ctx = canvas.getContext("2d");

            let width = canvas.width;
            let height = canvas.height;

            const numParticles = 50;
            let particles = [];
            let mouse = { x: width / 2, y: height / 2 };
            let gameWon = false;
            let holdTimer = 0;
            const holdThreshold = 2000; // ms to hold majority on left
            const requiredFraction = 0.85; // 85% on left
            const statusEl = document.getElementById('wind-status');

            // uses your mood color helper if available; else fallback
            function currentWindColor() {
                if (typeof moods !== "undefined" && moods[moodIndex]) {
                return moods[moodIndex].color + "40";
                }
                return "rgba(173, 216, 230, 0.4)"; // fallback light blue
            }

            function createParticles() {
                particles = [];
                for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    size: Math.random() * 3 + 1,
                });
                }
            }

            function drawParticles() {
                ctx.clearRect(0, 0, width, height);

                // draw divider line (middle)
                ctx.strokeStyle = "rgba(255,255,255,0.25)";
                ctx.beginPath();
                ctx.moveTo(width / 2, 0);
                ctx.lineTo(width / 2, height);
                ctx.stroke();

                // particles
                ctx.fillStyle = currentWindColor();
                for (let p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                }
            }

            function updateParticles(deltaTime) {
                for (let p of particles) {
                p.x += p.vx;
                p.y += p.vy;

                // gentle wrap-around
                if (p.x > width) p.x = 0;
                if (p.x < 0) p.x = width;
                if (p.y > height) p.y = 0;
                if (p.y < 0) p.y = height;

                // stronger push from mouse
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    p.vx -= dx * 0.0007; // stronger than your original 0.0003
                    p.vy -= dy * 0.0007;
                } else {
                    p.vx *= 0.995;
                    p.vy *= 0.995;
                }
                }

                // game logic: how many are on the left side?
                let leftCount = 0;
                for (let p of particles) {
                if (p.x < width / 2) leftCount++;
                }
                const fractionLeft = leftCount / numParticles;
                const percent = Math.round(fractionLeft * 100);

                if (!gameWon) {
                statusEl.textContent = `Particles on left: ${percent}% (goal: ${Math.round(
                    requiredFraction * 100
                )}% for 2 seconds)`;
                }

                if (fractionLeft >= requiredFraction && !gameWon) {
                holdTimer += deltaTime;
                if (holdTimer >= holdThreshold) {
                    gameWon = true;
                    statusEl.textContent = "You did it! Almost everything is on the left 🎉";
                }
                } else {
                holdTimer = 0;
                }
            }

            let lastTime = performance.now();

            function animateWindGame(timestamp) {
                const deltaTime = timestamp - lastTime;
                lastTime = timestamp;

                updateParticles(deltaTime);
                drawParticles();
                requestAnimationFrame(animateWindGame);
            }

            canvas.addEventListener("mousemove", (e) => {
                const rect = canvas.getBoundingClientRect();
                mouse.x = e.clientX - rect.left;
                mouse.y = e.clientY - rect.top;
            });

            
            createParticles();
            animateWindGame(lastTime);
        }

        function openBreakActivity(activity) {
        modalContent.innerHTML = '';

        if (activity === 'bored') {
            modalTitle.textContent = "Here's a Break Idea";
            modalCaption.textContent = "Try this out to give your brain a break. Generate a new one if this one's not great.";

            const ideaText = document.createElement('p');
            ideaText.id = 'break-idea-text';
            ideaText.textContent = 'Loading a break idea...';

            const ideaMeta = document.createElement('p');
            ideaMeta.id = 'break-idea-meta';
            ideaMeta.style.fontSize = '0.9rem';

            const ideaButton = document.createElement('button');
            ideaButton.textContent = 'New idea';
            ideaButton.id = 'break-idea-button';
            ideaButton.style.marginTop = '0.75rem';

            modalContent.appendChild(ideaText);
            modalContent.appendChild(ideaMeta);
            modalContent.appendChild(ideaButton);

            // First fetch
            fetchBreakIdea(ideaText, ideaMeta);

            // Button gets more
            ideaButton.addEventListener('click', () => {
            fetchBreakIdea(ideaText, ideaMeta);
            });

        } else if (activity === 'breathing') {
            modalTitle.textContent = 'Breathing Exercise';
            modalCaption.textContent = 'Follow the circle as it expands and contracts.';

            modalContent.innerHTML = `
            <div class="breathing-container">
                <div id="breathing-circle"></div>
                <p id="breathing-instruction">Breathe in...</p>
            </div>
            `;

            const instructionEl = document.getElementById('breathing-instruction');

            const breathingInterval = setInterval(() => {
                instructionEl.textContent =
                instructionEl.textContent === "Breathe in..."
                    ? "Breathe out..."
                    : "Breathe in...";
            }, 6000);

            modalCloseBtn.addEventListener('click', () => clearInterval(breathingInterval), { once: true });
            modalBackdrop.addEventListener('click', (e) => {
                if (e.target === modalBackdrop) {
                clearInterval(breathingInterval);
                }
            });

        } else if (activity === 'wind-game') {
            modalTitle.textContent = 'Wind Game';
            modalCaption.textContent = 'Use your mouse to push the particles to the left side.';

            modalContent.innerHTML = `
            <div class="wind-game-container">
                <canvas id="windCanvas" width="500" height="300"></canvas>
                <p id="wind-status">Move most particles to the left side!</p>
            </div>
            `;

            initWindGame()

        } else if (activity === 'placeholder3') {
            modalTitle.textContent = 'Mini Game';
            modalCaption.textContent = 'A small game or puzzle to occupy your brain.';
            modalContent.innerHTML = '<p>[Placeholder for a future game]</p>';
        }


        modalBackdrop.classList.add('open');
        }

       // ---API IDEA---

        function fetchBreakIdea(ideaTextEl, ideaMetaEl) {
            ideaTextEl.textContent = 'Loading...';
            ideaMetaEl.textContent = '';

            fetch('https://www.boredapi.com/api/activity')
            .then(response => {
                return response.json();
            })
            .then(data => {
                ideaTextEl.textContent = data.activity;
                ideaMetaEl.textContent = `Type: ${data.type} • Participants: ${data.participants}`;
            })
            .catch(error => {
                console.error('API ERROR:', error);
                ideaTextEl.textContent = 'API ERROR.';
            });
        }



        //closing logic
        modalCloseBtn.addEventListener('click', () => {
        modalBackdrop.classList.remove('open');
        });
        //click outside modal closes too
        modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            modalBackdrop.classList.remove('open');
        }
        });

        


});



    
     /* ===========================
           PANEL SWITCHING LOGIC 
        =========================== */

    document.querySelectorAll("[data-view]").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetView = btn.dataset.view;

            //hide all views
            document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

            //show the selected view
            document.getElementById(targetView).classList.add("active");
        });
});



