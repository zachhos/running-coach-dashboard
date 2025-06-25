class Dashboard {
    constructor() {
        this.analyzer = null;
        this.currentMode = 'steady';
        this.initializeEventListeners();
        this.updateDateDisplay();
    }

    initializeEventListeners() {
        // Mode toggle buttons
        document.getElementById('steady-mode').addEventListener('click', () => {
            this.setMode('steady');
        });
        
        document.getElementById('challenge-mode').addEventListener('click', () => {
            this.setMode('challenge');
        });
    }

    updateDateDisplay() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('current-date').textContent = 
            now.toLocaleDateString('en-US', options);
    }

    async loadDashboard() {
        try {
            document.getElementById('loading').style.display = 'block';
            
            // Initialize analyzer
            this.analyzer = new RunningAnalyzer(window.stravaAuth);
            
            // Load recent activities
            await this.analyzer.loadRecentActivities();
            
            // Update all dashboard sections
            this.updateWeeklyStats();
            this.updateRecommendations();
            this.updatePlannedRuns();
            this.updateRaceCalendar();
            
            // Show dashboard
            document.getElementById('dashboard').style.display = 'block';
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            alert('Error loading your running data. Please try refreshing the page.');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    updateWeeklyStats() {
        const stats = this.analyzer.getWeeklyStats();
        const trainingLoad = this.analyzer.calculateTrainingLoad();
        
        document.getElementById('weekly-miles').textContent = stats.miles;
        document.getElementById('weekly-runs').textContent = stats.runs;
        document.getElementById('avg-pace').textContent = stats.avgPace;
        document.getElementById('training-load').textContent = trainingLoad.status;
    }

    setMode(mode) {
        this.currentMode = mode;
        
        // Update button styles
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${mode}-mode`).classList.add('active');
        
        // Update recommendations
        this.updateRecommendations();
    }

    updateRecommendations() {
        if (!this.analyzer) return;
        
        const recommendations = this.analyzer.generateRecommendations(this.currentMode);
        const container = document.getElementById('recommendations-content');
        
        container.innerHTML = recommendations.map(rec => `
            <div class="recommendation-card">
                <h3>${rec.title}</h3>
                <p>${rec.content}</p>
            </div>
        `).join('');
    }

    updatePlannedRuns() {
        if (!this.analyzer) return;
        
        const plannedRuns = this.analyzer.generatePlannedRuns();
        const container = document.getElementById('planned-runs');
        
        container.innerHTML = plannedRuns.map(run => `
            <div class="run-card">
                <div class="run-details">
                    <h4>${run.day}</h4>
                    <p>${run.description}</p>
                </div>
                <span class="run-badge ${run.badge}">${run.type}</span>
            </div>
        `).join('');
    }

    updateRaceCalendar() {
        // Placeholder Philadelphia races - you can expand this later
        const races = [
            {
                name: "Philadelphia Distance Run",
                date: "September 21, 2025",
                distance: "Half Marathon",
                location: "Center City"
            },
            {
                name: "Broad Street Run",
                date: "May 4, 2025",
                distance: "10 Mile",
                location: "North to South Philly"
            }
        ];
        
        const container = document.getElementById('race-calendar');
        container.innerHTML = races.map(race => `
            <div class="race-card">
                <h4>${race.name}</h4>
                <p>${race.da
