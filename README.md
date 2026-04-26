# MDICare - Medical Device Inventory Management System

A comprehensive web-based application for managing medical device inventory, tracking expiry dates, monitoring low stock levels, and managing supplier information with billing and reporting capabilities.

## Features

- **User Authentication**: Secure login and signup with Google OAuth integration
- **Dashboard**: Real-time overview of inventory status, metrics, and key statistics
- **Inventory Management**: Track medical devices with detailed information and stock levels
- **Expiry Tracking**: Monitor and manage expiring medical devices
- **Low Stock Alerts**: Get notifications for items below minimum stock levels
- **Supplier Management**: Maintain supplier information and contact details
- **Billing System**: Track expenses and manage billing information
- **Reports**: Generate detailed reports on inventory, sales, and trends
- **Activity Logs**: Complete audit trail of all system activities
- **Settings & Profile**: Customize application settings and user profile

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v7
- **State Management**: React Context API
- **Database**: IndexedDB (Local storage)
- **Charts & Visualization**: Recharts
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Animations**: Motion

## Prerequisites

- Node.js 16 or higher
- npm or yarn package manager

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd mdicare.app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by creating a `.env.local` file:
   ```
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## Running the Application

### Development Mode

Start the development server on port 3000:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

Build the application for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Linting

Check for TypeScript errors:

```bash
npm run lint
```

## Project Structure

```
src/
├── components/     # Reusable React components
├── pages/         # Page components for different routes
├── context/       # React Context for state management
├── lib/           # Utility functions and helpers
├── App.tsx        # Main application component
├── main.tsx       # Application entry point
└── index.css      # Global styles
```

## Key Pages

- **Login/Signup**: User authentication pages
- **Dashboard**: Main overview with key metrics
- **Inventory**: Complete inventory management
- **Expiry**: Track expiring medical devices
- **Low Stock**: Monitor low inventory items
- **Suppliers**: Manage supplier relationships
- **Billing**: Handle financial transactions
- **Reports**: View detailed analytics
- **Logs**: Access activity history
- **Settings**: Customize application preferences
- **Profile**: Manage user information

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Notes

- The application uses IndexedDB for client-side data persistence
- Google OAuth is integrated for authentication
- Gemini API integration can be used for AI-powered features
- Responsive design works across all device sizes

---

**Developed with ❤️ by Rohit**
