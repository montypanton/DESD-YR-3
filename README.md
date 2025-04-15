# README.md for everyone 

#### Things to add / do / keep in mind
- main.py file that: (automating the set up process)
	- check dependencies 
	- sets up environment
	- initialises database
	- starts backend and frontend servers 
	- (for this we need subprocess management in Python to run npm/Django commands)
- Docker compatibility needs doing 
- Project currently has a React structure but minimal implementation 
- Test cases
- Ticket system





#### features that need fixing: / looking into 

- adding / changing billing records 
- changing usage statistics 
- changing ml models 
- adding / changing predictions 
- view site button 
- deleting user breaks webpage 






#### Instructions / things to keep in mind:

- keep .env and requirement files separate 
	- frontend/ doesn't have requirement instead it has .json file (same thing)


### Set-up instructions:

1. Clone repository:
```
git clone <repo-url>
cd DESD-YR-3
```

2. Create .env files:
   
   **For backend (create file at `backend/.env`):**
   ```
   SECRET_KEY=2jSD9r2-KTldmeaVwm1QQx7qVyf4sRgJ8o2k7-Y1m6DZW5eoVcNIDJsEDpiPttz3c7g
   DEBUG=True
   DB_NAME=desd_db
   DB_USER=desd_user
   DB_PASSWORD=desd_pass_123
   DB_ROOT_PASSWORD=rootpassword
   DB_HOST=db
   DB_PORT=3306
   ```
   
   **For frontend (create file at `frontend/.env`):**
   ```
   REACT_APP_API_URL=http://localhost:8000/api
   NODE_ENV=development
   CHOKIDAR_USEPOLLING=true
   ```

3. Build and run containers:
   ```
   docker-compose up --build
   ```
   This will:
   - Build the backend Docker image
   - Start the MySQL database service
   - Start the Django backend service
   - Start the React frontend service
   
   You can run in detached mode with:
   ```
   docker-compose up --build -d
   ```

4. Database Setup and Migrations:
   
   The basic migration command is run automatically when starting the containers. However, if you encounter migration errors or need to ensure migrations run in the correct order, use these commands:
   
   ```
   # Run specific migrations in the correct order to resolve dependencies
   docker-compose exec backend python manage.py makemigrations ml_interface
   docker-compose exec backend python manage.py migrate ml_interface
   docker-compose exec backend python manage.py makemigrations claims
   docker-compose exec backend python manage.py migrate
   
   # Create necessary directories for media uploads
   docker-compose exec backend mkdir -p media/ml_models
   docker-compose exec backend mkdir -p media/profile_pictures
   
   # Create a superuser account (write down these credentials)
   docker-compose exec backend python manage.py createsuperuser
   ```

5. Access the application:
   - Backend Admin Panel: [http://localhost:8000/admin](http://localhost:8000/admin)
   - Frontend Application: [http://localhost:3000](http://localhost:3000)

6. Useful commands for development:
   - View container logs:
     ```
     docker-compose logs -f
     ```
   - View logs for a specific service:
     ```
     docker-compose logs -f backend
     docker-compose logs -f frontend
     docker-compose logs -f db
     ```
   - Restart a specific service:
     ```
     docker-compose restart backend
     docker-compose restart frontend
     ```
   - Stop all services:
     ```
     docker-compose down
     ```
   - Stop all services and remove volumes (will delete database data):
     ```
     docker-compose down -v
     ```

7. Troubleshooting:
   - If the database connection fails, ensure the MySQL service is healthy:
     ```
     docker-compose exec db mysqladmin ping -h localhost
     ```
   - To reset the database completely:
     ```
     docker-compose down -v
     docker-compose up --build
     docker-compose exec backend python manage.py migrate
     docker-compose exec backend python manage.py createsuperuser
     ```
   - If frontend dependencies aren't installing correctly, you can manually run:
     ```
     docker-compose exec frontend npm install
     ```

### Currently in backend/: 
	- folders for containing:
	- user management 
	- billings records
	- shared functionalities used across the app 
	- coordinator for all API endpoints 
	- backend/ for main project settings and URL configurations 
	- logs of all application actions 
	- machine learning model handling / management and prediction handling 

		Each folder is a Django 'app' that handles specific functionalities. 
		.Env and requirements.txt files for handling required libraries and 
		database connection. 

		Manage.py file handles Django commands that allows us to run server commands like creating database migrations, apply them and etc... 

### Currently in frontend/:
	- pages: page components organised by feature 
	- sevices: API connection logic 
	- utils + components: reusable elements and functions that are shared 

		Public/ will be filled with React's build process.
		Apps.js handles routing.