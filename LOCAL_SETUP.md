# Local Development Setup Guide

## Quick Start (5 Minutes)

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **npm or yarn**

### 1. Install PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Windows
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Set PostgreSQL Password

```bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

### 3. Clone and Setup

```bash
cd inflashield
npm install
```

### 4. Configure Environment

The `.env` file is already configured for local development with these defaults:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inflashield
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/inflashield
```

**Required API Keys** (get from their websites):
- `SOSOVALUE_API_KEY` - [Register](https://sosovalue.com)
- `SODEX_API_KEY` - [Register](https://sodex.com) 
- `EXCHANGERATE_API_KEY` - [Register](https://exchangerate-api.com)

### 5. Start Development

```bash
npm run dev
```

That's it! The database will be automatically created and tables will be set up.

Visit: **http://localhost:3000**

---

## What Happens Automatically

When you run `npm run dev`:

1. ✅ **Database Setup**: Creates `inflashield` database if it doesn't exist
2. ✅ **Schema Creation**: Creates `app` and `audit` schemas
3. ✅ **Tables Creation**: Creates all required tables:
   - `app.users` - User accounts
   - `app.sessions` - User sessions
   - `app.hedge_signals` - Hedge recommendations
   - `app.orders` - Trade orders
   - `app.wallets` - Connected wallets
   - `app.notification_preferences` - User notification settings
   - `audit.audit_log` - Immutable audit trail
4. ✅ **Next.js Dev Server**: Starts at http://localhost:3000

---

## Available Commands

```bash
# Start development server (auto-creates database)
npm run dev

# Manually create/verify database
npm run db:setup

# Push schema changes to database
npm run db:push

# Run migrations
npm run db:migrate

# Open Drizzle Studio (visual database browser)
npm run db:studio

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

---

## Database Management

### View Database

```bash
# Using Drizzle Studio (recommended)
npm run db:studio
# Opens at http://local.drizzle.studio

# Or using psql
psql -U postgres -d inflashield
```

### Common SQL Commands

```sql
-- List all schemas
\dn

-- List tables in app schema
\dt app.*

-- List tables in audit schema  
\dt audit.*

-- View table structure
\d app.users

-- Query users
SELECT * FROM app.users;

-- Check audit logs
SELECT * FROM audit.audit_log LIMIT 10;
```

### Reset Database

```bash
# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS inflashield;"
npm run db:setup
npm run db:push
```

---

## Troubleshooting

### Database Connection Failed

**Error**: `ECONNREFUSED` or `Connection refused`

**Fix**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### Authentication Failed

**Error**: `password authentication failed for user "postgres"`

**Fix**:
```bash
# Set password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Or update DATABASE_URL in .env with your actual password
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/inflashield
```

### Database Already Exists

**Error**: `database "inflashield" already exists`

This is normal! The setup script checks if the database exists and skips creation if it does.

### Missing API Keys

**Error**: Environment variable validation fails

**Fix**: Copy your API keys to `.env` file:
```env
SOSOVALUE_API_KEY=your_key_here
SODEX_API_KEY=your_key_here
EXCHANGERATE_API_KEY=your_key_here
```

### Port 3000 Already in Use

**Fix**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

---

## Project Structure

```
inflashield/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   ├── db/                    # Database
│   │   ├── schema/           # Table definitions
│   │   │   ├── app.ts        # Application tables
│   │   │   └── audit.ts      # Audit log table
│   │   ├── repositories/     # Data access layer
│   │   └── connection.ts     # Database connection
│   ├── lib/                   # Business logic
│   │   ├── engine/           # Hedge & backtest engines
│   │   ├── api/              # External API clients
│   │   └── audit/            # Audit logging
│   ├── config/               # Configuration
│   └── middleware.ts         # Auth middleware
├── scripts/
│   └── setup-db.js           # Database setup script
├── .env                       # Environment variables
├── drizzle.config.ts         # Drizzle ORM config
└── package.json              # Dependencies & scripts
```

---

## Next Steps

1. ✅ Development server running at http://localhost:3000
2. 📚 Read [DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment
3. 🚀 Deploy to Vercel - see [QUICK_DEPLOY.md](docs/QUICK_DEPLOY.md)
4. 🔧 Configure API keys for full functionality

---

## Production Deployment

For deploying to Vercel with Vercel Postgres, see:
- [QUICK_DEPLOY.md](docs/QUICK_DEPLOY.md) - 5-minute Vercel deployment
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Complete deployment guide

**Key Difference**: 
- **Local**: Uses PostgreSQL on your machine (localhost)
- **Production**: Uses Vercel Postgres (managed cloud database)

Vercel automatically provides `DATABASE_URL` when you create a Postgres database in their dashboard. No manual configuration needed!

---

## Support

- **Documentation**: [docs/](docs/)
- **Database Issues**: Check [PostgreSQL logs](https://www.postgresql.org/docs/current/logfile-maintenance.html)
- **Next.js Issues**: [Next.js Documentation](https://nextjs.org/docs)
- **Drizzle ORM**: [Drizzle Docs](https://orm.drizzle.team)
