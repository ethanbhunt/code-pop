# Setup Instructions for CodePop
//testPR
Follow these instructions to set up the CodePop project on your machine.

## Backend Setup

1. **Install Dependencies**
   - Navigate to the base directory of your project and run the following command to create the virtual enviroment for the backend
      ```bash
      python -m venv codepop_virtual_enviroment  
      ``` 
   - This will create a folder in the root directory titled codepop_virtual_enviroment
   - This command activates the virtual enviroment(Note this must be run in either git bash or in a bash shell, i.e. mac terminal):
     ```bash
     #WINDOWS command using git bash
     source codepop_virtual_enviroment/Scripts/activate
     #Mac and Linux version
     source codepop_virtual_enviroment/bin/activate
     ```
    - run the following command once the virtual enviroment has been activated to install dependencies
      ```bash
      python -m pip install -r requirements.txt
      ```
   - Run the following command to confirm you have the proper dependencies installed 
      ```bash
      python -m pip list
      ```
   - your output should look like the following
      ```bash
      Package             Version
      ------------------- -----------
      asgiref             3.8.1
      certifi             2024.8.30
      charset-normalizer  3.4.0
      colorama            0.4.6
      Django              5.1.2
      django-cors-headers 4.4.0
      djangorestframework 3.15.2
      filelock            3.16.1
      fsspec              2024.10.0
      huggingface-hub     0.26.2
      idna                3.10
      Jinja2              3.1.4
      joblib              1.4.2
      MarkupSafe          3.0.2
      mpmath              1.3.0
      networkx            3.4.2
      numpy               2.1.2
      packaging           24.2
      pandas              2.2.3
      pip                 22.2.1
      psycopg2            2.9.9
      python-dateutil     2.9.0.post0
      pytz                2024.2
      PyYAML              6.0.2
      regex               2024.11.6
      requests            2.32.3
      safetensors         0.4.5
      scikit-learn        1.5.2
      scipy               1.14.1
      sentencepiece       0.2.0
      setuptools          63.2.0
      six                 1.16.0
      sqlparse            0.5.1
      stripe              11.2.0
      sympy               1.13.1
      threadpoolctl       3.5.0
      tokenizers          0.20.3
      torch               2.5.1
      tqdm                4.67.0
      transformers        4.46.2
      typing_extensions   4.12.2
      tzdata              2024.2
      urllib3             2.2.3
      ```
    - Virtual Enviroment FAQs

      - to deactivate the virtual enviroment run the following command
        ```bash
        deactivate
        ```
      - if you need to add a package to the virtual enviroment simply use the following command
        ```bash
        python -m pip install <name of package>
        ```
      - then update the requirements.txt file by doing the following (while you are in the root directory of this project)
        ```bash
        python -m pip freeze > requirements.txt
        ```
      - also please update what the expected output for the python -m pip list when you add new packages

      - git ignores the virtual enviroment directory but not the requirements.txt file. This is because the requirements.txt will be used by all developers to ensure proper dependancies are installed. So be sure to push your requirements.txt file when you make changes
2. **Download and Install PostgreSQL**
   - Download PostgreSQL from the following link:
     [PostgreSQL Downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)

   - Refer to the installation guide for PostgreSQL:
     [PostgreSQL Installation Guide](https://www.enterprisedb.com/docs/supported-open-source/postgresql/installing/windows/)

   - **Important:** When installing PostgreSQL, use the following credentials (this will make it easier to pull from the repository):
     - **Username:** `postgres`
     - **Password:** `password`

3. **Sign in to PostgreSQL**
   - After installation, sign in to PostgreSQL as your user by running:
     ```bash
     psql -U postgres
     ```

4. **Create the Database**
   - The first time you run the app, you will need to create the database using the following command (do not change the database name):
     ```sql
     CREATE DATABASE codepop_database;
     ```

5. **Run Migrations, Populate Database and Start the Server**
   - Navigate to the codepop_backend directory that contains the manage.py file
   - Run the following script, this will clean the database and populate it with data to be used 
     ```bash
     ./clean_database.sh
     ```
   - Run the following command to start the server:
     ```bash
     python manage.py runserver <YOUR IP ADDRESS:8000>
     ```
   - **Note:** Each time you run the server, you will need to provide your IP address. This is necessary for the Android emulator to access the backend. you can find your ip address by using the ipconfig command in the terminal

## Frontend Setup

1. **Install Node.js**
   - Download and install Node.js from the official website:
     [Node.js Downloads](https://nodejs.org/en)

2. **Install Android Studio**
   - Download and install Android Studio, then set up a virtual Android device:
     [Android Studio Downloads](https://developer.android.com/studio)

3. **Start the React Native App**
   - Navigate to the `codepop` directory and edit the base URL in `ip_address.js` to match your IP address and port.
   - Install dependancies by running the following command:
      ```bash
      npm install
      ```
   - Run the following command to start the app:
     ```bash
     npm run android
     ```

You should now see a terminal displaying logs from the backend and an Android emulator with the app running!

## After Installation
Once everything has been installed you should be able to run the code using the following commands
- In the backend directory (codepop_backend) run the following:
    ```bash
    python manage.py migrate

    python manage.py runserver <YOUR IP ADDRESS:8000>
    ```
- Start an android emulator in android studio

- In the front end directory (codepop) run the following: 
    ```bash
    npm install

    npm run android
    ```
## Troubleshooting
If you encounter any issues while setting up or running the application, feel free to reach out to Wesley for help!

### Pulling Down Changes To The Backend
The backend database can get into a not so happy state when you pull new changes down from the repo where it doesn't see migrations to be made and as of such won't create needed tables in the database.

This can be solved as follows.

1. Navagate to the codepop_backend directory that contains the manage.py file
2. run the following command 
```bash
./clean_database.sh
```
3. WARNING THIS WILL CLEAR ALL THE DATA OUT OF YOUR DATABASE, if you have data that you don't want to lost don't run this command. 
4. It should also be noted that this will not leave you with a blank database, it will populate it with our basic starting values.
## Running Backend Tests

To run the backend tests for the project, follow these steps:

1. **Navigate to the Backend Directory**

Open your terminal or command prompt and navigate to the `codepop_backend` directory:

```bash
cd codepop_backend
```

2. **Make Migrations**

Before running the tests, you need to ensure that all database migrations are up-to-date. Run the following command:

```bash
python manage.py makemigrations
```

This command will create new migration files based on the changes in your models.

3. **Apply Migrations**

Next, apply the migrations to the database by running:
```bash
python manage.py migrate
```
This command will apply all unapplied migrations to your database, ensuring it's in sync with your models.

4. **Run Tests**

Finally, you can run your tests using the following command:

```bash
python manage.py test
```
This command will discover and run all tests defined in your project. It will provide output indicating which tests passed and which failed.

## Basic Data Populated Into The Database
These are the values that will appear in the database when you run the clean_database.sh file

### Users
| Username | Password | Email               | First Name | Last Name | Role  |
|----------|----------|---------------------|------------|-----------|-----  |
| super    | password | supertest@test.com  | Lemonjello | Smith     |Super  |
| staff    | password | stafftest@test.com  |            |           |manager|
| test     | password | test@test.com       | Orangejello| Smith     |User   |
| test2    | password | test@testing.com    | Bob        | Bobsford  |User   |


### Drinks

| Name                   | Syrups Used                                    | Soda Used  | Add-Ins                 | Price | User Created | Rating |
|------------------------|------------------------------------------------|------------|-------------------------|-------|--------------|--------|
| Coke Float              | Vanilla                                        | Coke       | Cream                   | 5.99  | False        | N/A    |
| Seasonal Depression     | Cinnamon, Chocolate, Pumpkin Spice, Cucumber   | Rootbeer   | Candy Sprinkles          | 4.99  | False        | 0.0    |
| I've Heard It Both Ways | Pineapple, Bubble Gum, Cotton Candy            | Dr. Pepper | Lime Wedge              | 2.50  | False        | N/A    |
| Fall Girlie             | Pumpkin Spice, Salted Caramel                  | Dr. Pepper | Whip, Candy Sprinkles    | 2.50  | False        | N/A    |
| Red Rizz                | Peach, Cranberry                              | Big Red    | Peach Puree             | 2.50  | False        | N/A    |
| #Lemons                 | Huckleberry                                   | Lemonade   | None                    | 2.50  | False        | N/A    |

### Preferences

| User       | Preferences                 |
|------------|-----------------------------|
| user1      | mango, strawberry, mtn. dew |
| user2      | peach, pumpkin_spice, dr. pepper |
| super_user | pear, cherry, cupcake, rootbeer |

### Inventory
The inventory is populated with all of the Syrups, Soda's, add ins and physical items described in the low level design doc

Each one of them has been given a random quatity between 50 and 100 that is currently left in the inventory 

They have also been given a random empty threshold between 1 and 10

This randomization is subject to change as we go further but for testing purposes it's good enough for right now. 

