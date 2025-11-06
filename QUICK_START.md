# Quick Start Guide

## Prerequisites

Make sure your Supabase database is set up first:
- Follow the steps in `SETUP_DATABASE.md` to create all tables

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

## Testing the App

### Create Admin Account
1. Click "Sign Up"
2. Enter email and password
3. Select role: "Admin"
4. Click "Create Account"

### Access Admin Dashboard
- You'll be taken to the admin dashboard
- View all tickets and assets
- Create, edit, and manage tickets/assets
- Assign tickets to employees

### Create Employee Account
1. Use the Supabase dashboard or app sign-up
2. Select role: "Employee"
3. Employees can:
   - Submit tickets with photos
   - View their assigned assets
   - Update their profile

## Features

### Admin Features
- Dashboard with stats
- Ticket management (create, edit, close)
- Asset management
- User role management
- Real-time status updates

### Employee Features
- Submit support tickets (photo required)
- View assigned assets
- Edit profile
- Real-time notifications

## Database Reset

To start fresh:
1. Go to Supabase dashboard
2. Go to SQL Editor
3. Run: `drop schema public cascade;`
4. Then re-run the schema setup from `SETUP_DATABASE.md`

## Troubleshooting

### Blank Page?
- Check browser console for errors (F12)
- Make sure Supabase tables are created
- Try hard refresh: Cmd+Shift+R

### Can't Sign In?
- Verify email and password are correct
- Check that user was created in Supabase Auth
- Clear browser cookies and try again

### Photos Not Uploading?
- Check browser console for errors
- Make sure "photos" storage bucket exists in Supabase
- Try a different image format (JPG, PNG)

## Need Help?

Check the `README.md` for more details about the project structure and features.
