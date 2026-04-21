# CodePop Requirements Document

## Introduction

### Overview of CodePop

CodePop is an innovative beverage application that leverages advanced technology, including AI and automation, to redefine the customer experience in soda customization and ordering. Designed to function seamlessly across multiple platforms, including handheld devices and desktops, CodePop aims to provide users with a unique and efficient way to create, customize, and order their favorite drinks. The application is geared towards minimal human intervention, utilizing AI and automated systems to manage inventory, process orders, and provide customer support.

### Purpose of Requirements Document

The purpose of this requirements document is to provide a comprehensive outline for the functionality of the CodePop software. This document serves to keep developers and stakeholders on the same page in regards to basic requirements of CodePop going forward. 

### Introduction to MoSCoW Analysis

To effectively prioritize the requirements for this application, we will use MoSCoW analysis. This method categorizes requirements into four groups:

- **Must Have *(M)*:** Essential features needed for the application to function correctly.
- **Should Have *(S)*:** Important but not critical features that enhance user experience.
- **Could Have *(C)*S:** Desirable features that are not essential but could add value to the application.
- **Won’t Have *(W)*:** Features that are not relevant or feasible at this stage.

In this document, these categories will be indicated with the following abbreviations added to each requirement for clarity:
- **M** for Must Have
- **S** for Should Have
- **C** for Could Have
- **W** for Won’t Have

These abbreviations will facilitate a clear and efficient understanding of the priority and scope of each requirement.

## Requirements

### Functional Requirements

**Device Accessibility:**
*(M)* Prioritize functionality for handheld devices, specifically phones. CodePop should function as both an app and a site, and work on both iphone and android. The site will work on the most up to date versions of more popular search browsers, like Google Chrome, Safari, Mozilla Firefox, and Microsoft Edge.

**Ability to Sign Up and Sign In:**
*(M)* A variety of users can sign into the app/website, including Admins, Users, and Managers. Users with an account can save preferences and favorites, managers can see inventory, complaints, and revenue/payments, and admins can have access to user data and accounts (ex. remove problematic accounts or add a manager account). Users can use CodePop without an account, but their information (favorites and preferences) will not get saved.

*(S)* New users signing up will be given a brief tutorial to get them familiar with the CodePop interface and how to use it.

**Ordering and AI Integration:**
There are three different ways to order sodas on CodePop:

- **Manual Creation and Customization:** *(M)* The user will be given a layered interface to choose their soda flavor, how much ice they want (ex. light, medium, heavy), syrup flavor and how many pumps they want in their drink, and the flavor of cream and how much (ex. light, medium, heavy). Items can be excluded, such as if the user does not want any cream in their soda.


- **AI Randomized Soda:** *(M)* An AI will create a soda for the user using a random combination of soda flavor, ice amount, syrup flavor and pumps, and cream. The user can review the drink and, if it does not sound good, they can re-randomize and the AI will create a new drink.

  If the user has an account with CodePop, the user can choose to have the AI randomize based on their preferences: leaving out flavors they do not like and including flavors they do. Users without an account will not get this option, but they will get text in place of the “personalized-randomize” button that says they can get more personalized creations via account creation. General Users can get randomized drinks based on popular flavors as a placeholder.


- **Preset Menu and Seasonal Drinks:** *(C)* If the user wants to order a non-randomized, preset drink, there will be a menu with a variety of drinks the user can pick from. This menu will also include a seasonal section, with different sodas swapping out throughout the year (flavors of in-season fruits and drinks for special events).

- For all options, the user can order multiple sodas, remove, review, and edit sodas in the cart, or cancel before they make a payment.

**Payment:** *(M)*
The user will pay for their soda(s) as soon as they submit their order either on the app or the website. If the cart is empty no transactions will take place. If the user decides to cancel the order, they will get immediately reimbursed. The user should not be able to cancel their order once the drinks have been picked up. To prevent theft, the user is given an order code after payment that they can input into their cooler at the location.  *(C)* There will also be an option to save credit/debit card or payment methods for future use.

**Geolocation and AI:**
*(M)* After submitting and paying for an order, the app will ask for the user’s location. Different options will be available depending on the user’s answer:
  - **Yes:** An AI will track how fast the user is approaching and how much time the order will take to assemble. Using both of these, the AI will determine how close the user needs to be to the CodePop location before the robots begin making the order. If user location is for some reason unavailable, the user will be notified and will only be given the “start” button (see below). If the user does not want the drinks to start creation based on distance, they will have a “start” button to press when they are ready to head to the location. The user will get to know how long their order will take so they can press the “start” option at the right time.

  - **No:** The user will be able to start the order by pushing a button. The user will get to see how long their order should take, that way they can start the order at the right time.

  - Scheduling the drinks to be ready at a certain time is also an option.

**Inventory Tracking and AI:**
*(M)* To prevent a CodePop location from running out of ingredients, an AI will keep track of how popular certain ingredients are (in the CodePop store) and the rate at which they are being used. When an ingredient is estimated to start running low based on current usage trends (in store only), the AI will notify the manager to order more of it.

**AI Usage:**
*(M)* AI is an integral part of the app/website’s functionality and is used in a variety of places:
  - **Randomly Generated Drinks:** When prompted, the AI will create a randomized drink for the user. This can either use the user’s preferences to create the drink or do something completely random. If the user does not like what the AI creates, they can have the AI re-randomize a new drink.

  - **Geolocation and EST:** The AI will use geolocation to keep track of the user. Using a combination of the user’s rate of speed and an estimation of how long the soda order will take to create, the AI determines how close the user needs to be to the CodePop location before the robots start creating their order.

  - **Inventory Tracking:** The AI will keep track of ingredient popularity and the rate at which ingredients are being used (in store). When it predicts an ingredient to start running low, it will notify the manager what ingredients should be ordered and restocked.

### Non-functional Requirements

**Responsive:**
*(M)* Responsive: The application must be responsive, providing an optimal user experience across a variety of devices, including desktops, tablets, and mobile devices, with seamless adaptation to different screen sizes and orientations.

**Error Messages:**
*(M)* The application must provide clear, informative error messages for user interactions, invalid inputs, and system errors. Error messages should be concise, easy to understand, and where applicable, include suggestions for resolution.

**Cross Browser Capability:**
*(S)* The application must be compatible with the latest versions of major browsers, including Chrome, Firefox, Safari, and Edge, ensuring consistent functionality and user experience across all platforms.

**Security:**
*(M)* All sensitive data, including user credentials and payment information, and location data, must be encrypted using industry-standard encryption protocols, such as TLS (Transport Layer Security). Additionally, the application should adhere to best practices for secure coding and data handling to ensure the protection of all user information.

**Scalability:**
*(S)* The application must be designed to scale efficiently, handling an increasing number of user transactions and data volume without performance degradation, ensuring a consistent user experience.

**Availability:**
*(C)* Orders can only be placed when the store is open, but scheduled ordering is supported. The application must maintain an uptime of at least 99.9%, ensuring reliable access for users. While the store is closed, users can schedule orders to be processed once the store reopens.

**Maintainability:**
*(M)* The codebase must be modular, well-documented, and adhere to established coding standards to facilitate ease of maintenance, updates, and troubleshooting. This includes clear comments, structured code, and comprehensive documentation. Additionally, all dependencies, libraries, and frameworks used in the application should be kept up-to-date to ensure security, compatibility, and optimal performance.

**Accessible:**
*(S)* The application must comply with Web Content Accessibility Guidelines (WCAG) 2.1 to ensure that users with disabilities can navigate and use the application effectively. This includes avoiding problematic color combinations, such as red and green, and providing alternative text labels for color-based indicators.

**Reporting:**
*(S)* The system should include features for inventory management. It must automatically notify the manager when items are out of stock and generate detailed reports that can be sent to the developer for further analysis. Additionally, the system should provide the manager with financial reports, offering insights into revenue. This will ensure timely restocking, help in identifying inventory trends or potential issues, and provide a clear understanding of the store's financial performance

### Business Requirements

**As Little Human Input as Possible:**
- The stores and the app should be mostly machine run.
- We want one manager to effectively be able to run many stores.
- Ideally there won’t be a human at most locations, just the robots that make the drinks.

**Payment System:** *(M)*
- The app needs to be able to process payments when an order is placed. 
- Refunds must be able to be processed if the order is canceled before it’s made.
- There should be a system to track revenue for each location.

**Flavor Syrup Tracking System:** *(M)*
- There should be a system to remotely check the levels of the flavor syrups at the location.
- There should be warnings when the syrups get low.
- The manager of the store should get warnings of when to order new syrups.
- There should be analytics where the app learns the use of syrups per location and can give you an estimated amount of syrup you should order for a given month.

**Order pickup tracking system:** *(S)*
- In order to ensure that pickup coolers don’t get full with orders sitting for a long time there needs to be some way to track how long an order has been sitting waiting for pickup.
- After a certain amount of time the old order should be thrown out to make room for new orders.

**Manager Dashboard:** *(M)*
- There should be a simple easy way for the store managers to access information about the store.
- The managers should be able to look at syrup levels at a store.
- The managers should be able to check on the status of the store and ensure that everything is still working from the app.
- The dashboard should display a grid of all the available flavors and their levels with the ability to sort by how much is left in a flavor.
- The dashboard should display a grid of the coolers and their status(full/empty). If the cooler is full it should display a time of how long the order has been sitting in the cooler.
- The dashboard should display a list of orders processed at the store with the focus being on the in progress and future orders but the manager should be able to view past orders as well.
- The dashboard should display overall revenue information for the location.
- The dashboard should display stats of average time between the order being made and picked up and also display stats of how long people are waiting to receive their order.

**AI Help Bot:** *(C)*
- If customers run into issues there should be an AI chatbot to help guide them through their problems.
- This help bot should serve most of our customer service needs. 

**Member Loyalty Program:** *(C)*
- There should be a program where the user builds up points as they purchase drinks. These points can be redeemed for free items once the user has built up enough points.

**Social Media:** *(C)*
- There will be a link to post to social media (i.e. X, Instagram, Facebook) that will allow users to post about their favorite drinks in order to generate free marketing.

### User requirements
**Account creation:** *(M)* 
Users must be able to create an account or log in to the application using a combination of a username, password, and email address. This process includes setting up security measures such as email verification and password strength checks to protect user accounts from unauthorized access.

**Profile management:** *(M)* 
Users should be able to view and edit their profile information after initial sign-up. The profile management system should ensure that updates are reflected in real-time and maintain consistency across all parts of the application, including personalized recommendations and saved preferences.

**Favorite drinks:** *(M)* 
Users should be able to mark and view their favorite drinks. The application should provide an intuitive interface for users to manage their favorites, and ensure that this list is easily accessible for quick reordering and personalized recommendations.

**Edit preferences:** *(S)* 
Users should be able to customize their drink preferences. This feature will allow users to refine their experience based on individual tastes, ensuring that drink suggestions and potential promotional offers are tailored to their specific likes and dislikes.

**First-time user tutorial:** *(S)* 
New users should be guided through a tutorial when they first use the application. The tutorial should not only introduce the basic functionalities but also highlight unique features of the app, ensuring a smooth onboarding experience and helping users get the most out of the application from the start. 

**Choose time for drink to be ready:** *(S)* 
Users should be able to select a specific time for their drink to be ready. This feature aims to provide convenience for those users who do not want to use geolocation functionality by allowing them to plan ahead and ensure their drink is prepared and available precisely when they want it, reducing wait times and improving overall satisfaction.

**Rate drinks:** *(S)* 
Users should be able to rate the drinks they purchase. The rating system should enable users to provide detailed feedback on their experience, which will be used to enhance the quality of the drinks and inform other customers about popular choices and potential improvements.

**Chat functionality with AI support staff:** *(C)* 
Users should be able to chat with an AI-powered support staff for assistance. The AI support staff should be capable of handling a wide range of queries and issues, providing instant help and guidance while learning from reactions to improve its responses over time.

**Loyalty program:** *(C)* 
A loyalty program should be available to reward repeat customers.This program should offer various incentives such as points, discounts, or exclusive offers, fostering customer retention and encouraging continued patronage by recognizing and rewarding frequent visits.

**Social media functionality:** *(C)* 
The application should integrate with social media platforms to enhance user engagement and sharing. Users should be able to seamlessly share their experiences and favorite drinks, as well as interact with the soda shop’s social media presence, creating a sense of community and boosting brand visibility.

### User requirements
**Manager:**
- Has access to data such as stock inventory
- Has access to user payments
- Has access to revenue reports

**Account User:**
- This user has an account they can sign into
- Account keeps track of user data and suggests new drinks based on preferences as well as remembers previous orders
- Essentially has all app functionality

**General User:**
- User can use the app to order drinks on a single time basis without creating an account 
- This user’s data and preferences aren’t saved

**Admin (us):**
- Has access to manage user account data
- Has ability to update account
  - remove/unlock user accounts
- Has the ability to add manager accounts/grant permissions

### MosCow analysis
**Must haves:**
- App that works on a phone
- Geolocation or similar
- Ordering
- Payments (when they order. If they cancel reimburse)
- System orders when ingredients are low
- AI integration for generating drinks
- Log in/signup screen
- Database that keeps track of inventory and updated when inventory is used up – Can see this from the managers side
- Ability to cancel orders (reimbursement)
- Option to favorite drinks

**Should haves:**
- User can add preferences (likes and dislikes)
  - Ai can also add these depending on user drinks – uses them for random generated drinks
- Accessibility
- Login tutorial for first timers
- Seasonal menu
- Ability to choose what time the drink is ready as opposed to making it automatically based on geolocation
- System to throw out old orders if they have sat in a cooler for too long

**Could haves:**
- AI that talks to the customer
- Ai that receives complaints
- Customer could rate a drink and the rating gets stored, AI can use this
- Ability to enable push notifications to notify customers when drinks are ready
  - Also maybe the ability to subscribe to a text list to promote the shop and keep user informed about deals
- Loyalty program
- Social media posts
- SSO - google, etc

**Will not haves:**
- Use of global trends to determine when the manager should restock: AI may not be able to get good/reliable data, and world trends may not affect CodePop stores. Tracking what is happening in-store should provide similar data anyway.
- The ability for multiple users to use the same account to keep better track of individual preferences. 
- Multiple store locations: will keep our focus on 1 location for version 1.
- The ability to get a refund after a drink is made. 
- The ability to upload money into the account: payments only made through an outer source. 
- A gift card system. 
- A cash processing system. 

### Use case stories 
**Account user stories:**
- *(M)* As an account user I want to be able to easily and securely sign in to my account to access my drink history and order drinks 
- *(M)* As an account user, I want to know that my private data such as payment information and geolocation is being protected if I choose to share it. 
- *(S)* As an account user, I want to have drinks recommended to me based on my preferences.
- *(M)* As an account user, I want the app to be visually pleasing.
- *(M)* As an account user I want to be able to see all possible combinations of syrups, sodas, and add-ins so I can craft my drink. 
- *(M)* As an account user, I want to be able to save my favorite drinks so I can order them easily in the future
- *(M)* As an account user, I want to be able to have my drink fresh and ready for me right as I arrive to pick it up. 
- *(S)* As an account user, I want the option to deny access to my geolocation and instead choose a time for my drink to be ready. 
- *(M)* As an account user, I want to receive a notification when my soda is ready to pick up. 
- *(M)* As an account user, I want to be able to add payment options to my account so I can pay through the app when I order my drinks.
- *(M)* As an account user, I want to be refunded if I cancel my drink order. 
- *(C)* As an account user, I want to be able to rate the sodas I have tried out of 5.
- *(C)* As an account user, I want AI to use my drink ratings to recommend  future soda combinations.
- *(M)* As an account user, I want to be able to pay for my drink on the application when I order it.
- *(C)* As an account user, I want to be able to lodge complaints. 
- *(M)* As an account user, I want to be able to add and remove preferences
- *(M)* As an account user, I want to be able to dislike ingredients so they aren’t recommended to me. 
- *(C)* As an account user, I want to be able to share my drinks on social media. 
- *(S)* As an account user, I want access to a seasonal drink menu for inspiration when making my own drinks. 

**General user stories:**
- *(M)* As a general user, I want to be able to order drinks from the soda shop without having an account
- *(M)* As a general user I want to be able to create personalized drinks to order
- *(S)* As a general user, I want to be able to see drink suggestions based on popular drinks so I have ideas to order
- *(M)* As a general user I want to be able to see all possible combinations of syrups, sodas, and add-ins so I can craft my drink.
- *(S)* As a general user, I want to receive a notification when my soda is ready to pick up.
- *(M)* As a general user, I want to be able to receive a refund if I cancel my order. 
- *(S)* As an account user, I want access to a seasonal drink menu for inspiration when making my own drinks. 

**Admin User stories**
- *(M)* As an admin, I want to be able to keep track of inventory.
- *(M)* As an admin, I want to be able to access certain user data such as the number of user accounts.
- *(M)* As an admin, I want to be able to see and keep track of the cost of inventory and maintenance of the shop.
- *(M)* As an admin, I want to be able to see how much money the shop is bringing in.
- *(M)* As an admin, I want to be able to see general and account user complaints.
- *(S)* As an admin, I want to receive all available data in the form of easily understandable and regular reports.
- *(M)* As an admin, I want the ability to manage user accounts. This includes overriding locked accounts, disabling accounts, and deleting user accounts.
- *(M)* As an admin, I want to be able to add permissions to manager accounts.

**Manager User stories**
- *(S)* As a manager, I want to be able to see store revenue reports from the database.
- *(M)* As a manager, I want to be notified when inventory is low. 
- *(S)* As a manager, I want to be able to order more inventory when it is low.
- *(M)* As a manager, I want to be able to see inventory and usage data pertinent to running the store in the form of regular reports.

**General system stories**
- *(M)* As a user, I want all my options to be easily accessible and useful. 
- *(M)* As a user, I want simple and user-friendly options for making soda combinations, rating my sodas, and ordering sodas.
- *(M)* As a user, I want a safe and secure platform that ensures my data, especially my geolocation and email, is protected. 
- *(S)* As a user, I want the platform to be accessible according to WCAG standards of at least an “A”. 
- *(S)* As a user, I want a place I can lodge complaints and get helpful feedback.

**Use Case Diagrams**

![User](misc/UserUseCaseDiagram.png)
![Non Account User](misc/NonAccountUserUseCaseDiagram.png)
![Manager](misc/ManagerUseCaseDiagram.png)
![Admin](misc/AdminUseCaseDiagram.png)
