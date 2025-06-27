class SmashRunAnalyzer extends EnhancedRunningAnalyzer {
    
    getRunningStreaks() {
        // Sort activities by date
        const sortedActivities = [...this.activities].sort((a, b) => 
            new Date(a.start_date) - new Date(b.start_date)
        );

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        let lastRunDate = null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        sortedActivities.forEach(activity => {
            const runDate = new Date(activity.start_date);
            runDate.setHours(0, 0, 0, 0);

            if (!lastRunDate) {
                tempStreak = 1;
            } else {
                const daysDiff = (runDate - lastRunDate) / (24 * 60 * 60 * 1000);
                if (daysDiff === 1) {
                    tempStreak++;
                } else if (daysDiff > 1) {
                    longestStreak = Math.max(longestStreak, tempStreak);
                    tempStreak = 1;
                }
            }

            lastRunDate = runDate;
        });

        // Check current streak
        if (lastRunDate) {
            const daysSinceLastRun = (today - lastRunDate) / (24 * 60 * 60 * 1000);
            if (daysSinceLastRun <= 1) {
                currentStreak = tempStreak;
            }
        }

        longestStreak = Math.max(longestStreak, tempStreak);

        return {
            current: currentStreak,
            longest: longestStreak,
            daysSinceLastRun: lastRunDate ? Math.floor((today - lastRunDate) / (24 * 60 * 60 * 1000)) : null
        };
    }

    getPaceDistribution() {
        const activitiesWithPace = this.activities.filter(a => 
            a.moving_time && a.distance && a.distance > 1609.34 // At least 1 mile
        );

        if (activitiesWithPace.length === 0) return null;

        // Calculate pace zones based on user's data
        const paces = activitiesWithPace.map(a => 
            (a.moving_time / 60) / (a.distance / 1609.34) // minutes per mile
        ).sort((a, b) => a - b);

        const median = paces[Math.floor(paces.length / 2)];
        const easyThreshold = median + 1.5; // 1.5 min/mile slower than median
        const hardThreshold = median - 1.0; // 1 min/mile faster than median

        let easyRuns = 0;
        let moderateRuns = 0;
        let hardRuns = 0;

        activitiesWithPace.forEach(activity => {
            const pace = (activity.moving_time / 60) / (activity.distance / 1609.34);
            if (pace >= easyThreshold) easyRuns++;
            else if (pace <= hardThreshold) hardRuns++;
            else moderateRuns++;
        });

        const total = activitiesWithPace.length;
        return {
            easy: { count: easyRuns, percentage: Math.round((easyRuns / total) * 100) },
            moderate: { count: moderateRuns, percentage: Math.round((moderateRuns / total) * 100) },
            hard: { count: hardRuns, percentage: Math.round((hardRuns / total) * 100) },
            medianPace: this.formatPace(median * 60),
            total: total
        };
    }

    getDistanceDistribution() {
        const distances = this.activities.map(a => a.distance / 1609.34); // Convert to miles
        
        let short = 0; // < 4 miles
        let medium = 0; // 4-8 miles
        let long = 0; // > 8 miles

        distances.forEach(distance => {
            if (distance < 4) short++;
            else if (distance <= 8) medium++;
            else long++;
        });

        // Find most frequent distance range
        const distanceRanges = {};
        distances.forEach(distance => {
            const range = Math.floor(distance);
            distanceRanges[range] = (distanceRanges[range] || 0) + 1;
        });

        const favoriteDistance = Object.entries(distanceRanges)
            .sort(([,a], [,b]) => b - a)[0];

        return {
            short: { count: short, percentage: Math.round((short / distances.length) * 100) },
            medium: { count: medium, percentage: Math.round((medium / distances.length) * 100) },
            long: { count: long, percentage: Math.round((long / distances.length) * 100) },
            favoriteDistance: favoriteDistance ? `${favoriteDistance[0]}-${parseInt(favoriteDistance[0]) + 1} miles` : 'N/A',
            averageDistance: (distances.reduce((sum, d) => sum + d, 0) / distances.length).toFixed(1)
        };
    }

    getConsistencyMetrics() {
        const stats30d = this.getStatsForPeriod(30);
        const stats90d = this.getStatsForPeriod(90);
        
        // Calculate runs per week
        const runsPerWeek30d = (stats30d.runs / 4.3).toFixed(1); // 30 days ≈ 4.3 weeks
        const runsPerWeek90d = (stats90d.runs / 12.9).toFixed(1); // 90 days ≈ 12.9 weeks

        // Calculate pace consistency (standard deviation)
        const paces = this.activities
            .filter(a => a.moving_time && a.distance && a.distance > 1609.34)
            .map(a => (a.moving_time / 60) / (a.distance / 1609.34));

        let paceConsistency = 'N/A';
        if (paces.length > 1) {
            const mean = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
            const variance = paces.reduce((sum, pace) => sum + Math.pow(pace - mean, 2), 0) / paces.length;
            const stdDev = Math.sqrt(variance);
            paceConsistency = stdDev < 0.5 ? 'High' : stdDev < 1.0 ? 'Moderate' : 'Low';
        }

        return {
            runsPerWeek30d,
            runsPerWeek90d,
            paceConsistency,
            totalRuns90d: stats90d.runs
        };
    }

    getEffortAnalysis() {
        const activitiesWithHR = this.activities.filter(a => a.average_heartrate);
        
        if (activitiesWithHR.length === 0) return null;

        // Estimate effort zones based on heart rate
        const heartRates = activitiesWithHR.map(a => a.average_heartrate).sort((a, b) => a - b);
        const maxObservedHR = Math.max(...heartRates);
        
        // Rough effort zones (percentage of max observed HR)
        const zone1Threshold = maxObservedHR * 0.7; // Easy
        const zone3Threshold = maxObservedHR * 0.85; // Hard

        let easyEffort = 0;
        let moderateEffort = 0;
        let hardEffort = 0;

        activitiesWithHR.forEach(activity => {
            const hr = activity.average_heartrate;
            if (hr <= zone1Threshold) easyEffort++;
            else if (hr <= zone3Threshold) moderateEffort++;
            else hardEffort++;
        });

        const total = activitiesWithHR.length;
        return {
            easy: { count: easyEffort, percentage: Math.round((easyEffort / total) * 100) },
            moderate: { count: moderateEffort, percentage: Math.round((moderateEffort / total) * 100) },
            hard: { count: hardEffort, percentage: Math.round((hardEffort / total) * 100) },
            averageHR: Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length),
            maxObservedHR: Math.round(maxObservedHR)
        };
    }
}

window.SmashRunAnalyzer = SmashRunAnalyzer;
