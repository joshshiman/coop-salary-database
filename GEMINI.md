# Project Overview

This is a Next.js application that provides a salary transparency database for co-op students at WLU. The application allows users to view, search, and filter a list of co-op job placements and their corresponding salaries.

The front-end is built with React and uses Bootstrap for styling. The back-end is a Next.js API route that fetches data from a Supabase database.

# Building and Running

To get the application up and running, follow these steps:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add the following environment variables:
    ```
    NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
    ```
    If you do not have Supabase credentials, the application will use a mock client.

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

4.  **Build for production:**
    ```bash
    npm run build
    ```

5.  **Start the production server:**
    ```bash
    npm run start
    ```

# Development Conventions

*   **Linting:** The project uses Next.js's built-in ESLint configuration. To run the linter, use the following command:
    ```bash
    npm run lint
    ```
*   **Styling:** The project uses Bootstrap for styling, with some custom styles in `styles/globals.css`.
*   **Data Fetching:** Data is fetched from the Supabase database using a Next.js API route. The Supabase client is initialized in `lib/supabaseClient.js`.
