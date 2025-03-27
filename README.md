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
git clone <repo-url>
2. Create .env files: 
one for backend/
one for frontend/
3. Build and run containers:
docker-compose up --build
4. Run database migrations (only once):
docker-compose exec backend python manage.py migrate 
5. Create superuser (note down details): 
docker-compose exec backend python manage.py createsuperuser

(Note: no need for running start server command, docker does that)

7. Ports for application:
	1. Backend: [http://localhost:8000/admin](http://localhost:8000/admin)
	2. Frontend: [http://localhost:3000](http://localhost:3000)



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