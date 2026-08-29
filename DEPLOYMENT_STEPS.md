# PeerShare Backend Deployment Checklist

This document outlines the manual steps you must complete to ensure the automated CI/CD pipeline can successfully deploy your backend to your AWS EC2 instance.

---

## How GHCR (GitHub Container Registry) is Handled
You do **not** need to manually push your image to GHCR or set up any extra secrets for it! 
- The GitHub Actions pipeline (in `.github/workflows/deploy.yml`) is configured to automatically build and push the image to GHCR every time you push to the `main` branch.
- It uses the built-in `GITHUB_TOKEN` to authenticate, so no manual tokens are required.
- The pipeline will also log your EC2 instance into GHCR automatically using this same token to pull the private image.

*(Note: If the GitHub Action fails with a `403 Forbidden` error when trying to push to GHCR, go to your repository **Settings** -> **Actions** -> **General**, scroll down to **Workflow permissions**, and ensure **Read and write permissions** is selected).*

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
   Paste all your backend environment variables into this file. Most importantly, your Neon DB connection string:
   ```env
   DATABASE_URL="postgresql://username:password@ep-name-123456.us-east-2.aws.neon.tech/dbname?sslmode=require"
   JWT_SECRET="your_jwt_secret"
   # ... add any other necessary environment variables
   ```
   Press `CTRL+X`, then `Y`, then `ENTER` to save and exit.

---

## Step 3: Database Migrations (Neon DB)
Since your database is hosted on Neon DB, we need to ensure the database schema is kept up-to-date.

🎉 **Good News:** I have updated your GitHub Actions pipeline to handle this automatically! 
Every time your container is deployed, the pipeline will execute `npx prisma migrate deploy` inside the container using the database URL from your EC2 `.env` file. You no longer need to worry about doing this manually.

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
