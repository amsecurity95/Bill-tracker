# Bill Tracker Backend

NestJS backend API for the Bill Tracker application.

## Structure

```
backend/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── bills/               # Bills module
│   │   ├── bills.controller.ts
│   │   ├── bills.service.ts
│   │   ├── bills.module.ts
│   │   ├── dto/             # Data Transfer Objects
│   │   └── entities/        # TypeORM entities
│   └── reminder/            # Reminder module
│       ├── reminder.service.ts
│       ├── email.service.ts
│       └── reminder.module.ts
├── config/                  # Configuration files
│   └── database.js          # Database configuration
├── middleware/              # Middleware (Express-style)
│   ├── auth.js             # Authentication middleware
│   └── upload.js           # File upload middleware
├── routes/                  # Route definitions (reference)
│   ├── bills.routes.js
│   └── reminder.routes.js
├── Procfile                 # Railway deployment config
├── railway.json            # Railway build/deploy config
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Deployment on Railway

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the `railway.json` configuration
3. Set environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `PORT` - Server port (Railway sets this automatically)
   - `EMAIL_USER` - Gmail address for sending reminders
   - `EMAIL_PASS` - Gmail app password

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3000
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## CORS Configuration

The backend is configured to accept requests from:
- https://billstracker.online (production)
- http://localhost:8080 (local development)
- http://localhost:3000 (local development)
- http://192.168.0.102:8080 (local network)

## API Endpoints

### Bills
- `POST /bills` - Create a new bill
- `GET /bills` - Get all bills
- `GET /bills/:id` - Get a specific bill
- `PATCH /bills/:id` - Update a bill
- `DELETE /bills/:id` - Delete a bill

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod
```

