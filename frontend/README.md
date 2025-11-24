# Room Duty Scheduler - Frontend

A modern React frontend for the Room Duty Scheduler application, built with Vite and Tailwind CSS.

## Features

- **Authentication**: Login and registration with JWT tokens
- **Dashboard**: Overview of expenses and shopping items
- **Schedule**: Monthly duty rotation calendar
- **Expenses**: Track and manage shared expenses
- **Shopping Items**: Collaborative shopping list with voting
- **Day Notes**: Add notes for specific days
- **Stock Items**: Track household stock items
- **Grocery Purchases**: Track grocery purchases with bill scanning (OCR)
- **Admin Panel**: User management and settings (admin only)

## Design

The UI features a clean black and white theme with:
- Black background (#000000)
- White text and accents
- Subtle gray borders and secondary elements
- Modern, minimalist design

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The development server will run on `http://localhost:5173`.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Configuration

The frontend is configured to connect to the backend API at `http://localhost:8000`. You can modify this in `src/utils/api.js` if needed.

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable components
│   ├── contexts/       # React contexts (Auth)
│   ├── pages/         # Page components
│   ├── utils/         # Utility functions (API client)
│   ├── App.jsx        # Main app component
│   ├── main.jsx       # Entry point
│   └── index.css      # Global styles
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Technologies

- **React 18**: UI library
- **React Router**: Routing
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **Axios**: HTTP client
- **date-fns**: Date formatting

