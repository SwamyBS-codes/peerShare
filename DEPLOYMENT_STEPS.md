# PeerShare Backend Deployment Checklist

This document outlines the manual steps you must complete to ensure the automated CI/CD pipeline can successfully deploy your backend to your AWS EC2 instance.

---

## Step 1: Add GitHub Secrets
The automated pipeline needs credentials to log into your EC2 instance securely. 

1. Go to your GitHub Repository in your browser.
2. Navigate to **Settings** -> **Secrets and variables** -> **Actions**.
3. Add the following **New repository secrets**:
   - `EC2_HOST`: The Public IP or DNS of your EC2 instance (e.g., `54.12.34.56` or `ec2-54...amazonaws.com`).
   - `EC2_USERNAME`: The SSH user for your EC2 (usually `ubuntu` for Ubuntu AMIs, or `ec2-user` for Amazon Linux).
   - `EC2_SSH_KEY`: The **entire contents** of your private SSH key (`.pem` file) used to access the EC2 instance. (Include the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines).

---

## Step 2: Prepare the AWS EC2 Instance
You must prepare the server environment before the first deployment runs.

1. **SSH into your EC2 instance** from your local terminal:
   ```bash
   ssh -i /path/to/your-key.pem ubuntu@<EC2_HOST>
   ```

2. **Install Docker** (if you haven't already). For Ubuntu:
   ```bash
   sudo apt update
   sudo apt install docker.io -y
   sudo usermod -aG docker ubuntu  # Allow running docker without sudo
   ```
   *(Note: You may need to log out and log back in for the user group changes to take effect).*

3. **Create the Environment File**: 
   The Docker container looks for a `.env` file in the home directory (`~/.env`).
   ```bash
   nano ~/.env
   ```
   Paste all your backend environment variables into this file. Most importantly, your AWS RDS connection string:
   ```env
   DATABASE_URL="postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/dbname"
   JWT_SECRET="your_jwt_secret"
   # ... add any other necessary environment variables
   ```
   Press `CTRL+X`, then `Y`, then `ENTER` to save and exit.

---

## Step 3: Database Migrations (AWS RDS)
Since your database is hosted on AWS RDS and separate from the Docker container, you need to ensure the database schema is up-to-date.

**Whenever you make changes to your Prisma schema:**
You can run migrations from your local machine by temporarily updating your local `.env` with the AWS RDS `DATABASE_URL` and running:
```bash
npx prisma migrate deploy
```
*(Alternatively, you can SSH into the EC2 instance and run `docker exec -it peershare-backend npx prisma migrate deploy` after the container is running).*

---

## Step 4: Trigger the First Deployment!
Once the secrets are in GitHub and the `.env` is on the EC2 instance:

1. Commit and push any changes on your `main` branch to GitHub.
   ```bash
   git add .
   git commit -m "Setup CI/CD deployment pipeline"
   git push origin main
   ```
2. Go to the **Actions** tab in your GitHub repository to watch the pipeline run!
3. Once completed, your backend will be running on your EC2 instance on port `3001`.
