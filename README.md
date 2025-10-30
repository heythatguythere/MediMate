# MediMate - Personal Health Companion

A comprehensive health management platform for elderly patients and their caregivers.

## Features

### For Patients (Elderly Users)
- 💊 **Medication Tracking** - Track medications with AM/PM time picker, checkboxes for marking doses taken
- 📊 **Wellness Logging** - Log daily mood, energy, sleep, and pain levels
- 🎯 **Streak Tracking** - Track consecutive days of wellness logging
- 🔔 **Notifications** - Receive reminders and updates from caretakers
- 🤖 **AI Insights** - Get personalized health insights powered by Groq AI
- 📱 **Emergency Services** - Quick access to emergency contacts

### For Caretakers
- 👥 **Patient Management** - Claim and manage multiple patients
- 💊 **Medication Assignment** - Assign medications with intuitive AM/PM time picker
- 📅 **Appointment Scheduling** - Schedule and track appointments
- 📈 **Health Monitoring** - View patient wellness trends and statistics
- 💬 **Messaging** - Send messages and notifications to patients
- 🎯 **Task Management** - Assign tasks to patients

### For Admins
- 📊 **Dashboard Overview** - View system-wide statistics
- 👤 **User Management** - Manage all users (patients, caretakers)
- 📈 **Activity Monitoring** - Track system activity and usage

## Tech Stack

### Backend
- **Java 17+** with Spring Boot 3.2.5
- **MongoDB** for data persistence
- **Groq AI** for AI-powered insights
- **REST API** architecture

### Frontend
- **HTML5/CSS3/JavaScript** (Web App)
- **JavaFX** (Desktop App - Optional)
- Modern, responsive UI with Tailwind-inspired styling

## Quick Start

### Prerequisites
- Java 17 or higher
- Maven
- MongoDB Atlas account (free tier)
- Groq API key (free at console.groq.com)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/heythatguythere/MediMate.git
   cd MediMate
   ```

2. **Configure environment variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your MongoDB URI and Groq API key
   ```

3. **Run the backend**
   ```bash
   cd backend
   mvnw spring-boot:run
   # Or on Windows:
   .\run-backend.ps1
   ```

4. **Access the application**
   - Web App: http://localhost:8081
   - Landing Page: http://localhost:8081/landing.html
   - Patient Portal: http://localhost:8081/app
   - Caretaker Portal: http://localhost:8081/caretaker
   - Admin Portal: http://localhost:8081/admin

## Deployment

### Deploy to Railway (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click **"New Project"** → **"Deploy from GitHub repo"**
   - Select your `MediMate` repository
   - Click **"New"** → **"Database"** → **"Add MongoDB"**
   - Add environment variables:
     - `MONGODB_URI` - Your MongoDB Atlas connection string
     - `GROQ_API_KEY` - Your Groq API key
     - `PORT` - Will be set automatically by Railway
   - Deploy!

3. **Access your deployed app**
   - Railway will provide a URL like: `https://medimate-production.up.railway.app`

### Environment Variables Required

Set these in your deployment platform:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/medimate
GROQ_API_KEY=gsk_your_api_key_here
PORT=8080  # Set automatically on Railway
```

### MongoDB Atlas Setup

1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Click **"Connect"** → **"Connect your application"**
4. Copy connection string
5. Replace `<username>` and `<password>` with your credentials
6. In Network Access, allow access from anywhere (0.0.0.0/0) for deployment

### Groq AI Setup

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for free account
3. Generate API key
4. Copy and add to environment variables

## User Roles

### Patient (Elderly User)
- Register at `/app?login`
- Access personal health dashboard
- Track medications and wellness
- View notifications and insights

### Caretaker
- Register as "Caregiver" at `/caretaker?login`
- Claim patients using their email
- Assign medications with AM/PM time picker
- Monitor patient health trends
- Send notifications and tasks

### Admin
- Full system access
- User management
- System-wide statistics

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Patient Dashboard
- `GET /api/dashboard/stats` - Get patient statistics
- `GET /api/dashboard/notifications` - Get notifications
- `POST /api/dashboard/notifications/{id}/read` - Mark notification as read
- `DELETE /api/dashboard/notifications/{id}` - Delete notification

### Medications
- `GET /api/doses` - Get patient dose events
- `POST /api/doses/{id}/taken` - Mark dose as taken
- `POST /api/doses/{id}/skip` - Mark dose as skipped

### Caretaker
- `GET /api/caretaker/stats` - Get caretaker statistics
- `GET /api/caretaker/patients` - Get assigned patients
- `POST /api/caretaker/medications/assign` - Assign medication
- `POST /api/caretaker/claim` - Claim a patient

### Wellness
- `POST /api/wellness` - Create wellness log
- `GET /api/wellness` - Get wellness history

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/users` - All users
- `POST /api/admin/generate-doses` - Manually generate doses

## Features Highlights

### AM/PM Time Picker for Medications
- Intuitive time selection with hour (1-12), minutes (0-59), AM/PM
- Add multiple medication times with "+ Add Time" button
- Auto-converts to 24-hour format for backend storage
- Remove unwanted time slots (minimum 1 required)

### Notification System
- Bell icon with unread badge count
- Dropdown with mark as read and delete functionality
- Notifications disappear once marked read
- Real-time updates

### Medication Management
- Color-coded status (PENDING, TAKEN, SKIPPED, MISSED)
- Checkbox UI for marking doses
- Visual feedback with strike-through for completed doses
- Automatic dose generation at midnight

### Wellness Tracking
- Mood, energy, sleep quality, pain levels
- Streak calculation for consecutive logging days
- 7-day mood trend charts
- AI-powered insights based on wellness data

## Project Structure

```
MediMate/
├── backend/
│   ├── src/main/java/com/medimate/
│   │   ├── controller/     # REST API endpoints
│   │   ├── model/          # Data models
│   │   ├── repo/           # MongoDB repositories
│   │   └── service/        # Business logic
│   └── src/main/resources/
│       ├── static/         # Frontend files (HTML/CSS/JS)
│       └── application.properties
├── frontend/               # JavaFX desktop app (optional)
├── .gitignore
└── README.md
```

## Security

- Token-based authentication
- Password hashing
- CORS configuration
- Environment variables for secrets
- No hardcoded credentials

## Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review API endpoints

## Acknowledgments

- Groq AI for AI-powered insights
- MongoDB Atlas for database hosting
- Railway for easy deployment
- Spring Boot community

---

**Made with ❤️ for better health management**
