# RedDevil Highlights - Manchester United Match Tracker

A React web application for Manchester United's 2023/2024 Premier League season. View match details, statistics, and highlights with interactive charts and filtering.

## Features

- **Match Dashboard**: Browse all Manchester United matches with detailed information
- **Interactive Charts**: Goals and results visualizations with toggle controls
- **Advanced Filtering**: Filter by result, venue, goals, and search opponents
- **Match Details**: Comprehensive match information with goal scorers and highlights
- **Responsive Design**: Dark theme with red accents, works on all devices

## Tech Stack

- React 19, Vite
- Chart.js, React-Chartjs-2
- React Router DOM, Framer Motion
- Football API (api-sports.io)

## Quick Start

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd football-api
   npm install
   ```

2. **Set up API key**
   ```bash
   copy .env.example .env
   ```
   Edit `.env` and add your API key from [api-sports.io](https://www.api-sports.io/football-api)

3. **Run development server**
   ```bash
   npm run dev
   ```

## Usage

- **Dashboard**: Browse matches, apply filters, view charts
- **Match Details**: Click any match for comprehensive information
- **Charts**: Toggle between goals and results visualizations
- **Highlights**: Access YouTube highlights for each match

## API Integration

Uses Football API endpoints:
- `/fixtures?team=33&season=2023&league=39` - Manchester United matches
- `/fixtures?id={id}` - Individual match details
- `/fixtures/events?fixture={id}` - Match events

## Project Structure

```
src/
├── components/     # React components
├── data/          # Static data
├── styles/        # CSS files
└── App.jsx        # Main component
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Author

**Harrison Nguyen**

## Demo

![Application Walkthrough](public/highlight.gif)

## License

Apache License, Version 2.0
