// Mock Strava data for local development
const MOCK_STRAVA_DATA = {
    athlete: {
        firstname: "John",
        lastname: "Runner",
        profile: "https://via.placeholder.com/32x32/667eea/ffffff?text=JR"
    },
    
    // Generate 90 days of running activities
    activities: [
        // Week 1 (most recent) - Moderate week
        {
            id: 1,
            name: "Tuesday Long Run",
            type: "Run",
            start_date: "2025-06-24T06:30:00Z",
            distance: 14481.6, // 9 miles in meters
            moving_time: 4140, // 69 minutes
            total_elevation_gain: 45,
            average_heartrate: 155,
            max_heartrate: 168,
            average_speed: 3.5, // m/s
            suffer_score: 65
        },
        {
            id: 2,
            name: "Easy Recovery",
            type: "Run", 
            start_date: "2025-06-22T07:00:00Z",
            distance: 4828.0, // 3 miles
            moving_time: 1800, // 30 minutes
            total_elevation_gain: 15,
            average_heartrate: 142,
            max_heartrate: 155,
            average_speed: 2.68,
            suffer_score: 25
        },
        {
            id: 3,
            name: "Weekend Run",
            type: "Run",
            start_date: "2025-06-21T08:00:00Z", 
            distance: 8046.7, // 5 miles
            moving_time: 2400, // 40 minutes
            total_elevation_gain: 80,
            average_heartrate: 148,
            max_heartrate: 162,
            average_speed: 3.35,
            suffer_score: 42
        },
        
        // Week 2 - Challenge week with tempo
        {
            id: 4,
            name: "Tempo Tuesday",
            type: "Run",
            start_date: "2025-06-17T06:30:00Z",
            distance: 12874.8, // 8 miles
            moving_time: 3360, // 56 minutes
            total_elevation_gain: 35,
            average_heartrate: 162,
            max_heartrate: 175,
            average_speed: 3.83,
            suffer_score: 78
        },
        {
            id: 5,
            name: "Easy Shake Out",
            type: "Run",
            start_date: "2025-06-15T07:15:00Z",
            distance: 4828.0, // 3 miles
            moving_time: 1920, // 32 minutes
            total_elevation_gain: 12,
            average_heartrate: 138,
            max_heartrate: 150,
            average_speed: 2.51,
            suffer_score: 22
        },
        {
            id: 6,
            name: "Saturday Long",
            type: "Run",
            start_date: "2025-06-14T07:00:00Z",
            distance: 16093.4, // 10 miles
            moving_time: 4680, // 78 minutes
            total_elevation_gain: 120,
            average_heartrate: 152,
            max_heartrate: 165,
            average_speed: 3.44,
            suffer_score: 85
        },
        {
            id: 7,
            name: "Thursday Easy",
            type: "Run",
            start_date: "2025-06-12T18:30:00Z",
            distance: 6437.4, // 4 miles
            moving_time: 2280, // 38 minutes
            total_elevation_gain: 25,
            average_heartrate: 145,
            max_heartrate: 158,
            average_speed: 2.82,
            suffer_score: 35
        },
        
        // Week 3 - Recovery week
        {
            id: 8,
            name: "Easy Tuesday",
            type: "Run",
            start_date: "2025-06-10T06:45:00Z",
            distance: 9656.1, // 6 miles
            moving_time: 3300, // 55 minutes
            total_elevation_gain: 30,
            average_heartrate: 148,
            max_heartrate: 160,
            average_speed: 2.93,
            suffer_score: 45
        },
        {
            id: 9,
            name: "Recovery Jog",
            type: "Run",
            start_date: "2025-06-08T07:30:00Z",
            distance: 3218.7, // 2 miles
            moving_time: 1440, // 24 minutes
            total_elevation_gain: 8,
            average_heartrate: 135,
            max_heartrate: 148,
            average_speed: 2.24,
            suffer_score: 18
        },
        {
            id: 10,
            name: "Weekend Easy",
            type: "Run",
            start_date: "2025-06-07T08:15:00Z",
            distance: 8046.7, // 5 miles
            moving_time: 2700, // 45 minutes
            total_elevation_gain: 40,
            average_heartrate: 142,
            max_heartrate: 155,
            average_speed: 2.98,
            suffer_score: 38
        }
        // Add more activities going back 90 days...
    ]
};

// Generate additional activities for 90 day history
function generateMockActivities() {
    const activities = [...MOCK_STRAVA_DATA.activities];
    const baseDate = new Date('2025-06-24');
    
    // Generate activities for weeks 4-13 (going back 90 days)
    for (let week = 4; week <= 13; week++) {
        const weekStart = new Date(baseDate.getTime() - (week * 7 * 24 * 60 * 60 * 1000));
        
        // Vary weekly patterns - some high, some low, some moderate
        const weekType = week % 3 === 0 ? 'high' : week % 3 === 1 ? 'moderate' : 'low';
        const runsThisWeek = weekType === 'high' ? 4 : weekType === 'moderate' ? 3 : 2;
        
        for (let run = 0; run < runsThisWeek; run++) {
            const runDate = new Date(weekStart.getTime() + (run * 2 * 24 * 60 * 60 * 1000));
            const isLongRun = run === 0;
            const isTempo = weekType === 'high' && run === 1;
            
            let distance, time, hr, elevation, speed, suffer;
            
            if (isLongRun) {
                distance = 12000 + Math.random() * 6000; // 7.5-11 miles
                time = distance / 3.2; // ~7.5 min/mile pace
                hr = 150 + Math.random() * 10;
                elevation = 40 + Math.random() * 80;
                suffer = 60 + Math.random() * 30;
            } else if (isTempo) {
                distance = 8000 + Math.random() * 3000; // 5-7 miles
                time = distance / 3.8; // ~6.5 min/mile pace
                hr = 160 + Math.random() * 12;
                elevation = 20 + Math.random() * 40;
                suffer = 70 + Math.random() * 25;
            } else {
                distance = 3000 + Math.random() * 5000; // 2-5 miles
                time = distance / 2.8; // ~8.5 min/mile pace
                hr = 140 + Math.random() * 15;
                elevation = 10 + Math.random() * 50;
                suffer = 25 + Math.random() * 25;
            }
            
            activities.push({
                id: activities.length + 1,
                name: isLongRun ? "Long Run" : isTempo ? "Tempo Run" : "Easy Run",
                type: "Run",
                start_date: runDate.toISOString(),
                distance: distance,
                moving_time: Math.round(time),
                total_elevation_gain: Math.round(elevation),
                average_heartrate: Math.round(hr),
                max_heartrate: Math.round(hr + 8 + Math.random() * 10),
                average_speed: distance / time,
                suffer_score: Math.round(suffer)
            });
        }
    }
    
    return activities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
}

// Mock Strava Auth for local development
class MockStravaAuth {
    constructor() {
        this.accessToken = 'mock_token';
        this.athlete = MOCK_STRAVA_DATA.athlete;
    }

    async getActivities(page = 1, perPage = 50) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const allActivities = generateMockActivities();
        const startIndex = (page - 1) * perPage;
        return allActivities.slice(startIndex, startIndex + perPage);
    }
}

// Flag to enable mock mode
window.MOCK_MODE = true;