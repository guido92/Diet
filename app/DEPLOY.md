# Deployment Guide: Portainer & Cloudflare Tunnel

This guide explains how to deploy the **Diet App** ("Chef") on your Ubuntu VM using Portainer and expose it via your existing Cloudflare Tunnel on Windows Server.

## Prerequisites

1.  **Ubuntu VM IP**: You need the internal IP address of your Ubuntu VM where Portainer is running (e.g., `192.168.100.20` or similar).
2.  **Portainer Access**: Access to your Portainer instance.
3.  **Windows Server Access**: Access to the `config.yml` file of your Cloudflare Tunnel.

---

## Step 1: Deploy on Portainer

1.  Log in to **Portainer**.
2.  Go to **Stacks** > **Add stack**.
3.  **Name**: `diet-app` (or similar).
4.  Select **Repository**.
5.  **Repository URL**: `https://github.com/guido92/Diet.git`
6.  **Compose path**: `app/docker-compose.prod.yml`
    > **Note**: The file is inside the `app` folder in the repo.
7.  **Environmental variables**:
    *   Click on **Advanced mode** or **Environment variables** button.
    *   Add a new variable:
        *   **Name**: `GOOGLE_API_KEY`
        *   **Value**: `your-google-api-key-here` (copy it from your `.env.local`)
    *   (Optional) You can also set `NODE_ENV` to `production`.
8.  Click **Deploy the stack**.

Wait for the build to complete. It might take a few minutes as it builds the Docker image from source.

**Verification**:
Once deployed, check that the container is running and exposed on port `3000`. You can test it internally via `http://<UBUNTU_VM_IP>:3000`.

---

## Step 2: Configure Cloudflare Tunnel (Windows Server)

1.  Open your **Windows Server**.
2.  Navigate to your Cloudflare Tunnel configuration file:
    `C:\Users\Administrator\.cloudflared\18c6dd38-45f8-406d-acca-4f41d8f02c88.json` (or the `config.yml` if you are using a YAML file as shown in your snippet).
    *Note: Your snippet looked like YAML content, so edit the file that `cloudflared` is actually using.*

3.  Add the new ingress rule for `Chef.gridottihome.it` **BEFORE** the fallback rule (`- service: http_status:404`).

    Replace `<UBUNTU_VM_IP>` with the actual IP address of your Ubuntu VM.

    ```yaml
    ingress:
      # ... existing rules ...
      - hostname: play.latavernadiguido.it
        service: http://localhost:30001
      - hostname: pinko.latavernadiguido.it
        service: http://localhost:30002
      - hostname: damacafe.latavernadiguido.it
        service: http://192.168.100.10:3010

      # [NEW] Rule for Diet App
      - hostname: Chef.gridottihome.it
        service: http://<UBUNTU_VM_IP>:3000

      # Fallback (Must be last)
      - service: http_status:404
    ```

4.  **Save** the file.

5.  **Restart** the Cloudflare Tunnel service to apply changes.
    Open Powershell as Administrator:
    ```powershell
    Restart-Service cloudflared
    # OR if installed with a specific name, check 'Get-Service'
    ```

---

## Step 3: Access the App

Visit **https://Chef.gridottihome.it**.
It should now proxy requests through Cloudflare -> Windows Server Tunnel -> Ubuntu VM (Port 3000).
