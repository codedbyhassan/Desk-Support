# Ticketing & Asset Management System

A modern, full-featured ticketing and asset management application built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

### 🎫 Ticketing System
- **Photo-Required Tickets**: All tickets must include a photo for visual reference
- **Status Tracking**: Open, In Progress, Resolved, Closed
- **Priority Levels**: Low, Medium, High, Urgent
- **Real-time Updates**: Instant notifications when ticket status changes
- **Role-Based Access**: Employees see their tickets, admins see all

### 📦 Asset Management
- **Photo-Required Assets**: All assets must have a photo for identification
- **Assignment Tracking**: Assign assets to employees with history
- **Status Management**: Available, Assigned, Maintenance, Retired
- **Serial Numbers**: Track assets with unique identifiers
- **Asset History**: Complete audit trail of all changes

### 👥 User Management
- **Two Roles**: Admin and Employee
- **Profile Management**: Update name, phone, avatar
- **Secure Authentication**: Powered by Supabase Auth
- **Email/Password Login**: Simple authentication flow

### 📊 Dashboard
- **Real-time Statistics**: Track tickets and assets at a glance
- **Visual Cards**: Color-coded status indicators
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Icons**: Lucide React
- **Routing**: React Router v7
- **Forms**: React Hook Form + Zod
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repo-url>
   cd ticketing-asset-app
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up Supabase**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Update \`src/lib/supabase.ts\` with your credentials

4. **Create database tables**
   - Go to Supabase SQL Editor
   - Run the SQL from \`supabase-schema.sql\`

5. **Start development server**
   \`\`\`bash
   npm run dev
   \`\`\`

## Database Schema

### Users Table
- Extends Supabase auth.users
- Stores role (admin/employee), profile info
- Row Level Security enabled

### Tickets Table
- Stores ticket information with photo
- Links to creator and assigned user
- Status and priority tracking

### Assets Table
- Stores asset details with photo
- Assignment tracking
- Status management

### Asset History Table
- Audit log of all asset changes
- Tracks who made changes and when

## Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Policies**: 
  - Employees can only see their own tickets and assigned assets
  - Admins have full access to manage everything
  - All users can update their own profiles
- **Storage Policies**: 
  - Public read access to photos bucket
  - Authenticated users can upload photos

## Usage

### For Employees

1. **Sign up** with email/password and select "Employee" role
2. **Create tickets** with title, description, priority, and mandatory photo
3. **View assigned assets** in the Assets page
4. **Track ticket status** in real-time
5. **Update profile** with avatar and contact info

### For Admins

1. **Sign up** with email/password and select "Admin" role
2. **View dashboard** with system-wide statistics
3. **Manage all tickets** - update status, assign tickets
4. **Create and assign assets** - add new assets with photos
5. **Track asset history** - see complete audit trail
6. **Manage user assignments** - assign assets to employees

## Photo Requirements

- **Tickets**: Photo required for visual clarity
- **Assets**: Photo required for identification
- **Profiles**: Optional avatar upload
- Supported formats: JPG, PNG, GIF, WebP
- Stored securely in Supabase Storage

## Real-time Features

- Ticket status updates broadcast to all users
- Asset assignments update instantly
- Dashboard statistics refresh automatically
- Powered by Supabase Realtime

## Development

### Scripts

\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run all linters
npm run lint:types   # TypeScript type checking
npm run lint:js      # ESLint
npm run lint:css     # Stylelint
\`\`\`

### Project Structure

\`\`\`
src/
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui components
│   └── Layout.tsx    # Main layout wrapper
├── pages/            # Page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── TicketsPage.tsx
│   ├── AssetsPage.tsx
│   └── ProfilePage.tsx
├── lib/              # Utilities and configs
│   ├── supabase.ts   # Supabase client
│   ├── auth.tsx      # Auth context
│   └── utils.ts      # Helper functions
├── hooks/            # Custom React hooks
└── index.css         # Global styles
\`\`\`

## Deployment

1. Build the project: \`npm run build\`
2. Deploy \`dist/\` folder to your hosting provider
3. Ensure environment variables are set in production
4. Update Supabase Auth URL settings for your domain

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
