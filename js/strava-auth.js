// Strava API Configuration
const STRAVA_CONFIG = {
    client_id: '165812', // Keep your Client ID here
    redirect_uri: window.location.origin + window.location.pathname,
    scope: 'read,activity:read'
};

class StravaAuth {
    constructor() {
        this.accessToken = localStorage.getItem('strava_access_token');
        this.athlete = JSON.parse(localStorage.getItem('strava_athlete') || 'null');
        this.init();
    }

    init() {
        // Check if we're returning from Strava OAuth with token
        this.handleTokenFromUrl();
        
        if (this.accessToken) {
            this.showUserInfo();
            window.dashboard.loadDashboard();
        } else {
            this.showConnectButton();
        }
    }

    showConnectButton() {
        document.getElementById('connect-strava').style.display = 'inline-block';
        document.getElementById('connect-strava').onclick = () => this.authenticate();
    }

    authenticate() {
        const authUrl = `https://www.strava.com/oauth/authorize?` +
            `client_id=${STRAVA_CONFIG.client_id}&` +
            `redirect_uri=${encodeURIComponent(STRAVA_CONFIG.redirect_uri)}&` +
            `response_type=token&` + // Using implicit flow - no client secret needed
            `scope=${STRAVA_CONFIG.scope}`;
        
        window.location.href = authUrl;
    }

    handleTokenFromUrl() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        
        if (accessToken) {
            this.accessToken = accessToken;
            localStorage.setItem('strava_access_token', accessToken);
            
            // Get athlete info
            this.getAthleteInfo();
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    async getAthleteInfo() {
        try {
            document.getElementById('loading').style.display = 'block';
            
            const response = await fetch('https://www.strava.com/api/v3/athlete', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                this.athlete = await response.json();
                localStorage.setItem('strava_athlete', JSON.stringify(this.athlete));
                this.showUserInfo();
                window.dashboard.loadDashboard();
            }
        } catch (error) {
            console.error('Error fetching athlete info:', error);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    showUserInfo() {
        if (this.athlete) {
            document.getElementById('athlete-name').textContent = 
                `${this.athlete.firstname} ${this.athlete.lastname}`;
            document.getElementById('athlete-photo').src = this.athlete.profile;
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('connect-strava').style.display = 'none';
        }
    }

    async getActivities(page = 1, perPage = 30) {
        if (!this.accessToken) return null;

        try {
            const response = await fetch(
                `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch activities');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching activities:', error);
            return null;
        }
    }

    logout() {
        localStorage.removeItem('strava_access_token');
        localStorage.removeItem('strava_athlete');
        window.location.reload();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.stravaAuth = new StravaAuth();
});