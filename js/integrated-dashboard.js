class IntegratedDashboard {
    constructor() {
        this.analyzer = null;
        this.coach = null;
        this.updateDateDisplay();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Add event listener for AI coach button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'generate-plan-btn') {
                this.generateAICoachPlan();
            }
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
            
            // Initialize analyzer with real Strava auth
            this.analyzer = new SmashRunAnalyzer(window.stravaAuth);
            this.coach = new AIRunningCoach(this.analyzer);
            
            // Load recent activities
            await this.analyzer.loadRecentActivities();
            
            // Update all sections
            this.updateCoachingIndicators();
            this.updateTrainingLoadAnalysis();
            this.updateVolumeTrends();
            this.updateEffortDistribution();
            this.updateWeeklyPatterns();
            
            // Show dashboard
            document.getElementById('dashboard').style.display = 'block';
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            alert('Error loading your running data. Please try refreshing the page.');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    updateCoachingIndicators() {
        const synthesis = this.coach.generateDataSynthesis();
        const container = document.getElementById('coaching-indicators');
        
        container.innerHTML = `
            <div class="indicator-card">
                <div class="indicator-value status-${this.getStatusColor(synthesis.currentState.fatigue)}">${synthesis.currentState.fatigue.toUpperCase()}</div>
                <div class="indicator-label">Fatigue Level</div>
            </div>
            
            <div class="indicator-card">
                <div class="indicator-value status-${this.getReadinessColor(synthesis.currentState.readiness)}">${this.formatReadiness(synthesis.currentState.readiness)}</div>
                <div class="indicator-label">Training Readiness</div>
            </div>
            
            <div class="indicator-card">
                <div class="indicator-value status-normal">${synthesis.currentState.phase.toUpperCase()}</div>
                <div class="indicator-label">Training Phase</div>
            </div>
            
            <div class="indicator-card">
                <div class="indicator-value status-normal">${synthesis.athleteProfile.experienceLevel}</div>
                <div class="indicator-label">Experience Level</div>
            </div>
            
            <div class="indicator-card">
                <div class="indicator-value status-normal">${synthesis.recentPerformance.streakInfo.current}</div>
                <div class="indicator-label">Current Streak (Days)</div>
            </div>
        `;
    }

    updateTrainingLoadAnalysis() {
        const weeklyBreakdown = this.analyzer.getWeeklyBreakdown();
        const recentWeeks = weeklyBreakdown.slice(0, 4);
        const container = document.getElementById('training-load-analysis');
        
        const loadTrend = this.calculateLoadTrend(recentWeeks);
        
        container.innerHTML = `
            <div class="analysis-card">
                <h3>Weekly Load Progression</h3>
                ${recentWeeks.map((week, index) => `
                    <div class="metric-row">
                        <span class="metric-label">Week ${index + 1} (${week.weekStart})</span>
                        <span class="metric-value">${week.miles} mi • ${week.type} • ${week.sufferScore} effort</span>
                    </div>
                `).join('')}
                <div class="metric-row">
                    <span class="metric-label">Load Trend</span>
                    <span class="metric-value trend-${loadTrend.direction}">${loadTrend.description}</span>
                </div>
            </div>
            
            <div class="analysis-card">
                <h3>Load Distribution</h3>
                <div class="metric-row">
                    <span class="metric-label">High Intensity Weeks</span>
                    <span class="metric-value">${recentWeeks.filter(w => w.type === 'high').length} of 4</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Recovery Weeks</span>
                    <span class="metric-value">${recentWeeks.filter(w => w.type === 'recovery').length} of 4</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Base Building Weeks</span>
                    <span class="metric-value">${recentWeeks.filter(w => w.type === 'base' || w.type === 'moderate').length} of 4</span>
                </div>
            </div>
        `;
    }

    updateVolumeTrends() {
        const consistency = this.analyzer.getConsistencyMetrics();
        const stats = this.analyzer.getMultiTimeframeStats();
        const container = document.getElementById('volume-trends');
        
        const volumeTrend = this.calculateVolumeTrend(stats);
        
        container.innerHTML = `
            <div class="analysis-card">
                <h3>Volume Consistency</h3>
                <div class="metric-row">
                    <span class="metric-label">Runs per Week (30d)</span>
                    <span class="metric-value">${consistency.runsPerWeek30d}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Runs per Week (90d)</span>
                    <span class="metric-value">${consistency.runsPerWeek90d}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Consistency Trend</span>
                    <span class="metric-value trend-${volumeTrend.direction}">${volumeTrend.description}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Pace Consistency</span>
                    <span class="metric-value">${consistency.paceConsistency}</span>
                </div>
            </div>
            
            <div class="analysis-card">
                <h3>Volume Progression</h3>
                <div class="metric-row">
                    <span class="metric-label">7-Day Volume</span>
                    <span class="metric-value">${stats['7d'].totalMiles} miles</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">30-Day Volume</span>
                    <span class="metric-value">${stats['30d'].totalMiles} miles</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Weekly Average (30d)</span>
                    <span class="metric-value">${(parseFloat(stats['30d'].totalMiles) / 4.3).toFixed(1)} miles</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Weekly Average (90d)</span>
                    <span class="metric-value">${(parseFloat(stats['90d'].totalMiles) / 12.9).toFixed(1)} miles</span>
                </div>
            </div>
        `;
    }

    updateEffortDistribution() {
        const paceDistribution = this.analyzer.getPaceDistribution();
        const effortAnalysis = this.analyzer.getEffortAnalysis();
        const container = document.getElementById('effort-distribution');
        
        let html = '';
        
        if (paceDistribution) {
            html += `
                <div class="analysis-card">
                    <h3>Pace-Based Effort Distribution</h3>
                    <div class="pace-bar">
                        <div class="pace-segment easy" style="width: ${paceDistribution.easy.percentage}%"></div>
                        <div class="pace-segment moderate" style="width: ${paceDistribution.moderate.percentage}%"></div>
                        <div class="pace-segment hard" style="width: ${paceDistribution.hard.percentage}%"></div>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Easy Pace Runs</span>
                        <span class="metric-value">${paceDistribution.easy.percentage}% (${paceDistribution.easy.count} runs)</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Moderate Pace</span>
                        <span class="metric-value">${paceDistribution.moderate.percentage}% (${paceDistribution.moderate.count} runs)</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Hard Pace</span>
                        <span class="metric-value">${paceDistribution.hard.percentage}% (${paceDistribution.hard.count} runs)</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Median Pace</span>
                        <span class="metric-value">${paceDistribution.medianPace}</span>
                    </div>
                </div>
            `;
        }
        
        if (effortAnalysis) {
            html += `
                <div class="analysis-card">
                    <h3>Heart Rate-Based Effort</h3>
                    <div class="metric-row">
                        <span class="metric-label">Easy Effort (HR)</span>
                        <span class="metric-value">${effortAnalysis.easy.percentage}% (${effortAnalysis.easy.count} runs)</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Moderate Effort</span>
                        <span class="metric-value">${effortAnalysis.moderate.percentage}% (${effortAnalysis.moderate.count} runs)</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Hard Effort</span>
                        <span class="metric-value">${effortAnalysis.hard.percentage}% (${effortAnalysis.hard.count} runs)</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Average Heart Rate</span>
                        <span class="metric-value">${effortAnalysis.averageHR} bpm</span>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }

    updateWeeklyPatterns() {
        const weeks = this.analyzer.getWeeklyBreakdown();
        const container = document.getElementById('weekly-patterns');
        
        container.innerHTML = `
            <div class="week-card header">
                <div>Week Of</div>
                <div>Miles</div>
                <div>Runs</div>
                <div>Effort Score</div>
                <div>Type</div>
                <div>Long Run</div>
            </div>
            ${weeks.slice(0, 6).map(week => `
                <div class="week-card">
                    <div>${week.weekStart}</div>
                    <div>${week.miles}</div>
                    <div>${week.runs}</div>
                    <div>${week.sufferScore}</div>
                    <div class="week-type ${week.type}">${week.type}</div>
                    <div>${week.longestRun}mi</div>
                </div>
            `).join('')}
        `;
    }

    async generateAICoachPlan() {
        const button = document.getElementById('generate-plan-btn');
        const loading = document.getElementById('ai-loading');
        const planContainer = document.getElementById('weekly-plan');
        
        button.disabled = true;
        loading.style.display = 'block';
        planContainer.style.display = 'none';
        
        try {
            const result = await this.coach.generateWeeklyPlan();
            
            if (result.success) {
                this.displayWeeklyPlan(result.data);
                planContainer.style.display = 'block';
            } else {
                alert('Error generating plan: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating weekly plan');
        } finally {
            button.disabled = false;
            loading.style.display = 'none';
        }
    }

    displayWeeklyPlan(plan) {
        const container = document.getElementById('weekly-plan');
        
        container.innerHTML = `
            <div class="plan-insights">
                <h4>Training Plan Insights</h4>
                
                <div class="insight-section">
                    <h5>Rationale</h5>
                    <p>${plan.rationale}</p>
                </div>
                
                <div class="insight-section">
                    <h5>Focus Points</h5>
                    <ul class="insight-list">
                        ${plan.focusPoints.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="insight-section">
                    <h5>Cautions</h5>
                    <ul class="insight-list">
                        ${plan.cautions.map(caution => `<li>${caution}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <h4>Weekly Training Schedule</h4>
            ${plan.weekPlan.map(day => `
                <div class="plan-day">
                    <h4>${day.day}</h4>
                    <span class="workout-type ${day.type.toLowerCase().replace(/[^a-z]/g, '')}">${day.type}</span>
                    ${day.distance ? `<p><strong>Distance:</strong> ${day.distance}</p>` : ''}
                    ${day.pace ? `<p><strong>Pace:</strong> ${day.pace}</p>` : ''}
                    <p><strong>Description:</strong> ${day.description}</p>
                    ${day.duration ? `<p><strong>Estimated Duration:</strong> ${day.duration}</p>` : ''}
                </div>
            `).join('')}
        `;
    }

    // Helper methods
    getStatusColor(status) {
        const colors = { high: 'high', moderate: 'moderate', low: 'low' };
        return colors[status] || 'normal';
    }

    getReadinessColor(readiness) {
        const colors = { 
            high_load: 'high', 
            well_rested: 'low', 
            normal: 'normal' 
        };
        return colors[readiness] || 'normal';
    }

    formatReadiness(readiness) {
        const formats = {
            high_load: 'HIGH LOAD',
            well_rested: 'WELL RESTED', 
            normal: 'NORMAL'
        };
        return formats[readiness] || readiness.toUpperCase();
    }

    calculateLoadTrend(weeks) {
        if (weeks.length < 2) return { direction: 'stable', description: 'Insufficient data' };
        
        const recent = parseFloat(weeks[0].miles);
        const previous = parseFloat(weeks[1].miles);
        const ratio = recent / previous;
        
        if (ratio > 1.1) return { direction: 'up', description: 'Increasing' };
        if (ratio < 0.9) return { direction: 'down', description: 'Decreasing' };
        return { direction: 'stable', description: 'Stable' };
    }

    calculateVolumeTrend(stats) {
        const weekly7d = parseFloat(stats['7d'].totalMiles);
        const weeklyAvg30d = parseFloat(stats['30d'].totalMiles) / 4.3;
        const ratio = weekly7d / weeklyAvg30d;
        
        if (ratio > 1.15) return { direction: 'up', description: 'Above recent average' };
        if (ratio < 0.85) return { direction: 'down', description: 'Below recent average' };
        return { direction: 'stable', description: 'Consistent with average' };
    }
}

// Initialize dashboard when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new IntegratedDashboard();
});
