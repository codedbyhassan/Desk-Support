#!/bin/bash
# Deploy Push Notifications System
# Run this script to deploy the complete push notification system
# 
# Prerequisites:
# - Supabase CLI installed
# - web-push CLI installed
# - Supabase project ID set in environment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Config
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID:-}"

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║ Push Notifications Deployment Script   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Step 0: Validate prerequisites
echo -e "${YELLOW}[0/6] Checking prerequisites...${NC}"

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Install with: npm install -g supabase${NC}"
    exit 1
fi

if ! command -v web-push &> /dev/null; then
    echo -e "${RED}❌ web-push CLI not found. Install with: npm install -g web-push${NC}"
    exit 1
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
    read -p "Enter your Supabase Project ID: " SUPABASE_PROJECT_ID
fi

echo -e "${GREEN}✅ Prerequisites validated${NC}"
echo ""

# Step 1: Generate VAPID keys
echo -e "${YELLOW}[1/6] Generating VAPID keys...${NC}"
VAPID_OUTPUT=$(web-push generate-vapid-keys)
VAPID_PUBLIC=$(echo "$VAPID_OUTPUT" | grep "Public Key" | cut -d' ' -f3)
VAPID_PRIVATE=$(echo "$VAPID_OUTPUT" | grep "Private Key" | cut -d' ' -f3)

if [ -z "$VAPID_PUBLIC" ] || [ -z "$VAPID_PRIVATE" ]; then
    echo -e "${RED}❌ Failed to generate VAPID keys${NC}"
    exit 1
fi

echo -e "${GREEN}✅ VAPID keys generated${NC}"
echo "   Public Key: $VAPID_PUBLIC"
echo "   Private Key: [saved to env]"
echo ""

# Step 2: Configure Supabase secrets
echo -e "${YELLOW}[2/6] Adding VAPID private key to Supabase secrets...${NC}"
supabase secrets set VAPID_PRIVATE_KEY="$VAPID_PRIVATE" --project-id "$SUPABASE_PROJECT_ID"
echo -e "${GREEN}✅ Secret configured${NC}"
echo ""

# Step 3: Deploy edge function
echo -e "${YELLOW}[3/6] Deploying send-push edge function...${NC}"
supabase functions deploy send-push --project-id "$SUPABASE_PROJECT_ID"
echo -e "${GREEN}✅ Edge function deployed${NC}"
echo ""

# Step 4: Run database migrations
echo -e "${YELLOW}[4/6] Running database migrations...${NC}"
echo "    Please run these steps manually in Supabase SQL Editor:"
echo "    1. Go to Supabase Dashboard → SQL Editor"
echo "    2. Create new query"
echo "    3. Copy contents from: supabase/migrations/push_notification_schema.sql"
echo "    4. Click 'Run'"
echo ""
read -p "Press Enter when migrations are complete..."
echo -e "${GREEN}✅ Migrations applied${NC}"
echo ""

# Step 5: Update frontend environment
echo -e "${YELLOW}[5/6] Updating frontend configuration...${NC}"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC" > .env.local
    echo -e "${GREEN}✅ Created .env.local${NC}"
else
    # Check if VAPID key already exists
    if grep -q "VITE_VAPID_PUBLIC_KEY" .env.local; then
        # Update existing
        sed -i.bak "s/VITE_VAPID_PUBLIC_KEY=.*/VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC/" .env.local
        rm .env.local.bak
        echo -e "${GREEN}✅ Updated .env.local${NC}"
    else
        # Add new line
        echo "VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC" >> .env.local
        echo -e "${GREEN}✅ Added to .env.local${NC}"
    fi
fi
echo ""

# Step 6: Build and test
echo -e "${YELLOW}[6/6] Building application...${NC}"
npm run build
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║ Deployment Complete! ✨               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

echo "📋 Summary:"
echo "  ✅ VAPID keys generated"
echo "  ✅ Private key stored in Supabase secrets"
echo "  ✅ Edge function deployed"
echo "  ✅ Database migrations applied"
echo "  ✅ Frontend configured"
echo "  ✅ Application built"
echo ""

echo "🚀 Next Steps:"
echo "  1. Start dev server: npm run dev"
echo "  2. Open http://localhost:5173"
echo "  3. Go to Settings → Notifications"
echo "  4. Click 'Enable Push Notifications'"
echo "  5. Grant browser permission"
echo "  6. Verify status shows 'Subscribed ✅'"
echo ""

echo "📚 Documentation:"
echo "  • PUSH_NOTIFICATIONS_INTEGRATION.md - Frontend setup"
echo "  • PUSH_NOTIFICATIONS_BACKEND.md - Backend setup"
echo "  • PUSH_NOTIFICATIONS_QUICKSTART.md - Quick reference"
echo ""

echo "⚙️  Configuration:"
echo "  VAPID Public Key: $VAPID_PUBLIC"
echo "  VAPID Private Key: [Stored in Supabase secrets]"
echo "  Project ID: $SUPABASE_PROJECT_ID"
echo ""

echo "📞 Support:"
echo "  Check browser console (F12) for [Push] logs"
echo "  View Service Worker status in DevTools → Application"
echo "  Check Supabase logs for edge function errors"
echo ""
