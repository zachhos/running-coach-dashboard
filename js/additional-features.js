// Additional SmashRun-inspired features
class AdditionalFeatures extends SmashRunAnalyzer {
    
    getMonthlyTrends() {
        const monthlyData = {};
        
        this.activities.forEach(activity => {
            const date = new Date(activity.start_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    runs: 0,
                    distance: 0,
                    time: 0,
                    elevation: 0
                };
            }
            
            monthlyData[monthKey].runs++;
            monthlyData[monthKey].distance += activity.distance || 0;
            monthlyData[monthKey].time += activity.moving_time || 0;
            monthlyData[monthKey].elevation += activity.total_elevation_gain || 0;
        });

        return Object.entries(monthlyData)
            .map(([month, data]) => ({
                month,
                ...data,
                avgPace: data.time && data.distance ? 
                    this.formatPace((data.time / (data.distance / 1609.34))) : '--'
            }))
            .sort((a, b) => b.month.localeCompare(a.month))
            .slice(0, 6); // Last 6 months
    }

    getBestWorstWeeks() {
        const weeks = this.getWeeklyBreakdown();
        
        const bestWeek = weeks.reduce((best, week) => 
            parseFloat(week.miles) > parseFloat(best.miles) ? week : best, weeks[0]);
        
        const worstWeek = weeks.reduce((worst, week) => 
            parseFloat(week.miles) < parseFloat(worst.miles) ? week : worst, weeks[0]);

        return { bestWeek, worstWeek };
    }

    getPersonalRecords() {
        // Analyze for potential PRs in different distance categories
        const distanceCategories = {
            '5K': { min: 4.5, max: 5.5 },
            '10K': { min: 9.5, max: 10.5 },
            'Half Marathon': { min: 20, max: 22 },
            'Marathon': { min: 40, max: 44 }
        };

        const prs = {};
        
        Object.entries(distanceCategories).forEach(([category, range]) => {
            const categoryRuns = this.activities.filter(activity => {
                const miles = activity.distance / 1609.34;
                return miles >= range.min && miles <= range.max;
            });

            if (categoryRuns.length > 0) {
                const fastestRun = categoryRuns.reduce((fastest, run) => {
                    const pace1 = run.moving_time / (run.distance / 1609.34);
                    const pace2 = fastest.moving_time / (fastest.distance / 1609.34);
                    return pace1 < pace2 ? run : fastest;
                });

                prs[category] = {
                    pace: this.formatPace(fastestRun.moving_time / (fastestRun.distance / 1609.34)),
                    date: new Date(fastestRun.start_date).toLocaleDateString(),
                    distance: (fastestRun.distance / 1609.34).toFixed(2)
                };
            }
        });

        return prs;
    }

    getTrainingLoad7DayAverage() {
        // Calculate rolling 7-day training load
        const last7Days = [];
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
            const dayActivities = this.activities.filter(activity => {
                const activityDate = new Date(activity.start_date);
                return activityDate.toDateString() === date.toDateString();
            });
            
            const dayLoad = dayActivities.reduce((sum, activity) => 
                sum + (activity.suffer_score || 0), 0);
            
            last7Days.push(dayLoad);
        }
        
        const avgLoad = last7Days.reduce((sum, load) => sum + load, 0) / 7;
        
        return {
            average: Math.round(avgLoad),
            trend: last7Days[0] > last7Days[6] ? 'increasing' : 'decreasing',
            dailyLoads: last7Days.reverse()
        };
    }
}

window.AdditionalFeatures = AdditionalFeatures;
