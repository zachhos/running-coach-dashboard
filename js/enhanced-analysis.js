class EnhancedRunningAnalyzer {
    constructor(stravaAuth) {
        this.stravaAuth = stravaAuth;
        this.activities = [];
    }

    async loadRecentActivities() {
        try {
            const activities = await this.stravaAuth.getActivities(1, 100);
            if (!activities) throw new Error('No activities found');

            this.activities = activities.filter(activity => 
                activity.type === 'Run' && 
                new Date(activity.start_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            );

            console.log(`Loaded ${this.activities.length} running activities from last 90 days`);
            return this.activities;
        } catch (error) {
            console.error('Error loading activities:', error);
            throw error;
        }
    }

    getMultiTimeframeStats() {
        const timeframes = {
            '7d': this.getStatsForPeriod(7),
            '30d': this.getStatsForPeriod(30),
            '90d': this.getStatsForPeriod(90)
        };

        return timeframes;
    }

    getStatsForPeriod(days) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const periodActivities = this.activities.filter(activity => 
            new Date(activity.start_date) >= cutoffDate
        );

        if (periodActivities.length === 0) {
            return this.getEmptyStats();
        }

        const totalDistance = periodActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
        const totalTime = periodActivities.reduce((sum, a) => sum + (a.moving_time || 0), 0);
        const totalElevation = periodActivities.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0);
        
        // Heart rate analysis
        const activitiesWithHR = periodActivities.filter(a => a.average_heartrate);
        const avgHeartRate = activitiesWithHR.length > 0 ? 
            activitiesWithHR.reduce((sum, a) => sum + a.average_heartrate, 0) / activitiesWithHR.length : null;

        // Training load (using suffer score if available)
        const activitiesWithSuffer = periodActivities.filter(a => a.suffer_score);
        const totalSufferScore = activitiesWithSuffer.reduce((sum, a) => sum + a.suffer_score, 0);
        const avgSufferScore = activitiesWithSuffer.length > 0 ? totalSufferScore / activitiesWithSuffer.length : null;

        // Pace analysis
        const avgPaceSeconds = totalTime && totalDistance ? totalTime / (totalDistance / 1609.34) : null;
        
        return {
            runs: periodActivities.length,
            totalMiles: (totalDistance / 1609.34).toFixed(1),
            avgMilesPerRun: periodActivities.length > 0 ? ((totalDistance / 1609.34) / periodActivities.length).toFixed(1) : 0,
            totalTime: totalTime,
            avgPace: avgPaceSeconds ? this.formatPace(avgPaceSeconds) : '--',
            totalElevation: Math.round(totalElevation * 3.28084), // Convert to feet
            avgElevationPerRun: periodActivities.length > 0 ? Math.round((totalElevation * 3.28084) / periodActivities.length) : 0,
            avgHeartRate: avgHeartRate ? Math.round(avgHeartRate) : null,
            avgSufferScore: avgSufferScore ? Math.round(avgSufferScore) : null,
            totalSufferScore: totalSufferScore,
            activities: periodActivities
        };
    }

    getEmptyStats() {
        return {
            runs: 0,
            totalMiles: '0.0',
            avgMilesPerRun: '0.0',
            totalTime: 0,
            avgPace: '--',
            totalElevation: 0,
            avgElevationPerRun: 0,
            avgHeartRate: null,
            avgSufferScore: null,
            totalSufferScore: 0,
            activities: []
        };
    }

    getWeeklyBreakdown() {
        const weeks = [];
        const now = new Date();
        
        // Get last 8 weeks for trend analysis
        for (let i = 0; i < 8; i++) {
            const weekStart = new Date(now.getTime() - ((now.getDay() + (i * 7)) * 24 * 60 * 60 * 1000));
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
            
            const weekActivities = this.activities.filter(activity => {
                const activityDate = new Date(activity.start_date);
                return activityDate >= weekStart && activityDate < weekEnd;
            });

            const weekStats = this.calculateWeekStats(weekActivities);
            const weekType = this.categorizeWeek(weekStats);
            
            weeks.push({
                weekStart: weekStart.toLocaleDateString(),
                weekEnd: weekEnd.toLocaleDateString(),
                ...weekStats,
                type: weekType,
                activities: weekActivities
            });
        }
        
        return weeks.reverse(); // Most recent first
    }

    calculateWeekStats(weekActivities) {
        if (weekActivities.length === 0) {
            return {
                runs: 0,
                miles: 0,
                sufferScore: 0,
                avgHeartRate: null,
                elevation: 0,
                longestRun: 0
            };
        }

        const totalDistance = weekActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
        const totalSuffer = weekActivities.reduce((sum, a) => sum + (a.suffer_score || 0), 0);
        const totalElevation = weekActivities.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0);
        
        const hrActivities = weekActivities.filter(a => a.average_heartrate);
        const avgHeartRate = hrActivities.length > 0 ? 
            hrActivities.reduce((sum, a) => sum + a.average_heartrate, 0) / hrActivities.length : null;

        const longestRun = Math.max(...weekActivities.map(a => a.distance || 0)) / 1609.34;

        return {
            runs: weekActivities.length,
            miles: (totalDistance / 1609.34).toFixed(1),
            sufferScore: totalSuffer,
            avgHeartRate: avgHeartRate ? Math.round(avgHeartRate) : null,
            elevation: Math.round(totalElevation * 3.28084),
            longestRun: longestRun.toFixed(1)
        };
    }

    categorizeWeek(weekStats) {
        // Categorize weeks based on training load
        if (weekStats.runs === 0) return 'rest';
        if (weekStats.sufferScore > 200) return 'high';
        if (weekStats.sufferScore > 100) return 'moderate';
        if (weekStats.runs <= 2 || parseFloat(weekStats.miles) < 10) return 'recovery';
        return 'base';
    }

    formatPace(secondsPerMile) {
        const minutes = Math.floor(secondsPerMile / 60);
        const seconds = Math.round(secondsPerMile % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
}

window.EnhancedRunningAnalyzer = EnhancedRunningAnalyzer;