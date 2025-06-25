// Strava API Configuration
const STRAVA_CONFIG = {
    client_id: '165812', // Replace with your actual Client ID
    client_secret: 'eef27693c4c587b1a87f4ca7356580bd595b7519', // Replace with your actual Client Secret
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
        // Check if we're returning from Strava OAuth
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        
        if (authCode && !this.accessToken) {
            this.exchangeCodeForToken(authCode);
        } else if (this.accessToken) {
            this.showUserInfo();
            // Wait for dashboard to be ready, then load it
            this.waitForDashboardAndLoad();
        } else {
            this.showConnectButton();
        }
    }

    waitForDashboardAndLoad() {
        if (window.dashboard && window.dashboard.loadDashboard) {
            window.dashboard.loadDashboard();
        } else {
            // Wait a bit and try again
            setTimeout(() => this.waitForDashboardAndLoad(), 100);
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
            `response_type=code&` +
            `scope=${STRAVA_CONFIG.scope}`;
        
        window.location.href = authUrl;
    }

    async exchangeCodeForToken(code) {
        try {
            document.getElementById('loading').style.display = 'block';
            
            const response = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: STRAVA_CONFIG.client_id,
                    client_secret: STRAVA_CONFIG.client_secret,
                    code: code,
                    grant_type: 'authorization_code'
                })
            });

            const data = await response.json();
            
            if (data.access_token) {
                this.accessToken = data.access_token;
                this.athlete = data.athlete;
                
                // Store in localStorage
                localStorage.setItem('strava_access_token', this.accessToken);
                localStorage.setItem('strava_athlete', JSON.stringify(this.athlete));
                
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                this.showUserInfo();
                // Wait for dashboard to be ready
                this.waitForDashboardAndLoad();
            } else {
                console.error('Token exchange failed:', data);
                alert('Failed to connect to Strava. Please try again.');
            }
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            alert('Error connecting to Strava. Please try again.');
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