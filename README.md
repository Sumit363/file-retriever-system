# file-retriever-system
#Node.js (Next.js) web application that’s being packaged and deployed using Docker. App to fetch files using SSH.

# Configuring the application
- Add the .env file with the .env secrets in the main project dir.

```
DATABASE_URL="file:./prisma/dev.db"
SECRET_COOKIE_PASSWORD="secret_text"
```

- Specify the server credentials and application login credentials in the `/lib/config.ts` file.

# Running development server

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


# Running in production

## Option 1 (Use Docker)

- Build Docker:

    `docker build . -t log-file-retriever:latest`

- Start Docker Container:
    
    - Option 1: Run in Network mode Bridge:

        `docker run -v ./db-data:/app/prisma/prisma -p 3000:3000 log-file-retriever:latest`

    - Option 2 (If Bridge mode doesn't work): Run in Network host mode:

        `docker run -v ./db-data:/app/prisma/prisma --network host log-file-retriever:latest`

- Stopping Docker:

    `docker stop $(docker ps -q  --filter ancestor=log-file-retriever:latest)`

## Option 2 (Use docker-compose)

- Build Docker:

    `docker-compose build .`

- Start Docker Continaer:

    `docker-compose up -d`
