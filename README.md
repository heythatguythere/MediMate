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


