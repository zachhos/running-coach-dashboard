class AIRunningCoach {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.isLoading = false;
    }

    generateDataSynthesis() {
        // Create a comprehensive report for the AI to analyze
        const stats = this.analyzer.getMultiTimeframeStats();
        const streaks = this.analyzer.getRunningStreaks();
        const paceDistribution = this.analyzer.getPaceDistribution();
        const distanceDistribution = this.analyzer.getDistanceDistribution();
        const consistency = this.analyzer.getConsistencyMetrics();
        const weeklyBreakdown = this.analyzer.getWeeklyBreakdown();
        const effortAnalysis = this.analyzer.getEffortAnalysis();

        return {
            athleteProfile: {
                experienceLevel: this.determineExperienceLevel(stats),
                consistencyLevel: consistency.paceConsistency,
                preferredDistance: distanceDistribution.favoriteDistance,
                currentVolume: stats['30d'].totalMiles + ' miles/month'
            },
            recentPerformance: {
                last7Days: stats['7d'],
                last30Days: stats['30d'],
                streakInfo: streaks,
                paceDistribution: paceDistribution
            },
            trainingPatterns: {
                weeklyBreakdown: weeklyBreakdown.slice(0, 4),
                effortDistribution: effortAnalysis,
                consistencyMetrics: consistency
            },
            currentState: this.assessCurrentState(weeklyBreakdown, stats)
        };
    }

    determineExperienceLevel(stats) {
        const weeklyMiles = parseFloat(stats['30d'].totalMiles) / 4.3;
        if (weeklyMiles > 40) return 'Advanced';
        if (weeklyMiles > 25) return 'Intermediate';
        if (weeklyMiles > 15) return 'Beginner+';
        return 'Beginner';
    }

    assessCurrentState(weeklyBreakdown, stats) {
        const recentWeeks = weeklyBreakdown.slice(0, 3);
        const highIntensityWeeks = recentWeeks.filter(w => w.type === 'high').length;
        const recoveryWeeks = recentWeeks.filter(w => w.type === 'recovery').length;
        
        let state = 'building';
        if (recoveryWeeks >= 2) state = 'recovering';
        if (highIntensityWeeks >= 2) state = 'peaked';
        
        return {
            phase: state,
            fatigue: this.estimateFatigue(recentWeeks),
            readiness: this.estimateReadiness(stats, recentWeeks)
        };
    }

    estimateFatigue(recentWeeks) {
        const avgSufferScore = recentWeeks.reduce((sum, week) => sum + week.sufferScore, 0) / recentWeeks.length;
        if (avgSufferScore > 180) return 'high';
        if (avgSufferScore > 120) return 'moderate';
        return 'low';
    }

    estimateReadiness(stats, recentWeeks) {
        // Simple readiness based on recent volume vs historical
        const currentWeekMiles = parseFloat(recentWeeks[0]?.miles || 0);
        const avgWeekMiles = parseFloat(stats['30d'].totalMiles) / 4.3;
        const ratio = currentWeekMiles / avgWeekMiles;
        
        if (ratio > 1.2) return 'high_load';
        if (ratio < 0.7) return 'well_rested';
        return 'normal';
    }

    generatePrompt(synthesis) {
        return `You are an expert running coach analyzing an athlete's training data. Based on the following comprehensive analysis, provide specific training recommendations for the upcoming week.

ATHLETE PROFILE:
- Experience Level: ${synthesis.athleteProfile.experienceLevel}
- Current Monthly Volume: ${synthesis.athleteProfile.currentVolume}
- Consistency: ${synthesis.athleteProfile.consistencyLevel}
- Preferred Distance: ${synthesis.athleteProfile.preferredDistance}

RECENT PERFORMANCE (Last 30 Days):
- Total Runs: ${synthesis.recentPerformance.last30Days.runs}
- Total Miles: ${synthesis.recentPerformance.last30Days.totalMiles}
- Average Pace: ${synthesis.recentPerformance.last30Days.avgPace}
- Current Streak: ${synthesis.recentPerformance.streakInfo.current} days

TRAINING PATTERNS:
- Recent Weekly Types: ${synthesis.trainingPatterns.weeklyBreakdown.map(w => w.type).join(', ')}
- Runs per Week (30d): ${synthesis.trainingPatterns.consistencyMetrics.runsPerWeek30d}
${synthesis.trainingPatterns.effortDistribution ? `- Effort Distribution: ${synthesis.trainingPatterns.effortDistribution.easy.percentage}% easy, ${synthesis.trainingPatterns.effortDistribution.moderate.percentage}% moderate, ${synthesis.trainingPatterns.effortDistribution.hard.percentage}% hard` : ''}

CURRENT STATE:
- Training Phase: ${synthesis.currentState.phase}
- Estimated Fatigue: ${synthesis.currentState.fatigue}
- Readiness: ${synthesis.currentState.readiness}

Please provide a structured weekly training plan following this format:

WEEKLY TRAINING PLAN:
[Provide 5-7 days of specific training with exact distances, paces, and workout descriptions]

RATIONALE:
[2-3 sentences explaining the reasoning behind this week's plan]

FOCUS POINTS:
[2-3 key areas to emphasize this week]

CAUTIONS:
[Any warnings or things to watch for]

Base your recommendations on established training principles from coaches like Jack Daniels, Hal Higdon, and modern periodization concepts. Consider the athlete's current fitness, recent training load, and appropriate progression.`;
    }

    // Rule-based coaching as fallback (no external AI needed)
    generateRuleBasedRecommendations(synthesis) {
        const recommendations = {
            weekPlan: [],
            rationale: '',
            focusPoints: [],
            cautions: []
        };

        const currentState = synthesis.currentState;
        const recentPerformance = synthesis.recentPerformance;
        const profile = synthesis.athleteProfile;

        // Determine week type based on current state
        let weekType = 'base';
        if (currentState.fatigue === 'high') weekType = 'recovery';
        if (currentState.readiness === 'well_rested' && currentState.fatigue === 'low') weekType = 'build';

        // Generate daily recommendations
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const baseWeeklyMiles = parseFloat(recentPerformance.last30Days.totalMiles) / 4.3;

        days.forEach((day, index) => {
            let dayPlan = this.generateDayPlan(day, index, weekType, baseWeeklyMiles, profile);
            if (dayPlan) recommendations.weekPlan.push(dayPlan);
        });

        // Generate rationale
        recommendations.rationale = this.generateRationale(weekType, currentState, baseWeeklyMiles);
        
        // Generate focus points
        recommendations.focusPoints = this.generateFocusPoints(weekType, synthesis);
        
        // Generate cautions
        recommendations.cautions = this.generateCautions(currentState, synthesis);

        return recommendations;
    }

    generateDayPlan(day, dayIndex, weekType, baseWeeklyMiles, profile) {
        const adjustmentFactor = weekType === 'recovery' ? 0.8 : weekType === 'build' ? 1.1 : 1.0;
        const weeklyTarget = baseWeeklyMiles * adjustmentFactor;

        // Tuesday = Long run day (based on user profile)
        if (day === 'Tuesday') {
            const longRunDistance = Math.max(6, Math.round(weeklyTarget * 0.35));
            return {
                day,
                type: 'Long Run',
                distance: `${longRunDistance} miles`,
                pace: 'Easy/Conversational',
                description: `Signature Tuesday long run at comfortable effort. Focus on time on feet and aerobic development.`,
                duration: `${Math.round(longRunDistance * 9)} minutes estimated`
            };
        }

        // Rest days
        if (day === 'Wednesday' || day === 'Sunday') {
            if (Math.random() > 0.7) { // 30% chance of rest
                return {
                    day,
                    type: 'Rest',
                    description: 'Complete rest or light cross-training (walking, stretching, yoga)'
                };
            }
        }

        // Generate other running days
        if (dayIndex % 2 === 0) { // Every other day roughly
            const isTempoDay = weekType === 'build' && (day === 'Thursday' || day === 'Saturday');
            
            if (isTempoDay) {
                return {
                    day,
                    type: 'Tempo/Workout',
                    distance: '5-6 miles',
                    pace: 'Easy warm-up, 20-30 min tempo, easy cool-down',
                    description: 'Structured workout: 2 mile warm-up, 20-30 minutes at comfortably hard pace (half marathon effort), 1 mile cool-down',
                    duration: '45-55 minutes'
                };
            } else {
                const easyDistance = Math.round(weeklyTarget * 0.15) + Math.floor(Math.random() * 2);
                return {
                    day,
                    type: 'Easy Run',
                    distance: `${Math.max(3, easyDistance)} miles`,
                    pace: 'Easy/Recovery',
                    description: 'Comfortable pace run. Should feel relaxed and sustainable.',
                    duration: `${Math.round(easyDistance * 9.5)} minutes estimated`
                };
            }
        }

        return null; // Rest day
    }

    generateRationale(weekType, currentState, baseWeeklyMiles) {
        const rationales = {
            recovery: `Given your recent training load and ${currentState.fatigue} fatigue levels, this week focuses on active recovery and rebuilding. Reduced volume and intensity will help your body adapt to recent training stress.`,
            build: `Your current readiness suggests you can handle increased training stress. This week includes structured intensity to improve your lactate threshold and running efficiency.`,
            base: `Continuing with aerobic base building at your current volume of ~${Math.round(baseWeeklyMiles)} miles per week. Focus on consistent, comfortable efforts to strengthen your aerobic system.`
        };
        
        return rationales[weekType] || rationales.base;
    }

    generateFocusPoints(weekType, synthesis) {
        const points = {
            recovery: [
                'Prioritize sleep and nutrition for recovery',
                'Keep all runs at truly easy effort',
                'Consider adding gentle stretching or yoga'
            ],
            build: [
                'Execute tempo work at controlled, sustainable effort',
                'Maintain easy pace discipline on easy days',
                'Focus on running form during quality sessions'
            ],
            base: [
                'Build aerobic capacity through consistent easy running',
                'Maintain your Tuesday long run tradition',
                'Gradually progress weekly volume when ready'
            ]
        };

        return points[weekType] || points.base;
    }

    generateCautions(currentState, synthesis) {
        const cautions = [];
        
        if (currentState.fatigue === 'high') {
            cautions.push('Monitor for signs of overreaching - persistent fatigue, elevated resting HR, or declining performance');
        }
        
        if (synthesis.recentPerformance.streakInfo.current > 14) {
            cautions.push('Consider taking a planned rest day to prevent overuse injuries from your current streak');
        }
        
        if (currentState.readiness === 'high_load') {
            cautions.push('Recent training load is elevated - be conservative with intensity this week');
        }

        if (cautions.length === 0) {
            cautions.push('Listen to your body and adjust intensity based on how you feel each day');
        }

        return cautions;
    }

    async generateWeeklyPlan() {
        this.isLoading = true;
        
        try {
            // Generate comprehensive data synthesis
            const synthesis = this.generateDataSynthesis();
            
            // For now, use rule-based recommendations
            // Later, this could call an external AI API
            const recommendations = this.generateRuleBasedRecommendations(synthesis);
            
            return {
                success: true,
                data: recommendations,
                synthesis: synthesis
            };
            
        } catch (error) {
            console.error('Error generating weekly plan:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isLoading = false;
        }
    }

    // Future: External AI API integration
    async generateAIPoweredPlan(synthesis) {
        // This would integrate with OpenAI, Anthropic, or similar
        const prompt = this.generatePrompt(synthesis);
        
        // Example API call (would need API key and endpoint)
        /*
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer YOUR_API_KEY',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000
            })
        });
        */
        
        return { message: 'AI integration coming soon!' };
    }
}

window.AIRunningCoach = AIRunningCoach;
