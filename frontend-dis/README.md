# Solar Panel Monitoring System - Frontend

This frontend application provides a user-friendly interface for visualizing energy data collected from households with solar panel installations. It displays interactive charts showing daily, weekly, and monthly energy consumption and production values.

## Features

- Real-time data visualization
- Energy consumption and production monitoring
- Temperature and humidity tracking
- Multiple time range views (daily, weekly, monthly)
- House-specific data isolation

## Technology Stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Firebase for data storage

## Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Backend components running (MQTT broker, sensors, and handler)

### Installation

```sh
# Navigate to the frontend directory
cd frontend-dis

# Install dependencies
npm i

# Start the development server
npm run dev
```

### Usage

Once the server is running, access the application at:

```
http://localhost:8080/?house_id=<HOUSE_ID>
```

Where `<HOUSE_ID>` matches the ID used with the MQTT handler.

## System Architecture

This frontend is part of a larger Solar Panel Monitoring System that includes:

1. Raspberry Pi with SenseHAT (or simulation) for temperature and humidity data
2. Real-time C component for wattage meter simulation
3. MQTT handler that bridges sensor data to Firebase
4. This React frontend for data visualization

## Development

### Project Structure

The frontend project follows a structured organization:

- `/src/components/charts/`: Contains all visualization components for energy data
- `/src/firebase/`: Firebase configuration and connection utilities
- `/src/hooks/`: Custom React hooks including `useEnergyData` for fetching from Firebase
- `/src/pages/`: Main application pages
- `/src/types/`: TypeScript type definitions
- `/src/utils/`: Helper functions for chart data processing

### Making Changes

When working on the frontend:

1. Modify chart visualizations in `/src/components/charts/`
2. Update Firebase connection settings in `/src/firebase/config.ts` if needed
3. Extend data fetching logic in `/src/hooks/useEnergyData.tsx`
4. Test with real-time data by running all system components:
   - Mosquitto MQTT broker
   - Solar panel simulator
   - Wattage meter component
   - MQTT handler with the same house ID

### Building for Production

To create a production build:

```sh
npm run build
```

The build artifacts will be stored in the `dist/` directory.
