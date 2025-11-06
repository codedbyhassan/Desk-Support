# Database Setup Guide

This app requires Supabase database tables to be created. Follow these steps to set up your database:

## Quick Setup (2 minutes)

### Step 1: Go to Your Supabase Dashboard
1. Log in to [supabase.com](https://supabase.com)
2. Open your project: **ticketing-asset-app** (URL: https://grsxdhsargbqxvamcstt.supabase.co)

### Step 2: Run the Database Schema
1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste the entire contents of `supabase-schema.sql` from this project
4. Click **Run** (blue button)
5. Wait for completion (you should see "Success" message)

### Step 3: Verify Tables Were Created
1. Go to **Table Editor** in your Supabase dashboard
2. You should see these tables:
   - `users`
   - `tickets`
   - `assets`
   - `asset_history`
3. You should also see a **photos** storage bucket

### Step 4: Refresh Your App
Reload the app in your browser. It should now work without errors!

## What the Schema Creates

- **users**: User profiles linked to Supabase auth
- **tickets**: Support tickets with photos and status tracking
- **assets**: Company assets with assignment tracking
- **asset_history**: Audit trail for asset changes
- **photos**: Storage bucket for ticket and asset photos
- **RLS Policies**: Security rules for data access

## Troubleshooting

### Still Getting "Could not find table 'public.users'" Error?
- Make sure you ran the SQL query successfully (look for green checkmark)
- Try refreshing the page with Cmd+Shift+R (hard refresh)
- Check that your Supabase URL and API Key are correct in `src/lib/supabase.ts`

### SQL Query Failed?
- Check for syntax errors in the schema file
- Make sure you're in the correct Supabase project
- Try running the query in smaller chunks if there are errors

## Next Steps

Once the database is set up:
1. Create an admin account by signing up in the app with role "admin"
2. Create employee accounts with role "employee"
3. Admin can then manage tickets and assets
4. Employees can submit tickets and view their assigned assets
