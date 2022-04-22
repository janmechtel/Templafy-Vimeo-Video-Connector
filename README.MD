A Template project for a [Templafy Custom Content Connector API](https://support.templafy.com/hc/en-us/articles/4688349602077)


# Overview

1. Fork the template
1. Run locally
1. Test locally
1. Deploy to Azure 
1. Configure in Templafy Custom Content Connector

# Step 1: Create repository from template
1. Press "Use this template"
1. Clone the repo to your local machine

# Step 2: Run locally

1. `npm install`
2. `npm run watch` 

# Step 3: Test locally

1. To test visit: [localhost:3000/content/?search=templafy](http://localhost:3000/content/?search=templafy)

Alternatively use Postman or similar tools to send the requests and inspect the responses.

# Step 4: Deploy 

* create an Azure App Service
* put the secret
* use the github action to deploy

# Step 5: Configure Templafy 

1. [Enable the Custom Content Connector](https://support.templafy.com/hc/en-us/articles/4688364239645) in the Templafy tenant

Hint: For demo and test purposes the Templafy tenant's Custom Content conector can be configured to work with the local server. Simply use ngrok or similar tools to expose the local server's port 3000 to the internet.
