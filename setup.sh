#!/bin/bash

echo "🚀 Setting up ADRS Platform..."

# Check Node.js version
NODE_VERSION=$(node -v)
if [[ $NODE_VERSION != v18* && $NODE_VERSION != v20* ]]; then
    echo "❌ Node.js 18 or 20 required. Found: $NODE_VERSION"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Copy environment files
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

# Start MongoDB and Redis using Docker
echo "🐳 Starting MongoDB and Redis..."
docker-compose -f ../docker/docker-compose.dev.yml up -d mongodb redis

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 5

# Run database migrations
echo "🗄️  Running database migrations..."
npm run migrate

# Seed database
echo "🌱 Seeding database..."
npm run seed

echo "✅ Setup complete!"
echo ""
echo "To start development servers:"
echo "1. Backend: cd api && npm run dev"
echo "2. Frontend: cd app && npm run dev"
echo ""
echo "Backend will be available at: http://localhost:5000"
echo "Health check: http://localhost:5000/api/health"