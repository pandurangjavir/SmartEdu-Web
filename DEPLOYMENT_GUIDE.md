# SmartEdu Deployment Guide

## 🚀 Vercel Deployment (Frontend)

### Prerequisites
- GitHub repository: `https://github.com/pandurangjavir/SmartEdu-Web.git`
- Vercel account (free tier available)
- Backend deployed separately (Heroku, Railway, or similar)

### Step 1: Deploy Frontend to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with GitHub

2. **Import Project**
   - Click "New Project"
   - Import from GitHub: `pandurangjavir/SmartEdu-Web`
   - Select the repository

3. **Configure Build Settings**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables**
   Add these in Vercel dashboard:
   ```
   NODE_ENV=production
   VITE_API_URL=https://your-backend-url.herokuapp.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your frontend will be available at `https://your-project.vercel.app`

## 🔧 Backend Deployment Options

### Option 1: Heroku (Recommended)

1. **Create Heroku App**
   ```bash
   # Install Heroku CLI
   # Login to Heroku
   heroku login
   
   # Create app
   heroku create smartedu-backend
   ```

2. **Configure Environment Variables**
   ```bash
   heroku config:set SECRET_KEY=your-secret-key
   heroku config:set MYSQL_HOST=your-mysql-host
   heroku config:set MYSQL_USER=your-mysql-user
   heroku config:set MYSQL_PASSWORD=your-mysql-password
   heroku config:set MYSQL_DB=your-database-name
   ```

3. **Deploy**
   ```bash
   # Add Heroku remote
   git remote add heroku https://git.heroku.com/smartedu-backend.git
   
   # Deploy backend only
   git subtree push --prefix=backend heroku main
   ```

### Option 2: Railway

1. **Connect GitHub Repository**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub account
   - Select the repository

2. **Configure Service**
   - Select "Backend" folder
   - Set Python as runtime
   - Add environment variables

3. **Deploy**
   - Railway will automatically deploy
   - Get the generated URL

## 🔗 Connect Frontend to Backend

### Update API Configuration

1. **Update Frontend API URL**
   ```javascript
   // In frontend/src/services/api.js
   const api = axios.create({
     baseURL: process.env.NODE_ENV === 'production' 
       ? 'https://your-backend-url.herokuapp.com' // Replace with actual backend URL
       : 'http://localhost:5000',
     // ... rest of config
   });
   ```

2. **Update Vercel Environment Variables**
   - Go to Vercel dashboard
   - Project Settings → Environment Variables
   - Add: `VITE_API_URL=https://your-backend-url.herokuapp.com`

3. **Redeploy Frontend**
   - Push changes to GitHub
   - Vercel will auto-deploy

## 🗄️ Database Setup

### MySQL Database (Production)

1. **Choose Database Provider**
   - **JawsDB** (Heroku addon)
   - **PlanetScale** (Free tier available)
   - **Railway MySQL**
   - **AWS RDS**

2. **Configure Database**
   ```sql
   -- Create database
   CREATE DATABASE smartedu_production;
   
   -- Create user
   CREATE USER 'smartedu_user'@'%' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON smartedu_production.* TO 'smartedu_user'@'%';
   FLUSH PRIVILEGES;
   ```

3. **Run Migrations**
   ```bash
   # Connect to your backend
   heroku run python init_complete_db.py
   ```

## 🔐 Security Configuration

### Environment Variables (Backend)
```env
SECRET_KEY=your-super-secret-key-here
MYSQL_HOST=your-mysql-host
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DB=your-database-name
FLASK_ENV=production
```

### CORS Configuration
```python
# In backend/app.py
CORS(app, origins=[
    "https://your-frontend.vercel.app",
    "http://localhost:3000"  # For development
])
```

## 📱 Domain Configuration

### Custom Domain (Optional)

1. **Add Domain in Vercel**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records

2. **SSL Certificate**
   - Vercel provides free SSL
   - Automatically configured

## 🚀 Production Checklist

### Frontend
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables set
- [ ] API URL updated
- [ ] Custom domain configured (optional)

### Backend
- [ ] Environment variables configured
- [ ] Database connection working
- [ ] CORS configured for frontend URL
- [ ] SSL certificate installed
- [ ] Health check endpoint working

### Database
- [ ] Production database created
- [ ] User permissions set
- [ ] Data migrated
- [ ] Backup strategy implemented

## 🔍 Testing Deployment

### Frontend Tests
1. Visit your Vercel URL
2. Test login functionality
3. Test all major features
4. Check responsive design

### Backend Tests
1. Test API endpoints
2. Check database connectivity
3. Test chatbot functionality
4. Verify file uploads

### Integration Tests
1. Test frontend-backend communication
2. Test real-time features
3. Test voice functionality
4. Test file processing

## 📊 Monitoring

### Vercel Analytics
- Enable Vercel Analytics
- Monitor performance
- Track user behavior

### Backend Monitoring
- Use Heroku metrics
- Set up error tracking
- Monitor database performance

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check CORS configuration
   - Verify frontend URL in backend

2. **Database Connection Issues**
   - Check environment variables
   - Verify database credentials
   - Check network connectivity

3. **Build Failures**
   - Check Node.js version
   - Verify package.json
   - Check for TypeScript errors

4. **API Errors**
   - Check backend logs
   - Verify endpoint URLs
   - Check authentication

### Support Resources
- Vercel Documentation
- Heroku Documentation
- Flask Documentation
- React Documentation

## 📈 Performance Optimization

### Frontend
- Enable Vercel Edge Functions
- Use CDN for static assets
- Optimize images
- Implement lazy loading

### Backend
- Use connection pooling
- Implement caching
- Optimize database queries
- Use background tasks

---

## 🎉 Deployment Complete!

Your SmartEdu application should now be live and accessible to users worldwide!

**Frontend URL**: `https://your-project.vercel.app`
**Backend URL**: `https://your-backend.herokuapp.com`

Remember to:
- Monitor performance
- Keep dependencies updated
- Regular backups
- Security updates
