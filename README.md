# Elevate Saturday Service - Registration App

A fast, secure, and user-friendly two-path attendance registration app for Elevate Saturday Service, built with SvelteKit, Tailwind CSS, and Supabase.

## Features

- **First-Time User Registration**: Complete registration form with all required demographic information
- **Returning User Check-In**: Fast, real-time search to check in existing attendees
- **Duplicate Prevention**: Prevents duplicate check-ins for the same service date
- **Mobile-First Design**: Responsive UI built with Tailwind CSS
- **Real-Time Search**: Debounced search with instant results

## Tech Stack

- **Frontend**: SvelteKit 5, Svelte 5, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend/Database**: Supabase (PostgreSQL)

## Prerequisites

- Node.js (v18 or higher)
- npm, pnpm, or yarn
- A Supabase account and project

## Setup Instructions

### 1. Install Dependencies

```sh
npm install
```

### 2. Set Up Supabase Database

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase/schema.sql` to create the necessary tables and indexes

### 3. Configure Environment Variables

Create a `.env` file in the root directory (or copy from `.env.example`):

```env
PUBLIC_SUPABASE_URL=https://xuwbkcfmjehzyvjlbnlm.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Replace `your_supabase_anon_key_here` with your actual Supabase anonymous key from your project settings.

### 4. Start Development Server

```sh
npm run dev

# or start with auto-open
npm run dev -- --open
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

## Database Schema

### Tables

- **attendees**: Stores attendee information
  - Required fields: first_name, last_name, contact_number, school_name, barangay, city
  - Optional fields: email, birthday, social_media_name
  - Unique constraint on contact_number

- **attendance_log**: Tracks attendance records
  - Links to attendees via foreign key
  - Unique constraint on (attendee_id, service_date) to prevent duplicate check-ins

## Usage

### First-Time Registration

1. Click on "First-Time Registration" tab
2. Fill in all required fields (marked with *)
3. Optionally fill in email, birthday, and social media name
4. Click "Register & Check In"
5. The attendee will be registered and automatically checked in for today's service

### Returning User Check-In

1. Click on "Returning User Check-In" tab
2. Type at least 2 characters of your name or contact number
3. Select your name from the search results
4. You will be checked in for today's service

## Project Structure

```
src/
├── lib/
│   ├── services/
│   │   └── attendance.ts      # Business logic for registration and check-in
│   ├── types/
│   │   ├── attendance.ts      # TypeScript types for attendance system
│   │   └── database.types.ts  # Supabase database type definitions
│   └── supabase.ts            # Supabase client initialization
└── routes/
    └── +page.svelte           # Main registration page component

supabase/
└── schema.sql                 # Database schema SQL script
```

## Building for Production

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Notes

- Contact numbers must be in Philippine format: `+639xxxxxxxxx`
- The app automatically prevents duplicate check-ins for the same service date
- Search requires at least 2 characters and is case-insensitive
- All timestamps are automatically set by the database

## License

Private project for Elevate Saturday Service.
