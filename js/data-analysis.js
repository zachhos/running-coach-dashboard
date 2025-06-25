class RunningAnalyzer {
    constructor(stravaAuth) {
        this.stravaAuth = stravaAuth;
        this.activities = [];
        this.analysisCache = {};
    }

    async loadRecentActivities() {
        try {
            // Get last 6 weeks of activities for analysis
            const activities = await this.stravaAuth.getActivities(1, 50);
            
            if (!activities) {
                throw new Error('No activities found');
            }

            // Filter to running activities only
            this.activities = activities.filter(activity => 
                activity.type === 'Run' && 
                new Date(activity.start_date) > new Date(Date.now() - 42 * 24 * 60 * 60 * 1000) // Last 6 weeks
            );

            console.log(`Loaded ${this.activities.length} running activities from last 6 weeks`);
            return this.activities;

        } catch (error) {
            console.error('Error loading activities:', error);
            throw error;
        }
    }

    getWeeklyStats() {
        const now = new Date();
        const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
        weekStart.setHours(0, 0, 0, 0);

        const thisWeekActivities = this.activities.filter(activity => 
            new Date(activity.start_date) >= weekStart
        );

        const totalDistance = thisWeekActivities.reduce((sum, activity) => 
            sum + (activity.distance || 0), 0
        );

        const totalTime = thisWeekActivities.reduce((sum, activity) => 
            sum + (activity.moving_time || 0), 0
        );

        const avgPace = totalTime && totalDistance ? 
            this.formatPace(totalTime / (totalDistance / 1609.34)) : null; // Convert to miles

        return {
            miles: (totalDistance / 1609.34).toFixed(1), // Convert meters to miles
            runs: thisWeekActivities.length,
            avgPace: avgPace || '--',
            activities: thisWeekActivities
        };
    }

    getPreviousWeeksStats(weeksBack = 4) {
        const weeks = [];
        const now = new Date();
        
        for (let i = 1; i <= weeksBack; i++) {
            const weekStart = new Date(now.getTime() - ((now.getDay() + (i * 7)) * 24 * 60 * 60 * 1000));
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
            
            const weekActivities = this.activities.filter(activity => {
                const activityDate = new Date(activity.start_date);
                return activityDate >= weekStart && activityDate < weekEnd;
            });

            const totalDistance = weekActivities.reduce((sum, activity) => 
                sum + (activity.distance || 0), 0
            );

            weeks.push({
                weekStart,
                miles: totalDistance / 1609.34,
                runs: weekActivities.length,
                activities: weekActivities
            });
        }
        
        return weeks;
    }

    calculateTrainingLoad() {
        const thisWeek = this.getWeeklyStats();
        const previousWeeks = this.getPreviousWeeksStats(4);
        
        const avgWeeklyMiles = previousWeeks.reduce((sum, week) => sum + week.miles, 0) / previousWeeks.length;
        const currentMiles = parseFloat(thisWeek.miles);
        
        const loadRatio = avgWeeklyMiles > 0 ? currentMiles / avgWeeklyMiles : 1;
        
        let loadStatus = 'Moderate';
        if (loadRatio > 1.3) loadStatus = 'High';
        else if (loadRatio < 0.7) loadStatus = 'Low';
        
        return {
            status: loadStatus,
            ratio: loadRatio,
            currentMiles,
            avgMiles: avgWeeklyMiles.toFixed(1)
        };
    }

    generateRecommendations(mode = 'steady') {
        const trainingLoad = this.calculateTrainingLoad();
        const thisWeek = this.getWeeklyStats();
        const previousWeeks = this.getPreviousWeeksStats(2);
        
        const recommendations = [];
        
        // Analyze recent pattern
        const hasLongRun = thisWeek.activities.some(activity => 
            (activity.distance / 1609.34) > 6 // 6+ mile run
        );
        
        const lastTempoRun = this.getLastTempoRun();
        const daysSinceTempoRun = lastTempoRun ? 
            Math.floor((new Date() - new Date(lastTempoRun.start_date)) / (24 * 60 * 60 * 1000)) : 30;

        // Base recommendations on mode
        if (mode === 'steady') {
            recommendations.push({
                type: 'primary',
                title: 'Steady Week Focus',
                content: 'Maintain consistent mileage with comfortable effort. Focus on building your aerobic base.'
            });

            if (!hasLongRun) {
                recommendations.push({
                    type: 'workout',
                    title: 'Tuesday Long Run',
                    content: `Plan your signature Tuesday long run. Aim for ${this.suggestLongRunDistance()} miles at conversational pace.`
                });
            }

            if (daysSinceTempoRun > 14) {
                recommendations.push({
                    type: 'tempo',
                    title: 'Add Tempo Work',
                    content: 'It\'s been over 2 weeks since your last tempo run. Consider adding 20-30 minutes at comfortably hard effort.'
                });
            }

        } else { // challenge mode
            recommendations.push({
                type: 'primary',
                title: 'Challenge Week',
                content: 'Time to push your limits! Add intensity and consider increasing weekly volume by 10-15%.'
            });

            recommendations.push({
                type: 'workout',
                title: 'Structured Workout',
                content: 'Add intervals or fartlek training. Try 6x3 minutes at 5K pace with 2-minute recoveries.'
            });

            if (daysSinceTempoRun > 7) {
                recommendations.push({
                    type: 'tempo',
                    title: 'Tempo Run Priority',
                    content: 'Include a tempo run this week - 30-40 minutes at comfortably hard pace (marathon to half-marathon effort).'
                });
            }
        }

        // Recovery recommendations
        if (trainingLoad.status === 'High') {
            recommendations.push({
                type: 'recovery',
                title: 'Recovery Focus',
                content: 'Your training load is elevated. Prioritize easy runs and consider adding an extra rest day.'
            });
        }

        return recommendations;
    }

    suggestLongRunDistance() {
        const previousWeeks = this.getPreviousWeeksStats(3);
        const recentLongRuns = [];
        
        previousWeeks.forEach(week => {
            const longRun = week.activities.reduce((longest, activity) => 
                (activity.distance || 0) > (longest.distance || 0) ? activity : longest, {}
            );
            if (longRun.distance) {
                recentLongRuns.push(longRun.distance / 1609.34);
            }
        });

        const avgLongRun = recentLongRuns.length > 0 ? 
            recentLongRuns.reduce((sum, distance) => sum + distance, 0) / recentLongRuns.length : 8;
        
        return Math.max(6, Math.round(avgLongRun * 1.1)); // 10% increase, minimum 6 miles
    }

    getLastTempoRun() {
        // Heuristic: look for runs with sustained pace faster than easy pace
        return this.activities.find(activity => {
            const pace = activity.moving_time / (activity.distance / 1609.34) / 60; // minutes per mile
            return pace > 0 && pace < 9; // Assume tempo runs are under 9 min/mile (adjust for your fitness)
        });
    }

    formatPace(secondsPerMile) {
        const minutes = Math.floor(secondsPerMile / 60);
        const seconds = Math.round(secondsPerMile % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    generatePlannedRuns() {
        const trainingLoad = this.calculateTrainingLoad();
        const recommendations = this.generateRecommendations();
        
        const plannedRuns = [];
        const today = new Date();
        
        // Generate next 7 days
        for (let i = 1; i <= 7; i++) {
            const runDate = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
            const dayName = runDate.toLocaleDateString('en-US', { weekday: 'long' });
            
            if (dayName === 'Tuesday') {
                plannedRuns.push({
                    day: dayName,
                    date: runDate.toLocaleDateString(),
                    type: 'Long Run',
                    description: `${this.suggestLongRunDistance()} miles easy pace`,
                    badge: 'long'
                });
            } else if (Math.random() > 0.4) { // 60% chance of run on other days
                const runType = Math.random() > 0.7 ? 'tempo' : 'easy';
                plannedRuns.push({
                    day: dayName,
                    date: runDate.toLocaleDateString(),
                    type: runType === 'tempo' ? 'Tempo Run' : 'Easy Run',
                    description: runType === 'tempo' ? '4-5 miles with tempo segments' : '3-5 miles conversational pace',
                    badge: runType
                });
            }
        }
        
        return plannedRuns;
    }
}

// Make available globally
window.RunningAnalyzer = RunningAnalyzer;