# Book Creator API

## Overview
The Book Creator API is a backend service designed to manage books and their associated data. This README provides information on how to configure and run the API locally.

## Configuration
To configure the API, follow these steps:

1. Create a `.env` file in the project directory.
2. Specify the following environment variables in the `.env` file:
   - `PORT`: The port on which the API will listen.
   - `MONGO_URI`: The URI for connecting to MongoDB.
   - `SECRET`: A secret key used for generating JWT tokens.
   - `HOST_NAME` (optional): The IP address of the machine running the server if you want to expose the API to an internal network.
3. After configuring the `.env` file, run `npm install` to install the necessary dependencies.

## Available Scripts
In the project directory, you can use the following npm scripts:

### `npm run dev`

Starts the API in development mode. The server will automatically reload if you make edits to the code.

### `npm start`

Starts the API in production mode. The server will not automatically reload once started.
